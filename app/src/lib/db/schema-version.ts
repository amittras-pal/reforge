/**
 * Current Dexie schema version (FR-03.3).
 *
 * Schema changes are additive and forward-only (FR-03.4): bump this constant and add a new
 * `this.version(n).stores({...})` block in `database.ts` (with an `.upgrade()` transaction if
 * data must be transformed) instead of editing a version that has already shipped.
 */
export const SCHEMA_VERSION = 1
