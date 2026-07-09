import { ACTIVE_SESSION_ID } from '../domain'
import { db, SCHEMA_VERSION } from '../db'
import {
  STORE_KEYS,
  type BackupData,
  type BackupEnvelope,
  type StoreKey,
} from './envelope'
import {
  parseEnvelope,
  validateBackupData,
  type ValidationIssue,
} from './validate'
import { migrateBackupData } from './migrate'
import { checkHash, checkHmac, type HashStatus } from './integrity'

/** Safety cap so a huge/malformed file can't be read into memory unbounded (FR-05.16). */
export const MAX_BACKUP_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

export type ImportError =
  | { kind: 'file-too-large' }
  | { kind: 'invalid-json' }
  | { kind: 'wrong-app' }
  | { kind: 'missing-schema-version' }
  | { kind: 'malformed-data'; missingKeys: string[] }
  | { kind: 'schema-too-new'; fileVersion: number; appVersion: number }
  | { kind: 'invalid-records'; issues: ValidationIssue[] }

/** Converts a structured `ImportError` into a user-facing message (§6). */
export function describeImportError(error: ImportError): string {
  switch (error.kind) {
    case 'file-too-large':
      return 'That file is too large to be a Reforge backup.'
    case 'invalid-json':
      return "That file isn't valid JSON."
    case 'wrong-app':
      return "This doesn't look like a Reforge backup file."
    case 'missing-schema-version':
      return 'This backup is missing its schema version.'
    case 'malformed-data':
      return `This backup file is malformed (missing: ${error.missingKeys.join(', ')}).`
    case 'schema-too-new':
      return `This backup was made with a newer version of the app (schema v${error.fileVersion}). Please update the app.`
    case 'invalid-records':
      return `This backup has invalid records: ${error.issues
        .map(
          (issue) =>
            `${issue.invalidCount}/${issue.totalCount} in ${issue.store}`,
        )
        .join(', ')}.`
  }
}

export interface PreparedImport {
  data: BackupData
  exportedAt: string
  schemaVersion: number
  hashStatus: HashStatus
  hasSignature: boolean
  recordCounts: Record<StoreKey, number>
}

export type PrepareImportResult =
  { ok: true; prepared: PreparedImport } | { ok: false; error: ImportError }

/**
 * Normalizes the imported `meta.schemaVersion` entry to the app's current version — it's a
 * DB-version marker, not portable user data; once migrated, the data unambiguously is at the
 * current schema version regardless of what number the original file had (FR-05.5).
 */
function normalizeSchemaVersionMeta(data: BackupData): BackupData {
  return {
    ...data,
    meta: data.meta.map((entry) =>
      entry.key === 'schemaVersion'
        ? { key: 'schemaVersion', value: SCHEMA_VERSION }
        : entry,
    ),
  }
}

async function parseBackupFile(
  file: File,
): Promise<
  { ok: true; envelope: BackupEnvelope } | { ok: false; error: ImportError }
> {
  if (file.size > MAX_BACKUP_FILE_BYTES)
    return { ok: false, error: { kind: 'file-too-large' } }
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    return { ok: false, error: { kind: 'invalid-json' } }
  }
  const parsed = parseEnvelope(raw)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  return { ok: true, envelope: parsed.envelope }
}

/**
 * Reads, validates, migrates, and integrity-checks a backup file — but doesn't write anything
 * to the database yet (FR-05.6–FR-05.9, FR-05.16–FR-05.18). Call `applyImport` with the
 * result's `data` once the user confirms.
 */
export async function prepareImport(file: File): Promise<PrepareImportResult> {
  const parsedFile = await parseBackupFile(file)
  if (!parsedFile.ok) return parsedFile
  const { envelope } = parsedFile

  if (envelope.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        kind: 'schema-too-new',
        fileVersion: envelope.schemaVersion,
        appVersion: SCHEMA_VERSION,
      },
    }
  }

  const migrated = normalizeSchemaVersionMeta(
    migrateBackupData(envelope.data, envelope.schemaVersion, SCHEMA_VERSION),
  )

  const validation = validateBackupData(migrated)
  if (!validation.valid) {
    return {
      ok: false,
      error: { kind: 'invalid-records', issues: validation.issues },
    }
  }

  const hashStatus = await checkHash(
    {
      schemaVersion: envelope.schemaVersion,
      exportedAt: envelope.exportedAt,
      data: envelope.data,
    },
    envelope.integrity?.hash,
  )

  const recordCounts = Object.fromEntries(
    STORE_KEYS.map((key) => [key, migrated[key].length]),
  ) as Record<StoreKey, number>

  return {
    ok: true,
    prepared: {
      data: migrated,
      exportedAt: envelope.exportedAt,
      schemaVersion: envelope.schemaVersion,
      hashStatus,
      hasSignature: Boolean(envelope.integrity?.hmac),
      recordCounts,
    },
  }
}

/**
 * Re-verifies the file's optional HMAC signature with a re-entered passphrase (FR-05.19).
 * Returns `undefined` if the file has no signature or can't be parsed.
 */
export async function verifyImportSignature(
  file: File,
  passphrase: string,
): Promise<boolean | undefined> {
  const parsedFile = await parseBackupFile(file)
  if (!parsedFile.ok) return undefined
  const { envelope } = parsedFile
  return checkHmac(
    {
      schemaVersion: envelope.schemaVersion,
      exportedAt: envelope.exportedAt,
      data: envelope.data,
    },
    passphrase,
    envelope.integrity?.hmac,
    envelope.integrity?.hmacSalt,
  )
}

export interface ImportSummary {
  mode: 'merge' | 'replace'
  counts: Record<StoreKey, { added: number; updated: number }>
}

interface UpsertableTable<T> {
  bulkGet(keys: unknown[]): Promise<(T | undefined)[]>
  bulkPut(records: T[]): Promise<unknown>
}

async function upsertStore<T>(
  table: UpsertableTable<T>,
  records: T[],
  primaryKeyOf: (record: T) => unknown,
): Promise<{ added: number; updated: number }> {
  if (records.length === 0) return { added: 0, updated: 0 }
  const existing = await table.bulkGet(records.map(primaryKeyOf))
  const existingCount = existing.filter((record) => record !== undefined).length
  await table.bulkPut(records)
  return { added: records.length - existingCount, updated: existingCount }
}

/**
 * Re-derives device-local state after loading imported data: a dangling `activeSession`
 * (pointing at a routine that no longer exists) is cleared, and `meta.activeSessionId` is
 * reconciled to match reality (FR-05.11).
 */
async function reconcileActiveSession(): Promise<void> {
  const active = await db.activeSession.get(ACTIVE_SESSION_ID)
  if (active) {
    const routineExists =
      (await db.routines.get(active.routineId)) !== undefined
    if (!routineExists) await db.activeSession.delete(ACTIVE_SESSION_ID)
  }
  const stillActive =
    (await db.activeSession.get(ACTIVE_SESSION_ID)) !== undefined
  await db.meta.put({
    key: 'activeSessionId',
    value: stillActive ? ACTIVE_SESSION_ID : null,
  })
}

/**
 * Applies previously-prepared, validated import data (FR-05.10–FR-05.13). `replace` clears
 * every store first; both modes then upsert by primary key within the *same* transaction, so a
 * failure rolls back to the pre-import state (FR-05.12). Replace mode intentionally doesn't
 * call F-03's `resetAll()` here (which reseeds structural defaults in its own separate
 * transaction) — the imported data already supplies a full schedule/meta, so reseeding first
 * would just be redundant work, and doing it in a different transaction would break the
 * all-or-nothing atomicity FR-05.12 requires.
 */
export async function applyImport(
  data: BackupData,
  mode: 'merge' | 'replace',
): Promise<ImportSummary> {
  const tables = [
    db.exercises,
    db.routines,
    db.schedule,
    db.sessionLogs,
    db.activeSession,
    db.healthReports,
    db.meta,
  ]
  const counts = await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      await Promise.all(tables.map((table) => table.clear()))
    }
    const result: ImportSummary['counts'] = {
      exercises: await upsertStore(db.exercises, data.exercises, (r) => r.id),
      routines: await upsertStore(db.routines, data.routines, (r) => r.id),
      schedule: await upsertStore(db.schedule, data.schedule, (r) => r.weekday),
      sessionLogs: await upsertStore(
        db.sessionLogs,
        data.sessionLogs,
        (r) => r.id,
      ),
      activeSession: await upsertStore(
        db.activeSession,
        data.activeSession,
        (r) => r.id,
      ),
      healthReports: await upsertStore(
        db.healthReports,
        data.healthReports,
        (r) => r.id,
      ),
      meta: await upsertStore(db.meta, data.meta, (r) => r.key),
    }
    await reconcileActiveSession()
    return result
  })
  return { mode, counts }
}
