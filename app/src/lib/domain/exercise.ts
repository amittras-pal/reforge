import type {
  ExerciseCategory,
  ExerciseType,
  ISODateTime,
  Prescription,
  UUID,
} from './shared'

/**
 * Exercise library entry.
 *
 * Canonical source: features/00-foundation-architecture.md §5.2
 * Dexie indexes (F-03): id (PK), name, category, type, isArchived, updatedAt
 */
export interface Exercise {
  id: UUID
  name: string
  category: ExerciseCategory
  type: ExerciseType
  /** Seeds new routine items when the exercise is added to a routine. */
  defaultPrescription: Prescription
  /** Cues / notes. */
  instructions?: string
  /** Soft-delete flag (FR-00.11) — archived exercises are hidden but session history stays readable. */
  isArchived: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
