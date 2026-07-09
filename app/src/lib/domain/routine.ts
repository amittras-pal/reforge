import type { ISODateTime, Prescription, UUID } from './shared'

/**
 * Workout-day templates.
 *
 * Canonical source: features/00-foundation-architecture.md §5.3
 * Dexie indexes (F-03): id (PK), name, isArchived, updatedAt
 */
export interface RoutineItem {
  itemId: UUID
  /** References Exercise.id */
  exerciseId: UUID
  /** 0-based position in the routine. */
  order: number
  /** May override the exercise's default prescription. */
  prescription: Prescription
  /** Items sharing a label are performed as a superset. */
  supersetGroup?: string
  notes?: string
}

export interface Routine {
  id: UUID
  /** e.g. "Lower Body A" */
  name: string
  /** e.g. "Lower Body Hypertrophy & Pelvic Stability" */
  focus?: string
  items: RoutineItem[]
  estimatedDurationMin?: number
  notes?: string
  /** Soft-delete flag (FR-00.11). */
  isArchived: boolean
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
