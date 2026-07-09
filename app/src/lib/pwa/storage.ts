import { liveQuery } from 'dexie'
import { db } from '../db'

/** Storage usage/quota in bytes, for the Settings readout (FR-04.12). */
export interface StorageUsage {
  usageBytes: number
  quotaBytes: number
}

/** Wraps `navigator.storage.persist()`; resolves `false` if the Storage API is unavailable. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  return navigator.storage.persist()
}

/** Wraps `navigator.storage.persisted()`; resolves `false` if the Storage API is unavailable. */
export async function isStoragePersisted(): Promise<boolean> {
  if (!navigator.storage?.persisted) return false
  return navigator.storage.persisted()
}

/** Wraps `navigator.storage.estimate()`; resolves `undefined` if unavailable (FR-04.12). */
export async function getStorageUsage(): Promise<StorageUsage | undefined> {
  if (!navigator.storage?.estimate) return undefined
  const { usage, quota } = await navigator.storage.estimate()
  return { usageBytes: usage ?? 0, quotaBytes: quota ?? 0 }
}

/**
 * Calls `onFirstWrite` once, the first time real user data exists in `exercises`/`routines`/
 * `healthReports` (FR-04.12 — request persistence at the first *meaningful* data write, not on
 * initial launch, per OQ-04.2). Self-contained: it watches the data itself, so F-06/F-07/F-09
 * don't need to remember to call anything. `sessionLogs` isn't watched separately since a
 * routine must already exist before any session can be logged.
 *
 * Returns an unsubscribe function (mainly for tests; the app calls this once for its lifetime).
 */
export function watchForFirstMeaningfulWrite(
  onFirstWrite: () => void,
): () => void {
  const subscription = liveQuery(async () => {
    const [exercises, routines, healthReports] = await Promise.all([
      db.exercises.count(),
      db.routines.count(),
      db.healthReports.count(),
    ])
    return exercises + routines + healthReports
  }).subscribe({
    next: (total) => {
      if (total > 0) {
        onFirstWrite()
        subscription.unsubscribe()
      }
    },
  })
  return () => subscription.unsubscribe()
}
