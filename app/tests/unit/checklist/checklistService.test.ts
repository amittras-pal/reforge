import { beforeEach, describe, expect, it } from 'vitest'
import {
  activeSessionRepo,
  db,
  exercisesRepo,
  InvariantError,
  metaRepo,
  routinesRepo,
  scheduleRepo,
  sessionLogsRepo,
  type ExerciseInput,
  type RoutineInput,
} from '../../../src/lib/db'
import { ACTIVE_SESSION_ID, type SessionLog } from '../../../src/lib/domain'
import { addDays, todayLocalDate, yesterdayLocalDate } from '../../../src/lib/utils'
import {
  discardSession,
  expireStaleActiveSession,
  fillSetsFromPlan,
  finishSession,
  findDuplicateSessionLogs,
  getScheduledRoutines,
  hasAnyLibraryData,
  sessionProgress,
  startSession,
} from '../../../src/features/checklist/checklistService'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const squatInput: ExerciseInput = {
  name: 'Back Squat',
  category: 'lower',
  type: 'sets_reps',
  defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5, repsMax: 8 },
}

const zone2Input: ExerciseInput = {
  name: 'Zone 2 Cardio',
  category: 'cardio',
  type: 'duration',
  defaultPrescription: { kind: 'duration', durationSec: 1800, intensity: 'Zone 2' },
}

async function seedRoutine(name: string, exerciseId: string): Promise<string> {
  const input: RoutineInput = {
    name,
    items: [
      {
        itemId: crypto.randomUUID(),
        exerciseId,
        order: 0,
        prescription: { kind: 'sets_reps', sets: 3, repsMin: 5, repsMax: 8 },
      },
    ],
  }
  const routine = await routinesRepo.create(input)
  return routine.id
}

describe('getScheduledRoutines (FR-07.1, FR-07.4)', () => {
  it('returns an empty array for a rest day', async () => {
    const routines = await getScheduledRoutines(1)
    expect(routines).toEqual([])
  })

  it('returns routines in schedule order, including archived ones (FR-06.16)', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineAId = await seedRoutine('Routine A', squat.id)
    const routineBId = await seedRoutine('Routine B', squat.id)
    await routinesRepo.archive(routineBId)
    await scheduleRepo.setDay(1, [routineBId, routineAId])

    const routines = await getScheduledRoutines(1)
    expect(routines.map((r) => r.name)).toEqual(['Routine B', 'Routine A'])
    expect(routines[0]?.isArchived).toBe(true)
  })
})

describe('hasAnyLibraryData (FR-07.19)', () => {
  it('is false when either exercises or routines are missing', async () => {
    expect(await hasAnyLibraryData()).toBe(false)
    await exercisesRepo.create(squatInput)
    expect(await hasAnyLibraryData()).toBe(false)
  })

  it('is true once at least one exercise and one routine exist', async () => {
    const squat = await exercisesRepo.create(squatInput)
    await seedRoutine('Routine A', squat.id)
    expect(await hasAnyLibraryData()).toBe(true)
  })
})

describe('startSession (FR-07.6, FR-07.17, FR-07.20)', () => {
  it('creates an active session snapshotting exercise name/type/prescription, with setResults pre-populated for sets_reps', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)

    const session = await startSession({ date: todayLocalDate(), routineIds: [routineId] })

    expect(session.routineId).toBe(routineId)
    expect(session.routineNameSnapshot).toBe('Routine A')
    expect(session.items).toHaveLength(1)
    expect(session.items[0]?.nameSnapshot).toBe('Back Squat')
    expect(session.items[0]?.type).toBe('sets_reps')
    expect(session.items[0]?.setResults).toEqual([
      { setNo: 1, done: false },
      { setNo: 2, done: false },
      { setNo: 3, done: false },
    ])
    expect(session.items[0]?.completed).toBe(false)
  })

  it('leaves setResults undefined for duration items', async () => {
    const zone2 = await exercisesRepo.create(zone2Input)
    const routine = await routinesRepo.create({
      name: 'Cardio',
      items: [
        {
          itemId: crypto.randomUUID(),
          exerciseId: zone2.id,
          order: 0,
          prescription: { kind: 'duration', durationSec: 1800 },
        },
      ],
    })

    const session = await startSession({ date: todayLocalDate(), routineIds: [routine.id] })
    expect(session.items[0]?.setResults).toBeUndefined()
    expect(session.items[0]?.actualDurationSec).toBeUndefined()
  })

  it('combines multiple routines into one flat, ordered item list with a joined name', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineAId = await seedRoutine('Lower Body A', squat.id)
    const routineBId = await seedRoutine('PFMT', squat.id)

    const session = await startSession({
      date: todayLocalDate(),
      routineIds: [routineAId, routineBId],
    })

    expect(session.routineNameSnapshot).toBe('Lower Body A + PFMT')
    expect(session.routineId).toBe(routineAId)
    expect(session.items).toHaveLength(2)
  })

  it('sets meta.activeSessionId when starting', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    await startSession({ date: todayLocalDate(), routineIds: [routineId] })
    expect(await metaRepo.get('activeSessionId')).toBe(ACTIVE_SESSION_ID)
  })

  it('throws InvariantError if a session is already active', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    await startSession({ date: todayLocalDate(), routineIds: [routineId] })

    await expect(startSession({ date: todayLocalDate(), routineIds: [routineId] })).rejects.toThrow(
      InvariantError,
    )
  })

  it('rejects dates other than today/yesterday', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    const twoDaysAgo = addDays(todayLocalDate(), -2)

    await expect(
      startSession({ date: twoDaysAgo, routineIds: [routineId] }),
    ).rejects.toThrow(InvariantError)
  })

  it('accepts yesterday as a valid date', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    const session = await startSession({
      date: yesterdayLocalDate(),
      routineIds: [routineId],
    })
    expect(session.date).toBe(yesterdayLocalDate())
  })
})

describe('finishSession (FR-07.14, FR-07.15)', () => {
  it('writes a completed sessionLog when every item is completed or skipped, and clears the draft', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    await startSession({ date: todayLocalDate(), routineIds: [routineId] })
    const active = await activeSessionRepo.getCurrent()
    await activeSessionRepo.patch({
      items: active!.items.map((item) => ({ ...item, completed: true })),
    })

    const log = await finishSession({ rpe: 7, notes: 'Felt good' })

    expect(log.status).toBe('completed')
    expect(log.rpe).toBe(7)
    expect(log.notes).toBe('Felt good')
    expect(await activeSessionRepo.getCurrent()).toBeUndefined()
    expect(await metaRepo.get('activeSessionId')).toBeNull()
  })

  it('writes a partial sessionLog when some items are neither completed nor skipped', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    await startSession({ date: todayLocalDate(), routineIds: [routineId] })

    const log = await finishSession()
    expect(log.status).toBe('partial')
  })

  it('treats skipped items as satisfying completion for status purposes', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    await startSession({ date: todayLocalDate(), routineIds: [routineId] })
    const active = await activeSessionRepo.getCurrent()
    await activeSessionRepo.patch({
      items: active!.items.map((item) => ({ ...item, skipped: true })),
    })

    const log = await finishSession()
    expect(log.status).toBe('completed')
  })

  it('throws InvariantError when there is no active session', async () => {
    await expect(finishSession()).rejects.toThrow(InvariantError)
  })
})

describe('discardSession (FR-07.16)', () => {
  it('clears the active session and meta without writing a log', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    await startSession({ date: todayLocalDate(), routineIds: [routineId] })

    await discardSession()

    expect(await activeSessionRepo.getCurrent()).toBeUndefined()
    expect(await metaRepo.get('activeSessionId')).toBeNull()
    expect(await sessionLogsRepo.list()).toEqual([])
  })
})

describe('expireStaleActiveSession (FR-07.21)', () => {
  it('does nothing when there is no active session', async () => {
    await expect(expireStaleActiveSession()).resolves.toBeUndefined()
  })

  it('does nothing when the active session is from today', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    await startSession({ date: todayLocalDate(), routineIds: [routineId] })

    await expireStaleActiveSession()

    expect(await activeSessionRepo.getCurrent()).not.toBeUndefined()
  })

  it('auto-finalizes a past-day session with progress as partial, then clears it', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    await startSession({ date: yesterdayLocalDate(), routineIds: [routineId] })
    const active = await activeSessionRepo.getCurrent()
    // Backdate the session so it looks like it started (and was last touched) yesterday, and
    // mark some progress so the expiry path has something to preserve.
    await db.activeSession.update(ACTIVE_SESSION_ID, {
      items: active!.items.map((item, i) => (i === 0 ? { ...item, completed: true } : item)),
    })

    await expireStaleActiveSession()

    expect(await activeSessionRepo.getCurrent()).toBeUndefined()
    expect(await metaRepo.get('activeSessionId')).toBeNull()
    const logs = await sessionLogsRepo.list()
    expect(logs).toHaveLength(1)
    expect(logs[0]?.status).toBe('partial')
    expect(logs[0]?.date).toBe(yesterdayLocalDate())
  })

  it('discards a past-day session with no progress at all, writing no log', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routineId = await seedRoutine('Routine A', squat.id)
    await startSession({ date: yesterdayLocalDate(), routineIds: [routineId] })

    await expireStaleActiveSession()

    expect(await activeSessionRepo.getCurrent()).toBeUndefined()
    expect(await sessionLogsRepo.list()).toEqual([])
  })
})

describe('sessionProgress', () => {
  it('counts completed items out of the total', () => {
    const progress = sessionProgress([
      {
        exerciseId: '1',
        nameSnapshot: 'A',
        type: 'sets_reps',
        planned: { kind: 'sets_reps', sets: 1, repsMin: 1 },
        completed: true,
        skipped: false,
      },
      {
        exerciseId: '2',
        nameSnapshot: 'B',
        type: 'sets_reps',
        planned: { kind: 'sets_reps', sets: 1, repsMin: 1 },
        completed: false,
        skipped: true,
      },
    ])
    expect(progress).toEqual({ done: 1, total: 2 })
  })
})

describe('findDuplicateSessionLogs (notes.md: "same agenda again" confirmation)', () => {
  function makeLog(overrides: Partial<SessionLog> = {}): SessionLog {
    return {
      id: overrides.id ?? 'log1',
      date: overrides.date ?? todayLocalDate(),
      weekday: 3,
      routineId: overrides.routineId ?? 'routine-a',
      routineNameSnapshot: overrides.routineNameSnapshot ?? 'Routine A',
      status: 'completed',
      startedAt: '2026-07-09T00:00:00.000Z',
      completedAt: '2026-07-09T01:00:00.000Z',
      items: [],
      createdAt: '2026-07-09T01:00:00.000Z',
      ...overrides,
    }
  }

  it('returns logs whose routineId matches one of the routines about to be started', () => {
    const logs = [makeLog({ routineId: 'routine-a' }), makeLog({ id: 'log2', routineId: 'routine-b' })]
    expect(findDuplicateSessionLogs(logs, ['routine-a'])).toEqual([logs[0]])
    expect(findDuplicateSessionLogs(logs, ['routine-b'])).toEqual([logs[1]])
    expect(findDuplicateSessionLogs(logs, ['routine-a', 'routine-b'])).toEqual(logs)
  })

  it('returns an empty array when nothing overlaps', () => {
    const logs = [makeLog({ routineId: 'routine-a' })]
    expect(findDuplicateSessionLogs(logs, ['routine-c'])).toEqual([])
    expect(findDuplicateSessionLogs([], ['routine-a'])).toEqual([])
  })
})

describe('fillSetsFromPlan (mark-complete autofill: only empty fields, per notes)', () => {
  const planned = { kind: 'sets_reps', sets: 3, repsMin: 8, repsMax: 10, weight: 15 } as const

  it('fills reps/weight from the plan for a fully empty set, and marks it done', () => {
    const filled = fillSetsFromPlan([{ setNo: 1, done: false }], planned)
    expect(filled).toEqual([{ setNo: 1, reps: 10, weight: 15, done: true }])
  })

  it('leaves already-entered fields untouched, only filling what was empty', () => {
    const filled = fillSetsFromPlan(
      [
        { setNo: 1, reps: 12, weight: 20, done: true },
        { setNo: 2, reps: 9, done: false },
        { setNo: 3, done: false },
      ],
      planned,
    )
    expect(filled).toEqual([
      { setNo: 1, reps: 12, weight: 20, done: true },
      { setNo: 2, reps: 9, weight: 15, done: true },
      { setNo: 3, reps: 10, weight: 15, done: true },
    ])
  })

  it('falls back to repsMin when repsMax is unset (fixed rep target)', () => {
    const fixedReps = { kind: 'sets_reps', sets: 1, repsMin: 12 } as const
    const filled = fillSetsFromPlan([{ setNo: 1, done: false }], fixedReps)
    expect(filled[0]?.reps).toBe(12)
  })

  it('leaves weight undefined (bodyweight) when the plan has no weight', () => {
    const bodyweight = { kind: 'sets_reps', sets: 1, repsMin: 10 } as const
    const filled = fillSetsFromPlan([{ setNo: 1, done: false }], bodyweight)
    expect(filled[0]?.weight).toBeUndefined()
  })

  it('preserves an explicit 0 value rather than treating it as empty', () => {
    const filled = fillSetsFromPlan([{ setNo: 1, reps: 0, weight: 0, done: false }], planned)
    expect(filled).toEqual([{ setNo: 1, reps: 0, weight: 0, done: true }])
  })
})
