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
  /**
   * Which routine (of a possibly-combined session) this item came from, + its name at session
   * time (Notes for Improvement.md: visually group a combined session's items by routine, the
   * same way the pre-start agenda preview already does). Optional: absent on session/backup
   * data written before this field existed, and the UI falls back to a single ungrouped list
   * in that case rather than assuming every historical record has it.
   */
  routineId?: UUID
  routineNameSnapshot?: string
  /** Actuals for `sets_reps` exercises. */
  setResults?: LoggedSet[]
  /** Actuals for `duration` exercises. */
  actualDurationSec?: number
  actualDistanceMeters?: number
  actualAvgHr?: number
  /**
   * Duration stopwatch state (FR-07.10), persisted so a running stopwatch survives reloads and
   * backgrounding. `stopwatchStartedAtMs` is a wall-clock epoch anchor — elapsed time is always
   * recomputed as `Date.now() - stopwatchStartedAtMs` — present only while running.
   * `stopwatchElapsedSec` is the last-known value: authoritative while stopped, and the baseline
   * a subsequent Start resumes from. Independent of `actualDurationSec`, which the user may
   * hand-edit without affecting the stopwatch.
   */
  stopwatchStartedAtMs?: number
  stopwatchElapsedSec?: number
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
