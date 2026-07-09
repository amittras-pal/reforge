import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, exercisesRepo, healthReportsRepo } from '../../../src/lib/db'
import { watchForFirstMeaningfulWrite } from '../../../src/lib/pwa/storage'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('watchForFirstMeaningfulWrite (FR-04.12, OQ-04.2)', () => {
  it('does not fire while exercises/routines/healthReports are all empty', async () => {
    const onFirstWrite = vi.fn()
    const stop = watchForFirstMeaningfulWrite(onFirstWrite)

    await vi.waitFor(() => {
      // give the initial liveQuery emission a chance to run
      expect(onFirstWrite).not.toHaveBeenCalled()
    })
    stop()
  })

  it('fires exactly once after the first exercise is created', async () => {
    const onFirstWrite = vi.fn()
    const stop = watchForFirstMeaningfulWrite(onFirstWrite)

    await exercisesRepo.create({
      name: 'Back Squat',
      category: 'lower',
      type: 'sets_reps',
      defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
    })

    await vi.waitFor(() => {
      expect(onFirstWrite).toHaveBeenCalledTimes(1)
    })

    await exercisesRepo.create({
      name: 'Bench Press',
      category: 'upper',
      type: 'sets_reps',
      defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
    })
    // still just once — the watcher unsubscribes after the first hit
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(onFirstWrite).toHaveBeenCalledTimes(1)

    stop()
  })

  it('also fires for a health report with no exercises/routines yet', async () => {
    const onFirstWrite = vi.fn()
    const stop = watchForFirstMeaningfulWrite(onFirstWrite)

    await healthReportsRepo.create({
      reportDate: '2026-07-08',
      composition: {},
      muscleFat: {},
      obesity: {},
      targets: {},
      research: {},
    })

    await vi.waitFor(() => {
      expect(onFirstWrite).toHaveBeenCalledTimes(1)
    })
    stop()
  })
})
