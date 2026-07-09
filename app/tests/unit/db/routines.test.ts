import { beforeEach, describe, expect, it } from 'vitest'
import {
  db,
  exercisesRepo,
  routinesRepo,
  scheduleRepo,
  activeSessionRepo,
  sessionLogsRepo,
  InvariantError,
  NotFoundError,
  type ExerciseInput,
} from '../../../src/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

const squatInput: ExerciseInput = {
  name: 'Back Squat',
  category: 'lower',
  type: 'sets_reps',
  defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
}

describe('routinesRepo (FR-03.7, FR-03.9, FR-03.12)', () => {
  it('creates a routine whose items reference existing exercises', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routine = await routinesRepo.create({
      name: 'Lower Body A',
      items: [
        {
          itemId: 'item-1',
          exerciseId: squat.id,
          order: 0,
          prescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
        },
      ],
    })
    expect(routine.id).toBeTruthy()
    expect(routine.isArchived).toBe(false)
    expect(routine.items).toHaveLength(1)
  })

  it('rejects a routine item referencing an unknown exercise and writes nothing (AC-03.5)', async () => {
    await expect(
      routinesRepo.create({
        name: 'Bad Routine',
        items: [
          {
            itemId: 'item-1',
            exerciseId: 'does-not-exist',
            order: 0,
            prescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(InvariantError)

    expect(await db.routines.count()).toBe(0)
  })

  it('update() also rejects an unknown exerciseId in a replacement items array', async () => {
    const routine = await routinesRepo.create({
      name: 'Lower Body A',
      items: [],
    })
    await expect(
      routinesRepo.update(routine.id, {
        items: [
          {
            itemId: 'item-1',
            exerciseId: 'does-not-exist',
            order: 0,
            prescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(InvariantError)

    const reloaded = await routinesRepo.get(routine.id)
    expect(reloaded?.items).toEqual([])
  })

  it('reorderItems reassigns `order` to match the given permutation', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routine = await routinesRepo.create({
      name: 'Lower Body A',
      items: [
        {
          itemId: 'a',
          exerciseId: squat.id,
          order: 0,
          prescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
        },
        {
          itemId: 'b',
          exerciseId: squat.id,
          order: 1,
          prescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
        },
      ],
    })
    const reordered = await routinesRepo.reorderItems(routine.id, ['b', 'a'])
    expect(reordered.items.map((item) => item.itemId)).toEqual(['b', 'a'])
    expect(reordered.items.map((item) => item.order)).toEqual([0, 1])
  })

  it('reorderItems rejects a non-permutation', async () => {
    const squat = await exercisesRepo.create(squatInput)
    const routine = await routinesRepo.create({
      name: 'Lower Body A',
      items: [
        {
          itemId: 'a',
          exerciseId: squat.id,
          order: 0,
          prescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
        },
      ],
    })
    await expect(
      routinesRepo.reorderItems(routine.id, ['not-a-real-item']),
    ).rejects.toBeInstanceOf(InvariantError)
  })

  it('archive/restore toggle isArchived (FR-00.11)', async () => {
    const routine = await routinesRepo.create({
      name: 'Lower Body A',
      items: [],
    })
    await routinesRepo.archive(routine.id)
    expect((await routinesRepo.get(routine.id))?.isArchived).toBe(true)
    await routinesRepo.restore(routine.id)
    expect((await routinesRepo.get(routine.id))?.isArchived).toBe(false)
  })

  it('update() throws NotFoundError for a missing routine', async () => {
    await expect(
      routinesRepo.update('missing', { name: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  describe('remove (FR-06.12)', () => {
    it('hard-deletes a routine with no references', async () => {
      const routine = await routinesRepo.create({
        name: 'Lower Body A',
        items: [],
      })
      await routinesRepo.remove(routine.id)
      expect(await routinesRepo.get(routine.id)).toBeUndefined()
    })

    it('rejects deletion when scheduled for a weekday', async () => {
      const routine = await routinesRepo.create({
        name: 'Lower Body A',
        items: [],
      })
      await scheduleRepo.setDay(1, [routine.id])

      await expect(routinesRepo.remove(routine.id)).rejects.toBeInstanceOf(
        InvariantError,
      )
      expect(await routinesRepo.get(routine.id)).toBeTruthy()
    })

    it('rejects deletion when it is the active session', async () => {
      const routine = await routinesRepo.create({
        name: 'Lower Body A',
        items: [],
      })
      await activeSessionRepo.start({
        date: '2026-07-08',
        weekday: 3,
        routineId: routine.id,
        routineNameSnapshot: routine.name,
        startedAt: '2026-07-08T05:00:00.000Z',
        items: [],
      })

      await expect(routinesRepo.remove(routine.id)).rejects.toBeInstanceOf(
        InvariantError,
      )
    })

    it('rejects deletion when referenced by a session log', async () => {
      const routine = await routinesRepo.create({
        name: 'Lower Body A',
        items: [],
      })
      await sessionLogsRepo.create({
        date: '2026-07-08',
        weekday: 3,
        routineId: routine.id,
        routineNameSnapshot: routine.name,
        status: 'completed',
        startedAt: '2026-07-08T05:00:00.000Z',
        completedAt: '2026-07-08T06:00:00.000Z',
        items: [],
      })

      await expect(routinesRepo.remove(routine.id)).rejects.toBeInstanceOf(
        InvariantError,
      )
    })
  })
})
