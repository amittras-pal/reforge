import type {
  ActiveSession,
  Exercise,
  HealthReport,
  LoggedItem,
  MetaEntry,
  Prescription,
  Routine,
  RoutineItem,
  ScheduleDay,
  SessionLog,
} from '../domain'
import {
  APP_ID,
  STORE_KEYS,
  type BackupData,
  type BackupEnvelope,
  type StoreKey,
} from './envelope'

const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean'
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(guard)
}

const EXERCISE_CATEGORIES = new Set([
  'lower',
  'upper',
  'core',
  'cardio',
  'pfmt',
  'mobility',
  'class',
  'other',
])
const EXERCISE_TYPES = new Set(['sets_reps', 'duration'])

function isValidPrescription(value: unknown): value is Prescription {
  if (!isPlainObject(value)) return false
  if (value.kind === 'sets_reps')
    return isNumber(value.sets) && isNumber(value.repsMin)
  if (value.kind === 'duration') return isNumber(value.durationSec)
  return false
}

function isValidExercise(value: unknown): value is Exercise {
  if (!isPlainObject(value)) return false
  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.category) &&
    EXERCISE_CATEGORIES.has(value.category) &&
    isString(value.type) &&
    EXERCISE_TYPES.has(value.type) &&
    isValidPrescription(value.defaultPrescription) &&
    isBoolean(value.isArchived) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

function isValidRoutineItem(value: unknown): value is RoutineItem {
  if (!isPlainObject(value)) return false
  return (
    isString(value.itemId) &&
    isString(value.exerciseId) &&
    isNumber(value.order) &&
    isValidPrescription(value.prescription)
  )
}

function isValidRoutine(value: unknown): value is Routine {
  if (!isPlainObject(value)) return false
  return (
    isString(value.id) &&
    isString(value.name) &&
    isArrayOf(value.items, isValidRoutineItem) &&
    isBoolean(value.isArchived) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

function isValidScheduleDay(value: unknown): value is ScheduleDay {
  if (!isPlainObject(value)) return false
  return (
    isNumber(value.weekday) &&
    value.weekday >= 0 &&
    value.weekday <= 6 &&
    isArrayOf(value.routineIds, isString)
  )
}

function isValidLoggedItem(value: unknown): value is LoggedItem {
  if (!isPlainObject(value)) return false
  return (
    isString(value.exerciseId) &&
    isString(value.nameSnapshot) &&
    isString(value.type) &&
    EXERCISE_TYPES.has(value.type) &&
    isValidPrescription(value.planned) &&
    isBoolean(value.completed) &&
    isBoolean(value.skipped)
  )
}

function isValidSessionLog(value: unknown): value is SessionLog {
  if (!isPlainObject(value)) return false
  return (
    isString(value.id) &&
    isString(value.date) &&
    isNumber(value.weekday) &&
    isString(value.routineId) &&
    isString(value.routineNameSnapshot) &&
    (value.status === 'completed' || value.status === 'partial') &&
    isString(value.startedAt) &&
    isString(value.completedAt) &&
    isArrayOf(value.items, isValidLoggedItem) &&
    isString(value.createdAt)
  )
}

function isValidActiveSession(value: unknown): value is ActiveSession {
  if (!isPlainObject(value)) return false
  return (
    isString(value.id) &&
    isString(value.date) &&
    isNumber(value.weekday) &&
    isString(value.routineId) &&
    isString(value.routineNameSnapshot) &&
    isString(value.startedAt) &&
    isString(value.updatedAt) &&
    isArrayOf(value.items, isValidLoggedItem)
  )
}

function isValidHealthReport(value: unknown): value is HealthReport {
  if (!isPlainObject(value)) return false
  return (
    isString(value.id) &&
    isString(value.reportDate) &&
    isPlainObject(value.composition) &&
    isPlainObject(value.muscleFat) &&
    isPlainObject(value.obesity) &&
    isPlainObject(value.targets) &&
    isPlainObject(value.research) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  )
}

function isValidMetaEntry(value: unknown): value is MetaEntry {
  return isPlainObject(value) && isString(value.key) && 'value' in value
}

export interface ValidationIssue {
  store: StoreKey
  invalidCount: number
  totalCount: number
}

/** Validates every record's required keys/types against the F-00 shapes (FR-05.8). */
export function validateBackupData(data: BackupData): {
  valid: boolean
  issues: ValidationIssue[]
} {
  const checks: Array<[StoreKey, unknown[], (value: unknown) => boolean]> = [
    ['exercises', data.exercises, isValidExercise],
    ['routines', data.routines, isValidRoutine],
    ['schedule', data.schedule, isValidScheduleDay],
    ['sessionLogs', data.sessionLogs, isValidSessionLog],
    ['activeSession', data.activeSession, isValidActiveSession],
    ['healthReports', data.healthReports, isValidHealthReport],
    ['meta', data.meta, isValidMetaEntry],
  ]
  const issues: ValidationIssue[] = []
  for (const [store, records, guard] of checks) {
    const invalidCount = records.filter((record) => !guard(record)).length
    if (invalidCount > 0)
      issues.push({ store, invalidCount, totalCount: records.length })
  }
  return { valid: issues.length === 0, issues }
}

export type EnvelopeError =
  | { kind: 'wrong-app' }
  | { kind: 'missing-schema-version' }
  | { kind: 'malformed-data'; missingKeys: string[] }

/** Validates the envelope shape: app id, schemaVersion, and known store keys (FR-05.7). */
export function parseEnvelope(
  raw: unknown,
):
  { ok: true; envelope: BackupEnvelope } | { ok: false; error: EnvelopeError } {
  if (!isPlainObject(raw) || !isPlainObject(raw.data)) {
    return {
      ok: false,
      error: { kind: 'malformed-data', missingKeys: [...STORE_KEYS] },
    }
  }
  if (raw.app !== APP_ID) return { ok: false, error: { kind: 'wrong-app' } }
  if (!isNumber(raw.schemaVersion)) {
    return { ok: false, error: { kind: 'missing-schema-version' } }
  }

  const data = raw.data
  const missingKeys = STORE_KEYS.filter((key) => !Array.isArray(data[key]))
  if (missingKeys.length > 0) {
    return { ok: false, error: { kind: 'malformed-data', missingKeys } }
  }
  return { ok: true, envelope: raw as unknown as BackupEnvelope }
}
