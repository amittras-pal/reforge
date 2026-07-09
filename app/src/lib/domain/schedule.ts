import type { UUID, Weekday } from './shared'

/**
 * Weekly microcycle: weekday → routine assignment.
 *
 * Canonical source: features/00-foundation-architecture.md §5.4
 * Dexie indexes (F-03): weekday (PK). Exactly 7 records (0..6) maintained by F-06.
 */
export interface ScheduleDay {
  /** 0=Sun … 6=Sat (PK). */
  weekday: Weekday
  /** 0..n routines; empty = rest day. */
  routineIds: UUID[]
  /** Optional day label, e.g. "Rest". */
  label?: string
}
