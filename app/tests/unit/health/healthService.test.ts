import { describe, expect, it } from 'vitest'
import type { HealthReport } from '../../../src/lib/domain'
import {
  calculateBmi,
  calculateFatFreeMass,
  calculatePbf,
  calculateTotalWeight,
  emptySegmentalForm,
  formatControlValue,
  formatReportSummary,
  getTrendSeries,
  isProfileIncomplete,
  isValidNonNegative,
  parseOptionalNumber,
  segmentalFormToInput,
  segmentalMassValues,
  segmentalToFormValue,
  sortReportsByDateDesc,
  TREND_METRICS,
  whrRangeHint,
} from '../../../src/features/health/healthService'

function makeReport(overrides: Partial<HealthReport> = {}): HealthReport {
  return {
    id: overrides.id ?? 'r1',
    reportDate: overrides.reportDate ?? '2026-07-01',
    composition: {},
    muscleFat: {},
    obesity: {},
    targets: {},
    research: {},
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('parseOptionalNumber', () => {
  it('returns undefined for blank/invalid input', () => {
    expect(parseOptionalNumber('')).toBeUndefined()
    expect(parseOptionalNumber('   ')).toBeUndefined()
    expect(parseOptionalNumber('abc')).toBeUndefined()
  })

  it('parses a valid number', () => {
    expect(parseOptionalNumber('72.19')).toBe(72.19)
    expect(parseOptionalNumber('-10.8')).toBe(-10.8)
  })
})

describe('isValidNonNegative (FR-09.5)', () => {
  it('allows blank (optional field)', () => {
    expect(isValidNonNegative('')).toBe(true)
  })

  it('allows zero and positive numbers', () => {
    expect(isValidNonNegative('0')).toBe(true)
    expect(isValidNonNegative('22.8')).toBe(true)
  })

  it('rejects negative numbers and non-numeric input', () => {
    expect(isValidNonNegative('-1')).toBe(false)
    expect(isValidNonNegative('abc')).toBe(false)
  })
})

describe('calculateBmi / calculatePbf (FR-09.7 auto-fill suggestions)', () => {
  it('computes BMI from height + weight', () => {
    expect(calculateBmi(175, 72.19)).toBeCloseTo(23.6, 1)
  })

  it('returns undefined when height or weight is missing/invalid', () => {
    expect(calculateBmi(undefined, 72)).toBeUndefined()
    expect(calculateBmi(175, undefined)).toBeUndefined()
    expect(calculateBmi(0, 72)).toBeUndefined()
  })

  it('computes PBF from body fat mass / total weight', () => {
    expect(calculatePbf(19.9, 72.19)).toBeCloseTo(27.6, 1)
  })

  it('returns undefined when inputs are missing/invalid', () => {
    expect(calculatePbf(undefined, 72)).toBeUndefined()
    expect(calculatePbf(19.9, 0)).toBeUndefined()
  })
})

describe('calculateTotalWeight / calculateFatFreeMass (FR-09.7, notes.md auto-calc request)', () => {
  it('sums all 4 Composition fields for Total Weight, matching the InBody sheet example', () => {
    expect(calculateTotalWeight(36, 9.8, 3.59, 22.8)).toBeCloseTo(72.19, 1)
  })

  it('Total Weight is undefined unless all 4 inputs are present', () => {
    expect(calculateTotalWeight(36, 9.8, 3.59, undefined)).toBeUndefined()
    expect(calculateTotalWeight(undefined, undefined, undefined, undefined)).toBeUndefined()
  })

  it('sums the first 3 Composition fields for Fat Free Mass, matching the InBody sheet example', () => {
    expect(calculateFatFreeMass(36, 9.8, 3.59)).toBeCloseTo(49.4, 1)
  })

  it('Fat Free Mass is undefined unless all 3 inputs are present', () => {
    expect(calculateFatFreeMass(36, 9.8, undefined)).toBeUndefined()
  })
})

describe('isProfileIncomplete (FR-09.1/FR-09.2)', () => {
  it('is true when any required field is missing', () => {
    expect(isProfileIncomplete({})).toBe(true)
    expect(
      isProfileIncomplete({ birthday: '1990-01-01', heightCm: 175 }),
    ).toBe(true)
  })

  it('is false when birthday/heightCm/gender are all present', () => {
    expect(
      isProfileIncomplete({
        birthday: '1990-01-01',
        heightCm: 175,
        gender: 'male',
      }),
    ).toBe(false)
  })
})

describe('segmental form <-> domain conversion', () => {
  it('emptySegmentalForm has all 5 parts blank', () => {
    const form = emptySegmentalForm()
    expect(segmentalMassValues(form)).toEqual(['', '', '', '', ''])
  })

  it('segmentalFormToInput returns undefined when nothing was entered', () => {
    expect(segmentalFormToInput(emptySegmentalForm())).toBeUndefined()
  })

  it('round-trips a partially-filled segmental (FR-09.4 partial saves)', () => {
    const form = emptySegmentalForm()
    form.leftArm.mass = '2.63'
    form.leftArm.rating = 'normal'
    const input = segmentalFormToInput(form)
    expect(input).toEqual({
      leftArm: { mass: 2.63, rating: 'normal' },
      rightArm: {},
      leftLeg: {},
      rightLeg: {},
      torso: {},
    })
    const roundTripped = segmentalToFormValue(input)
    expect(roundTripped.leftArm).toEqual({ mass: '2.63', rating: 'normal' })
    expect(roundTripped.rightArm).toEqual({ mass: '', rating: '' })
  })
})

describe('sortReportsByDateDesc / formatReportSummary (FR-09.11)', () => {
  it('sorts newest first without mutating the input', () => {
    const reports = [
      makeReport({ id: 'a', reportDate: '2026-06-01' }),
      makeReport({ id: 'b', reportDate: '2026-08-01' }),
      makeReport({ id: 'c', reportDate: '2026-07-01' }),
    ]
    const sorted = sortReportsByDateDesc(reports)
    expect(sorted.map((r) => r.id)).toEqual(['b', 'c', 'a'])
    expect(reports.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('summarizes weight/PBF/SMM/score, omitting missing fields', () => {
    const report = makeReport({
      composition: { totalWeightKg: 72.19 },
      obesity: { pbf: 27.6 },
      muscleFat: { skeletalMuscleMassKg: 22.8 },
      score: 64,
    })
    expect(formatReportSummary(report)).toBe(
      '72.19kg · PBF 27.6% · SMM 22.8kg · Score 64',
    )
  })

  it('shows a placeholder when a report has no measurements', () => {
    expect(formatReportSummary(makeReport())).toBe('No measurements recorded')
  })
})

describe('getTrendSeries (FR-09.13/AC-09.9)', () => {
  const weightMetric = TREND_METRICS.find((m) => m.key === 'totalWeightKg')!

  it('builds chronological points and a delta vs. the previous report', () => {
    const reports = [
      makeReport({ id: 'a', reportDate: '2026-07-01', composition: { totalWeightKg: 74 } }),
      makeReport({ id: 'b', reportDate: '2026-06-01', composition: { totalWeightKg: 76 } }),
      makeReport({ id: 'c', reportDate: '2026-08-01', composition: { totalWeightKg: 72.19 } }),
    ]
    const series = getTrendSeries(reports, weightMetric)
    expect(series.points).toEqual([76, 74, 72.19])
    expect(series.current).toBe(72.19)
    // delta is rounded to 1 decimal (matches the InBody sheet's own display precision)
    expect(series.delta).toBe(-1.8)
  })

  it('skips reports missing that metric', () => {
    const reports = [
      makeReport({ reportDate: '2026-06-01', composition: {} }),
      makeReport({ reportDate: '2026-07-01', composition: { totalWeightKg: 70 } }),
    ]
    const series = getTrendSeries(reports, weightMetric)
    expect(series.points).toEqual([70])
    expect(series.delta).toBeUndefined()
  })

  it('has no delta with fewer than 2 data points', () => {
    const series = getTrendSeries([], weightMetric)
    expect(series.points).toEqual([])
    expect(series.current).toBeUndefined()
    expect(series.delta).toBeUndefined()
  })
})

describe('whrRangeHint (FR-09.6, gender-specific WHR guidance)', () => {
  it('uses the male cut-off (WHO/Healthline: 0.90) for male', () => {
    expect(whrRangeHint('male')).toBe('Normal: below 0.9')
  })

  it('uses the female cut-off (WHO/Healthline: 0.85) for female', () => {
    expect(whrRangeHint('female')).toBe('Normal: below 0.85')
  })

  it('falls back to the generic range for other/unset gender', () => {
    expect(whrRangeHint('other')).toContain('0.8–0.9')
    expect(whrRangeHint(undefined)).toContain('0.8–0.9')
  })
})

describe('formatControlValue (Notes for Improvement.md: Add/Drop phrasing)', () => {
  it('formats a positive value as Add', () => {
    expect(formatControlValue(2.3)).toBe('Add 2.3kg')
  })

  it('formats a negative value as Drop, using the absolute magnitude', () => {
    expect(formatControlValue(-1.5)).toBe('Drop 1.5kg')
  })

  it('formats zero as On target', () => {
    expect(formatControlValue(0)).toBe('On target')
  })

  it('formats undefined as an em dash', () => {
    expect(formatControlValue(undefined)).toBe('—')
  })
})
