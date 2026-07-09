import { beforeEach, describe, expect, it } from 'vitest'
import { db, exercisesRepo, metaRepo } from '../../../src/lib/db'
import { shouldShowBackupReminder } from '../../../src/lib/backup/reminder'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function createExercise() {
  return exercisesRepo.create({
    name: 'Back Squat',
    category: 'lower',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
  })
}

describe('shouldShowBackupReminder (FR-05.14, OQ-05.2)', () => {
  it('is false when there is no data at all, regardless of lastBackupAt', async () => {
    expect(await shouldShowBackupReminder()).toBe(false)
  })

  it('is true when there is data and lastBackupAt is null', async () => {
    await createExercise()
    expect(await metaRepo.get('lastBackupAt')).toBeNull()
    expect(await shouldShowBackupReminder()).toBe(true)
  })

  it('is false when backed up recently', async () => {
    await createExercise()
    await metaRepo.set('lastBackupAt', new Date().toISOString())
    expect(await shouldShowBackupReminder()).toBe(false)
  })

  it('is true when the last backup is older than 15 days', async () => {
    await createExercise()
    const sixteenDaysAgo = new Date(
      Date.now() - 16 * 24 * 60 * 60 * 1000,
    ).toISOString()
    await metaRepo.set('lastBackupAt', sixteenDaysAgo)
    expect(await shouldShowBackupReminder()).toBe(true)
  })

  it('is false when the last backup is within 15 days', async () => {
    await createExercise()
    const tenDaysAgo = new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString()
    await metaRepo.set('lastBackupAt', tenDaysAgo)
    expect(await shouldShowBackupReminder()).toBe(false)
  })
})
