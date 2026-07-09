// Polyfills `indexedDB`/`IDBKeyRange`/etc. on `globalThis` for tests — jsdom does not
// implement IndexedDB. Required by the Dexie-backed persistence layer (F-03) tests.
import 'fake-indexeddb/auto'
