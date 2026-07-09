import { db } from './database'
import { seedDatabase } from './seed'

/**
 * Clears every store and restores structural defaults, atomically (FR-03.13). Used by F-05's
 * "replace" import flow and by a Settings "erase all data" action.
 */
export async function resetAll(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.exercises,
      db.routines,
      db.schedule,
      db.sessionLogs,
      db.activeSession,
      db.healthReports,
      db.meta,
    ],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.routines.clear(),
        db.schedule.clear(),
        db.sessionLogs.clear(),
        db.activeSession.clear(),
        db.healthReports.clear(),
        db.meta.clear(),
      ])
      await seedDatabase(db)
    },
  )
}
