/**
 * Shared primitive types and enumerations used across the domain model.
 *
 * Canonical source: features/00-foundation-architecture.md §5.1
 */

/** All entity IDs are UUID v4 strings generated with `crypto.randomUUID()` (FR-00.5). */
export type UUID = string

/** ISO-8601 UTC timestamp, e.g. "2026-07-08T05:30:00.000Z" (FR-00.6). */
export type ISODateTime = string

/** Local calendar date, "YYYY-MM-DD" (FR-00.6). */
export type LocalDate = string

/** Weekday index using JS `Date.getDay()` semantics: 0=Sunday … 6=Saturday (FR-00.7). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type ExerciseType = 'sets_reps' | 'duration'

export type ExerciseCategory =
  | 'lower'
  | 'upper'
  | 'core'
  | 'cardio'
  | 'pfmt'
  | 'mobility'
  | 'class'
  | 'other'

export type SegmentRating = 'under' | 'normal' | 'over'

export interface SetsRepsPrescription {
  sets: number
  repsMin: number
  /** Omit for a fixed rep target. */
  repsMax?: number
  /** kg. Bodyweight if omitted. */
  weight?: number
  /** Rest between sets, in seconds. */
  restSec?: number
  toFailure?: boolean
}

export interface DurationPrescription {
  durationSec: number
  /** Free text, e.g. "Zone 2". */
  intensity?: string
  targetHrPctMin?: number
  targetHrPctMax?: number
  distanceMeters?: number
}

/** The planned target for an exercise: sets/reps/load, or duration/intensity (FR-00.8). */
export type Prescription =
  | ({ kind: 'sets_reps' } & SetsRepsPrescription)
  | ({ kind: 'duration' } & DurationPrescription)
