import { beforeEach, describe, expect, it } from 'vitest'
import {
  db,
  exercisesRepo,
  routinesRepo,
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
  defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5, repsMax: 8 },
}

describe('exercisesRepo (FR-03.7, AC-03.3, AC-03.4)', () => {
  it('creates a record with an auto id, isArchived=false, and matching createdAt/updatedAt', async () => {
    const exercise = await exercisesRepo.create(squatInput)
    expect(exercise.id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(exercise.isArchived).toBe(false)
    expect(exercise.createdAt).toBe(exercise.updatedAt)
    expect(new Date(exercise.createdAt).toString()).not.toBe('Invalid Date')
  })

  it('lists exercises ordered by name and supports category/isArchived filters', async () => {
    await exercisesRepo.create({
      ...squatInput,
      name: 'Zebra Lunge',
      category: 'lower',
    })
    await exercisesRepo.create({
      ...squatInput,
      name: 'Bench Press',
      category: 'upper',
    })

    const all = await exercisesRepo.list()
    expect(all.map((e) => e.name)).toEqual(['Bench Press', 'Zebra Lunge'])

    const lowerOnly = await exercisesRepo.list({ category: 'lower' })
    expect(lowerOnly.map((e) => e.name)).toEqual(['Zebra Lunge'])
  })

  it('updates a record, bumping updatedAt without changing createdAt', async () => {
    const created = await exercisesRepo.create(squatInput)
    await new Promise((resolve) => setTimeout(resolve, 5))
    const updated = await exercisesRepo.update(created.id, {
      name: 'Barbell Back Squat',
    })
    expect(updated.name).toBe('Barbell Back Squat')
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.updatedAt).not.toBe(created.updatedAt)
  })

  it('throws NotFoundError when updating a non-existent id', async () => {
    await expect(
      exercisesRepo.update('missing-id', { name: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('archive/restore toggle isArchived and are reflected in list filters (FR-00.11)', async () => {
    const created = await exercisesRepo.create(squatInput)
    await exercisesRepo.archive(created.id)
    expect(await exercisesRepo.list({ isArchived: true })).toHaveLength(1)
    expect(await exercisesRepo.list({ isArchived: false })).toHaveLength(0)

    await exercisesRepo.restore(created.id)
    expect(await exercisesRepo.list({ isArchived: false })).toHaveLength(1)
    void created
  })

  describe('remove (FR-06.4)', () => {
    it('hard-deletes an exercise with no references', async () => {
      const created = await exercisesRepo.create(squatInput)
      await exercisesRepo.remove(created.id)
      expect(await exercisesRepo.get(created.id)).toBeUndefined()
    })

    it('rejects deletion when a routine references the exercise', async () => {
      const created = await exercisesRepo.create(squatInput)
      await routinesRepo.create({
        name: 'Lower Body A',
        items: [
          {
            itemId: 'item-1',
            exerciseId: created.id,
            order: 0,
            prescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
          },
        ],
      })

      await expect(exercisesRepo.remove(created.id)).rejects.toBeInstanceOf(
        InvariantError,
      )
      expect(await exercisesRepo.get(created.id)).toBeTruthy()
    })

    it('rejects deletion when the active session references the exercise', async () => {
      const created = await exercisesRepo.create(squatInput)
      await activeSessionRepo.start({
        date: '2026-07-08',
        weekday: 3,
        routineId: 'routine-1',
        routineNameSnapshot: 'Lower Body A',
        startedAt: '2026-07-08T05:00:00.000Z',
        items: [
          {
            exerciseId: created.id,
            nameSnapshot: created.name,
            type: 'sets_reps',
            planned: { kind: 'sets_reps', sets: 3, repsMin: 5 },
            completed: false,
            skipped: false,
          },
        ],
      })

      await expect(exercisesRepo.remove(created.id)).rejects.toBeInstanceOf(
        InvariantError,
      )
    })

    it('rejects deletion when a session log references the exercise', async () => {
      const created = await exercisesRepo.create(squatInput)
      await sessionLogsRepo.create({
        date: '2026-07-08',
        weekday: 3,
        routineId: 'routine-1',
        routineNameSnapshot: 'Lower Body A',
        status: 'completed',
        startedAt: '2026-07-08T05:00:00.000Z',
        completedAt: '2026-07-08T06:00:00.000Z',
        items: [
          {
            exerciseId: created.id,
            nameSnapshot: created.name,
            type: 'sets_reps',
            planned: { kind: 'sets_reps', sets: 3, repsMin: 5 },
            completed: true,
            skipped: false,
          },
        ],
      })

      await expect(exercisesRepo.remove(created.id)).rejects.toBeInstanceOf(
        InvariantError,
      )
    })
  })
})
