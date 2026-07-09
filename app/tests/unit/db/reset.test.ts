import { beforeEach, describe, expect, it } from 'vitest'
import { db, exercisesRepo, scheduleRepo, resetAll } from '../../../src/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('resetAll (FR-03.13, AC-03.8)', () => {
  it('clears every store and restores structural defaults atomically', async () => {
    await exercisesRepo.create({
      name: 'Back Squat',
      category: 'lower',
      type: 'sets_reps',
      defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
    })
    await scheduleRepo.setDay(1, [])

    expect(await db.exercises.count()).toBeGreaterThan(0)

    await resetAll()

    expect(await db.exercises.count()).toBe(0)
    expect(await db.routines.count()).toBe(0)
    expect(await db.sessionLogs.count()).toBe(0)
    expect(await db.activeSession.count()).toBe(0)
    expect(await db.healthReports.count()).toBe(0)

    const days = await scheduleRepo.getWeek()
    expect(days).toHaveLength(7)
    expect(days.every((day) => day.routineIds.length === 0)).toBe(true)

    const schemaVersion = await db.meta.get('schemaVersion')
    expect(schemaVersion?.value).toBe(1)
  })
})
