import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import { db, exercisesRepo, liveQueryStore } from '../../../src/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('liveQueryStore (FR-03.10, AC-03.6)', () => {
  it('reflects the live result of a Dexie query and updates when the data changes', async () => {
    const store = liveQueryStore(() => db.exercises.count(), -1)
    // Hold a subscription open for the whole test so the underlying liveQuery keeps running.
    const unsubscribe = store.subscribe(() => {})

    await vi.waitFor(() => {
      expect(get(store)).toBe(0)
    })

    await exercisesRepo.create({
      name: 'Back Squat',
      category: 'lower',
      type: 'sets_reps',
      defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
    })

    await vi.waitFor(() => {
      expect(get(store)).toBe(1)
    })

    unsubscribe()
  })
})
