import { db, metaRepo, SCHEMA_VERSION } from '../db'
import { nowIso, todayLocalDate } from '../utils'
import {
  APP_ID,
  type BackupData,
  type BackupEnvelope,
  type BackupIntegrity,
} from './envelope'
import { computeHash, computeHmac } from './integrity'

async function readAllStores(): Promise<BackupData> {
  const tables = [
    db.exercises,
    db.routines,
    db.schedule,
    db.sessionLogs,
    db.activeSession,
    db.healthReports,
    db.meta,
  ]
  // FR-05.2: a single (read-only) transaction for a consistent snapshot across all 7 stores.
  return db.transaction('r', tables, async () => ({
    exercises: await db.exercises.toArray(),
    routines: await db.routines.toArray(),
    schedule: await db.schedule.toArray(),
    sessionLogs: await db.sessionLogs.toArray(),
    activeSession: await db.activeSession.toArray(),
    healthReports: await db.healthReports.toArray(),
    meta: await db.meta.toArray(),
  }))
}

/**
 * Builds the backup envelope — pure DB read + hashing, no download side effect — split out
 * from `exportBackup` so it's unit-testable without a browser Blob/download.
 */
export async function buildBackupEnvelope(
  passphrase?: string,
): Promise<BackupEnvelope> {
  const data = await readAllStores()
  const exportedAt = nowIso()
  const payload = { schemaVersion: SCHEMA_VERSION, exportedAt, data }

  const integrity: BackupIntegrity = {
    algo: 'SHA-256',
    hash: await computeHash(payload),
  }
  if (passphrase) {
    const { hmac, hmacSalt } = await computeHmac(payload, passphrase)
    integrity.hmac = hmac
    integrity.hmacSalt = hmacSalt
  }

  return {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    integrity,
    data,
  }
}

function downloadJson(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Exports the full database as a downloadable JSON file (FR-05.1–FR-05.4) and records
 * `meta.lastBackupAt`. Pass a `passphrase` to also sign the export with an HMAC (FR-05.19).
 */
export async function exportBackup(passphrase?: string): Promise<void> {
  const envelope = await buildBackupEnvelope(passphrase)
  downloadJson(envelope, `reforge-backup-${todayLocalDate()}.json`)
  await metaRepo.set('lastBackupAt', envelope.exportedAt)
}
