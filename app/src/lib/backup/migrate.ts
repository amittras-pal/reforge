import type { BackupData } from './envelope'

/**
 * Registry of forward-migration functions, keyed by the version they migrate *from* (FR-05.9).
 * Empty today — there has only ever been schema v1 (F-03) — but this is the extension point
 * for the next schema bump: add a new `this.version(n)` in F-03's `database.ts` *and* a
 * `[n]: (data) => ...` entry here that transforms an older backup's data to the new shape.
 */
const MIGRATIONS: Record<number, (data: BackupData) => BackupData> = {}

/** Applies every migration from `fromVersion` up to (not including) `toVersion`, in order. */
export function migrateBackupData(
  data: BackupData,
  fromVersion: number,
  toVersion: number,
): BackupData {
  let migrated = data
  for (let version = fromVersion; version < toVersion; version++) {
    const migrate = MIGRATIONS[version]
    if (migrate) migrated = migrate(migrated)
  }
  return migrated
}
