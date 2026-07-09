import { db, metaRepo } from '../db'

const REMINDER_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000 // 15 days, fixed (OQ-05.2)

async function hasAnyData(): Promise<boolean> {
  const [exercises, routines, healthReports, sessionLogs] = await Promise.all([
    db.exercises.count(),
    db.routines.count(),
    db.healthReports.count(),
    db.sessionLogs.count(),
  ])
  return exercises + routines + healthReports + sessionLogs > 0
}

/**
 * Whether to show the "back up your data" reminder (FR-05.14): the user has data, and either
 * never backed up or hasn't in over 15 days (fixed, not configurable in v1 — OQ-05.2).
 */
export async function shouldShowBackupReminder(): Promise<boolean> {
  if (!(await hasAnyData())) return false
  const lastBackupAt = await metaRepo.get('lastBackupAt')
  if (!lastBackupAt) return true
  return Date.now() - new Date(lastBackupAt).getTime() > REMINDER_THRESHOLD_MS
}
