import Dexie, { type EntityTable } from 'dexie'
import type {
  ActiveSession,
  Exercise,
  HealthReport,
  MetaEntry,
  Routine,
  ScheduleDay,
  SessionLog,
} from '../domain'
import { SCHEMA_VERSION } from './schema-version'
import { seedDatabase } from './seed'

/**
 * The single Dexie database (FR-00.2, FR-03.1). Nothing outside `lib/db/` should talk to
 * IndexedDB directly — use the repository modules re-exported from `lib/db/index.ts`.
 */
export class ReforgeDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  schedule!: EntityTable<ScheduleDay, 'weekday'>
  sessionLogs!: EntityTable<SessionLog, 'id'>
  activeSession!: EntityTable<ActiveSession, 'id'>
  healthReports!: EntityTable<HealthReport, 'id'>
  meta!: EntityTable<MetaEntry, 'key'>

  constructor(name = 'reforge') {
    super(name)

    // FR-03.2 — stores & indexes. Schema changes are additive/forward-only (FR-03.4): add a
    // new `this.version(n).stores({...})` block (with `.upgrade()` if data must be
    // transformed) rather than editing a version that has already shipped.
    this.version(SCHEMA_VERSION).stores({
      exercises: 'id, name, category, type, isArchived, updatedAt',
      routines: 'id, name, isArchived, updatedAt',
      schedule: 'weekday',
      sessionLogs: 'id, date, routineId, completedAt, status',
      activeSession: 'id',
      healthReports: 'id, reportDate, createdAt, updatedAt',
      meta: 'key',
    })

    // FR-03.6 — seed structural defaults, but only on first run: Dexie fires `populate`
    // exactly once, when the database is created for the very first time.
    this.on('populate', () => seedDatabase(this))
  }
}

/** The app-wide database instance. */
export const db = new ReforgeDatabase()
