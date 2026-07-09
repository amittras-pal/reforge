import type {
  ActiveSession,
  Exercise,
  HealthReport,
  ISODateTime,
  MetaEntry,
  Routine,
  ScheduleDay,
  SessionLog,
} from '../domain'

/** Identifies a Reforge backup file (FR-05.7). */
export const APP_ID = 'reforge'

/** The 7 stores exported/imported, matching F-00 §5 / F-03's schema. */
export const STORE_KEYS = [
  'exercises',
  'routines',
  'schedule',
  'sessionLogs',
  'activeSession',
  'healthReports',
  'meta',
] as const

export type StoreKey = (typeof STORE_KEYS)[number]

/** Every record from every store — the `data` payload of a backup (FR-05.1, FR-05.2). */
export interface BackupData {
  exercises: Exercise[]
  routines: Routine[]
  schedule: ScheduleDay[]
  sessionLogs: SessionLog[]
  activeSession: ActiveSession[]
  healthReports: HealthReport[]
  meta: MetaEntry[]
}

/**
 * Tamper-evidence block (FR-05.17–FR-05.20). `hash` is always present; `hmac`/`hmacSalt` are
 * only present if the export was signed with a passphrase (opt-in, FR-05.19).
 */
export interface BackupIntegrity {
  algo: 'SHA-256'
  hash: string
  hmac?: string
  hmacSalt?: string
}

/** The full backup file envelope (FR-05.1). */
export interface BackupEnvelope {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: ISODateTime
  integrity: BackupIntegrity
  data: BackupData
}
