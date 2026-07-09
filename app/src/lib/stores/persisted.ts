import { writable, type Writable } from 'svelte/store'

const PREFIX = 'reforge:'

function readStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage may be full or unavailable (e.g. private browsing) — fail silently for now.
    // F-03/F-05 will provide durable, user-visible persistence via IndexedDB.
  }
}

/**
 * A Svelte store backed by `localStorage`.
 *
 * Temporary stand-in for F-03's Dexie-backed `meta` store: F-02 doesn't depend on F-03
 * (see features/02-app-shell-and-navigation.md §7), so settings persist here for now and
 * will be migrated to `metaRepo` once the data persistence layer lands.
 */
export function persisted<T>(key: string, fallback: T): Writable<T> {
  const store = writable<T>(readStorage(key, fallback))
  store.subscribe((value) => writeStorage(key, value))
  return store
}
