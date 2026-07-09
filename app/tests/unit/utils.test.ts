import { describe, expect, it } from 'vitest'
import { createId } from '../../src/lib/utils/ids'
import { formatBytes, formatDuration } from '../../src/lib/utils/format'
import {
  ageFromBirthday,
  todayLocalDate,
  weekdayFromLocalDate,
} from '../../src/lib/utils/dates'

describe('createId', () => {
  it('creates unique UUID v4 strings', () => {
    const a = createId()
    const b = createId()
    expect(a).not.toBe(b)
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })
})

describe('formatDuration', () => {
  it('formats sub-hour durations as m:ss', () => {
    expect(formatDuration(90)).toBe('1:30')
  })

  it('formats hour-plus durations as h:mm', () => {
    expect(formatDuration(3900)).toBe('1:05')
  })
})

describe('formatBytes (FR-04.12)', () => {
  it('formats zero/negative/non-finite as "0 B"', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(-5)).toBe('0 B')
    expect(formatBytes(NaN)).toBe('0 B')
  })

  it('formats bytes with no decimals', () => {
    expect(formatBytes(500)).toBe('500 B')
  })

  it('formats KB/MB/GB with one decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB')
    expect(formatBytes(1024 * 1024 * 1024 * 3)).toBe('3.0 GB')
  })
})

describe('dates', () => {
  it('formats today as YYYY-MM-DD', () => {
    expect(todayLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('derives the correct weekday from a local date (0=Sunday … 6=Saturday)', () => {
    // 2026-07-08 is a Wednesday
    expect(weekdayFromLocalDate('2026-07-08')).toBe(3)
  })
})

describe('ageFromBirthday (FR-00.18)', () => {
  it('computes age when the birthday has already occurred this year', () => {
    expect(ageFromBirthday('1990-01-01', '2026-07-08')).toBe(36)
  })

  it("computes age when the birthday hasn't occurred yet this year", () => {
    expect(ageFromBirthday('1990-12-31', '2026-07-08')).toBe(35)
  })

  it('handles a birthday exactly on the reference date', () => {
    expect(ageFromBirthday('1990-07-08', '2026-07-08')).toBe(36)
  })
})
