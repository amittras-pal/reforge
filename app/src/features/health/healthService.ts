import type {
  HealthReport,
  Segment,
  Segmental,
  SegmentRating,
  UserProfile,
} from '../../lib/domain'

/**
 * Pure business logic for the Health Tracker (F-09) — no Svelte imports, unit-tested
 * independently of the UI (same convention as F-07/F-08's `*Service.ts` files).
 */

// ---------------------------------------------------------------------------
// Reference hints (FR-09.6) — static thresholds the InBody sheet itself defines.
// Non-blocking guidance only; not medical interpretation (F-09 §2 non-goals).
// ---------------------------------------------------------------------------
export const WHR_NORMAL_MIN = 0.8
export const WHR_NORMAL_MAX = 0.9
export const VISCERAL_FAT_NORMAL_MAX = 9
export const INBODY_SCORE_GOOD_MIN = 80

/**
 * WHR "substantially increased risk" cut-offs are gender-specific (WHO guidance, corroborated
 * by e.g. https://www.healthline.com/health/waist-to-hip-ratio: men ≤0.90, women ≤0.85 is
 * lower-risk) — unlike Visceral Fat Level, which InBody presents on a single 1..9-is-normal
 * scale with no gender split, so it isn't made gender-specific here (Notes for Improvement.md).
 */
export const WHR_NORMAL_MAX_MALE = 0.9
export const WHR_NORMAL_MAX_FEMALE = 0.85

/**
 * Gender-specific WHR guidance line for the report detail view (FR-09.6, Notes for
 * Improvement.md). Falls back to the original generic range for `'other'`/unset gender — there
 * isn't a published equivalent threshold for that case, so gender-specific handling is
 * intentionally dropped there rather than guessed at.
 */
export function whrRangeHint(gender: UserProfile['gender']): string {
  if (gender === 'male') return `Normal: below ${WHR_NORMAL_MAX_MALE}`
  if (gender === 'female') return `Normal: below ${WHR_NORMAL_MAX_FEMALE}`
  return `Normal range: ${WHR_NORMAL_MIN}–${WHR_NORMAL_MAX} (set your gender in Settings for a precise threshold)`
}

export const SEGMENT_PART_LABELS: Record<keyof Segmental, string> = {
  leftArm: 'Left Arm',
  rightArm: 'Right Arm',
  leftLeg: 'Left Leg',
  rightLeg: 'Right Leg',
  torso: 'Torso',
}

/**
 * Formats a target "control" value (Weight/Fat/Muscle Control) as a signed instruction rather
 * than a raw signed number (Notes for Improvement.md): positive → "Add", negative → "Drop".
 */
export function formatControlValue(value: number | undefined): string {
  if (value === undefined) return '—'
  if (value > 0) return `Gain ${round1(Math.abs(value))}kg`
  if (value < 0) return `Drop ${round1(Math.abs(value))}kg`
  return 'On target'
}


/** Rounds to 1 decimal place (matches the InBody sheet's own display precision). */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Parses a numeric form field into an optional number; blank/invalid → `undefined`.
 *
 * Accepts `number` (not just `string`) because Svelte coerces `bind:value` on
 * `<input type="number">` to a real `number`, or `undefined` when empty, regardless of the
 * bound variable's declared type — every numeric field in this form is statically typed
 * `string` (to satisfy `TextField`'s prop contract) but can be handed either shape at runtime.
 */
export function parseOptionalNumber(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** `true` if blank (allowed) or a finite number `>= 0` — used for FR-09.5's non-negative rule. */
export function isValidNonNegative(value: string | number | undefined): boolean {
  if (value === undefined) return true
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0
  const trimmed = value.trim()
  if (trimmed === '') return true
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && parsed >= 0
}

// ---------------------------------------------------------------------------
// Auto-fill-with-override suggestions (FR-09.7)
// ---------------------------------------------------------------------------

/** BMI suggestion from height + total weight, or `undefined` if either is missing/invalid. */
export function calculateBmi(
  heightCm: number | undefined,
  totalWeightKg: number | undefined,
): number | undefined {
  if (!heightCm || !totalWeightKg || heightCm <= 0 || totalWeightKg <= 0) return undefined
  const heightM = heightCm / 100
  return round1(totalWeightKg / (heightM * heightM))
}

/** PBF (% body fat) suggestion from body fat mass ÷ total weight. */
export function calculatePbf(
  bodyFatMassKg: number | undefined,
  totalWeightKg: number | undefined,
): number | undefined {
  if (!bodyFatMassKg || !totalWeightKg || totalWeightKg <= 0) return undefined
  return round1((bodyFatMassKg / totalWeightKg) * 100)
}

/**
 * Total Weight suggestion: sum of the other 4 Composition-group fields (Body Water + Protein +
 * Mineral + Body Fat Mass) — matches the InBody sheet exactly (e.g. 36 + 9.8 + 3.59 + 22.8 =
 * 72.19/72.2). Requires all 4 to be present; a partial sum would be misleading.
 */
export function calculateTotalWeight(
  bodyWaterKg: number | undefined,
  proteinKg: number | undefined,
  mineralKg: number | undefined,
  bodyFatMassKg: number | undefined,
): number | undefined {
  if (
    bodyWaterKg === undefined ||
    proteinKg === undefined ||
    mineralKg === undefined ||
    bodyFatMassKg === undefined
  ) {
    return undefined
  }
  return round1(bodyWaterKg + proteinKg + mineralKg + bodyFatMassKg)
}

/**
 * Fat Free Mass suggestion: sum of the first 3 Composition-group fields (Body Water + Protein +
 * Mineral) — matches the InBody sheet exactly (e.g. 36 + 9.8 + 3.59 = 49.39/49.4).
 */
export function calculateFatFreeMass(
  bodyWaterKg: number | undefined,
  proteinKg: number | undefined,
  mineralKg: number | undefined,
): number | undefined {
  if (bodyWaterKg === undefined || proteinKg === undefined || mineralKg === undefined) {
    return undefined
  }
  return round1(bodyWaterKg + proteinKg + mineralKg)
}

// ---------------------------------------------------------------------------
// Global profile (FR-09.1/FR-09.2)
// ---------------------------------------------------------------------------

/** `true` if any of the required-for-display profile fields are missing. */
export function isProfileIncomplete(profile: UserProfile): boolean {
  return !profile.birthday || !profile.heightCm || !profile.gender
}

// ---------------------------------------------------------------------------
// Segmental lean/fat form <-> domain conversion
// ---------------------------------------------------------------------------

export interface SegmentFormValue {
  mass: string
  rating: string
}

export interface SegmentalFormValue {
  leftArm: SegmentFormValue
  rightArm: SegmentFormValue
  leftLeg: SegmentFormValue
  rightLeg: SegmentFormValue
  torso: SegmentFormValue
}

export function emptySegmentalForm(): SegmentalFormValue {
  return {
    leftArm: { mass: '', rating: '' },
    rightArm: { mass: '', rating: '' },
    leftLeg: { mass: '', rating: '' },
    rightLeg: { mass: '', rating: '' },
    torso: { mass: '', rating: '' },
  }
}

function segmentToForm(segment?: Segment): SegmentFormValue {
  return {
    mass: segment?.mass !== undefined ? String(segment.mass) : '',
    rating: segment?.rating ?? '',
  }
}

/** Seeds form state from an existing report's segmental data (or blanks it for a new report). */
export function segmentalToFormValue(segmental?: Segmental): SegmentalFormValue {
  if (!segmental) return emptySegmentalForm()
  return {
    leftArm: segmentToForm(segmental.leftArm),
    rightArm: segmentToForm(segmental.rightArm),
    leftLeg: segmentToForm(segmental.leftLeg),
    rightLeg: segmentToForm(segmental.rightLeg),
    torso: segmentToForm(segmental.torso),
  }
}

function formToSegment(form: SegmentFormValue): Segment {
  const segment: Segment = {}
  const mass = parseOptionalNumber(form.mass)
  if (mass !== undefined) segment.mass = mass
  if (form.rating) segment.rating = form.rating as SegmentRating
  return segment
}

/** Builds a `Segmental` for saving, or `undefined` if the user entered no data at all. */
export function segmentalFormToInput(form: SegmentalFormValue): Segmental | undefined {
  const leftArm = formToSegment(form.leftArm)
  const rightArm = formToSegment(form.rightArm)
  const leftLeg = formToSegment(form.leftLeg)
  const rightLeg = formToSegment(form.rightLeg)
  const torso = formToSegment(form.torso)
  const hasAnyData = [leftArm, rightArm, leftLeg, rightLeg, torso].some(
    (segment) => segment.mass !== undefined || segment.rating !== undefined,
  )
  return hasAnyData ? { leftArm, rightArm, leftLeg, rightLeg, torso } : undefined
}

/** All 5 mass strings of a segmental form — used to validate them as a group. */
export function segmentalMassValues(form: SegmentalFormValue): string[] {
  return Object.values(form).map((segment) => segment.mass)
}

// ---------------------------------------------------------------------------
// List, summary & trends (FR-09.11, FR-09.13)
// ---------------------------------------------------------------------------

export function sortReportsByDateDesc(reports: HealthReport[]): HealthReport[] {
  return [...reports].sort((a, b) => b.reportDate.localeCompare(a.reportDate))
}

function sortReportsByDateAsc(reports: HealthReport[]): HealthReport[] {
  return [...reports].sort((a, b) => a.reportDate.localeCompare(b.reportDate))
}

/** One-line summary for a list row (FR-09.11): weight, PBF, SMM, InBody score. */
export function formatReportSummary(report: HealthReport): string {
  const parts: string[] = []
  if (report.composition.totalWeightKg !== undefined) {
    parts.push(`${report.composition.totalWeightKg}kg`)
  }
  if (report.obesity.pbf !== undefined) parts.push(`PBF ${report.obesity.pbf}%`)
  if (report.muscleFat.skeletalMuscleMassKg !== undefined) {
    parts.push(`SMM ${report.muscleFat.skeletalMuscleMassKg}kg`)
  }
  if (report.score !== undefined) parts.push(`Score ${report.score}`)
  return parts.length > 0 ? parts.join(' · ') : 'No measurements recorded'
}

export type TrendMetricKey = 'totalWeightKg' | 'pbf' | 'skeletalMuscleMassKg' | 'visceralFatLevel'

export interface TrendMetricDef {
  key: TrendMetricKey
  label: string
  unit: string
  getValue: (report: HealthReport) => number | undefined
}

/** The 4 key metrics tracked as trends (FR-09.13/AC-09.9). */
export const TREND_METRICS: TrendMetricDef[] = [
  {
    key: 'totalWeightKg',
    label: 'Weight',
    unit: 'kg',
    getValue: (report) => report.composition.totalWeightKg,
  },
  {
    key: 'pbf',
    label: 'Body Fat %',
    unit: '%',
    getValue: (report) => report.obesity.pbf,
  },
  {
    key: 'skeletalMuscleMassKg',
    label: 'Muscle Mass',
    unit: 'kg',
    getValue: (report) => report.muscleFat.skeletalMuscleMassKg,
  },
  {
    key: 'visceralFatLevel',
    label: 'Visceral Fat',
    unit: '',
    getValue: (report) => report.visceralFatLevel,
  },
]

export interface TrendSeries {
  /** Chronological values (oldest → newest) with data for this metric, for a sparkline. */
  points: number[]
  current?: number
  /** `current - previous`, rounded to 1 decimal; `undefined` with fewer than 2 data points. */
  delta?: number
}

/** Builds the sparkline points + latest value + delta-vs-previous for one metric. */
export function getTrendSeries(reports: HealthReport[], metric: TrendMetricDef): TrendSeries {
  const chronological = sortReportsByDateAsc(reports)
  const points = chronological
    .map(metric.getValue)
    .filter((value): value is number => value !== undefined)
  const current = points.at(-1)
  const previous = points.length >= 2 ? points.at(-2) : undefined
  const delta =
    current !== undefined && previous !== undefined ? round1(current - previous) : undefined
  return { points, current, delta }
}
