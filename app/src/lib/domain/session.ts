import type {
  ExerciseType,
  ISODateTime,
  LocalDate,
  Prescription,
  UUID,
  Weekday,
} from './shared'

/**
 * Performed sessions: immutable history (`SessionLog`) and the single in-progress
 * draft (`ActiveSession`).
 *
 * Canonical source: features/00-foundation-architecture.md §5.5
 */
export interface LoggedSet {
  setNo: number
  reps?: number
  weight?: number
  done: boolean
}

export interface LoggedItem {
  exerciseId: UUID
  /** Captured at session time; survives archival/rename of the exercise (FR-00.11). */
  nameSnapshot: string
  type: ExerciseType
  /** Snapshot of the prescription as planned. */
  planned: Prescription
  /** Actuals for `sets_reps` exercises. */
  setResults?: LoggedSet[]
  /** Actuals for `duration` exercises. */
  actualDurationSec?: number
  actualDistanceMeters?: number
  actualAvgHr?: number
  completed: boolean
  skipped: boolean
  notes?: string
}

/**
 * A completed or partially-completed session.
 *
 * Dexie indexes (F-03): id (PK), date, routineId, completedAt, status.
 * Immutable once completed, except for `notes` (FR-00.10).
 */
export interface SessionLog {
  id: UUID
  /** Day the session was performed. */
  date: LocalDate
  weekday: Weekday
  routineId: UUID
  routineNameSnapshot: string
  status: 'completed' | 'partial'
  startedAt: ISODateTime
  completedAt: ISODateTime
  // Deliberately no total-session duration field: a workout's value isn't its total elapsed
  // time, so it's not tracked at the session level (only per-item `actualDurationSec` on
  // `LoggedItem`, for duration-type exercises, is).
  items: LoggedItem[]
  /** Session rating of perceived exertion, 1..10. */
  rpe?: number
  notes?: string
  createdAt: ISODateTime
}

/**
 * The single in-progress session, if any. Convention: `id = ACTIVE_SESSION_ID`.
 *
 * Dexie indexes (F-03): id (PK).
 */
export interface ActiveSession {
  id: UUID
  date: LocalDate
  weekday: Weekday
  routineId: UUID
  routineNameSnapshot: string
  startedAt: ISODateTime
  updatedAt: ISODateTime
  /** Same shape as `SessionLog.items`, mutated as the user progresses. */
  items: LoggedItem[]
}

/** Well-known, fixed id for the singleton `ActiveSession` record (OQ-03.1). */
export const ACTIVE_SESSION_ID: UUID = 'current'
