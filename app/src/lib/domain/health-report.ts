import type { ISODateTime, LocalDate, SegmentRating, UUID } from './shared'

/**
 * Versioned InBody body-composition snapshots.
 *
 * Canonical source: features/00-foundation-architecture.md §5.6
 * Dexie indexes (F-03): id (PK), reportDate, createdAt, updatedAt.
 *
 * Editing strategy (FR-00.9): reports are editable, dated records corrected in place
 * (bumping `updatedAt`); there is no per-edit revision log. Creating a new report is a
 * separate, explicit action.
 */
export interface Segment {
  /**
   * kg. Optional — FR-09.4 requires every measurement except Report Date to be optional so a
   * partial report can be saved, which extends F-00's original `mass: number` to `mass?: number`.
   */
  mass?: number
  rating?: SegmentRating
}

export interface Segmental {
  leftArm: Segment
  rightArm: Segment
  leftLeg: Segment
  rightLeg: Segment
  torso: Segment
}

export interface HealthReport {
  id: UUID
  /** Measurement date, from the InBody sheet "Report Date". */
  reportDate: LocalDate
  measuredAt?: ISODateTime

  // Age / height / gender live in the global UserProfile (see meta.ts), not per report.
  /** InBody Score, 0..100. */
  score?: number
  composition: {
    bodyWaterKg?: number
    proteinKg?: number
    mineralKg?: number
    bodyFatMassKg?: number
    totalWeightKg?: number
  }
  muscleFat: {
    skeletalMuscleMassKg?: number
    bodyFatMassKg?: number
  }
  obesity: {
    bmi?: number
    /** Percent body fat. */
    pbf?: number
  }
  targets: {
    targetWeightKg?: number
    weightControlKg?: number
    fatControlKg?: number
    muscleControlKg?: number
  }
  /** Waist-hip ratio. */
  whr?: number
  visceralFatLevel?: number
  segmentalLean?: Segmental
  segmentalFat?: Segmental
  research: {
    fatFreeMassKg?: number
    bmr?: number
    obesityDegreePct?: number
    smi?: number
    recommendedCalorieIntake?: number
  }

  notes?: string
  createdAt: ISODateTime
  /** Bumped on each in-place edit (FR-00.9). */
  updatedAt: ISODateTime
}
