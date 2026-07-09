import { liveQuery } from 'dexie'
import { readable, type Readable } from 'svelte/store'

/**
 * Wraps a Dexie `liveQuery` as a Svelte store (FR-03.10). Subscribers get `initial`
 * immediately, then the live query's result whenever the underlying data it reads changes —
 * no manual refresh needed in views. The query only runs while at least one subscriber is
 * attached (Svelte's `readable` start/stop notifier).
 */
export function liveQueryStore<T>(
  querier: () => T | Promise<T>,
  initial: T,
): Readable<T> {
  return readable<T>(initial, (set) => {
    const subscription = liveQuery(querier).subscribe({
      next: set,
      error: (err: unknown) => console.error('[db] liveQuery error', err),
    })
    return () => subscription.unsubscribe()
  })
}
