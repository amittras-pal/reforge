import { DEFAULT_META } from '../domain'
import type { ScheduleDay, Weekday } from '../domain'
import { SCHEMA_VERSION } from './schema-version'
import type { ReforgeDatabase } from './database'

/**
 * Seeds structural defaults, but only on a fresh install (FR-03.6): 7 empty schedule days
 * (weekday 0–6) and the default `meta` entries. Deliberately seeds **no** exercises/routines —
 * the Configurator (F-06) starts empty.
 *
 * Called from `ReforgeDatabase`'s `populate` handler (first run) and from `resetAll()`
 * (FR-03.13), both of which run this against already-empty stores inside an active transaction.
 */
export async function seedDatabase(db: ReforgeDatabase): Promise<void> {
  const days: ScheduleDay[] = Array.from({ length: 7 }, (_, weekday) => ({
    weekday: weekday as Weekday,
    routineIds: [],
  }))
  await db.schedule.bulkAdd(days)

  await db.meta.bulkAdd([
    { key: 'schemaVersion', value: SCHEMA_VERSION },
    { key: 'profile', value: DEFAULT_META.profile },
    { key: 'theme', value: DEFAULT_META.theme },
    { key: 'density', value: DEFAULT_META.density },
    { key: 'weekStartsOn', value: DEFAULT_META.weekStartsOn },
    { key: 'activeSessionId', value: DEFAULT_META.activeSessionId },
    { key: 'lastBackupAt', value: DEFAULT_META.lastBackupAt },
  ])
}
