import type { ISODateTime, LocalDate, Weekday } from '../domain'

/**
 * Date/time conventions (FR-00.6, FR-00.7).
 *
 * - Calendar dates are stored as local `YYYY-MM-DD` strings (`LocalDate`).
 * - Timestamps are ISO-8601 UTC strings (`ISODateTime`).
 * - Weekdays follow `Date.getDay()` semantics: 0=Sunday … 6=Saturday.
 */

/** Current instant as an ISO-8601 UTC timestamp. */
export function nowIso(): ISODateTime {
  return new Date().toISOString()
}

/** Formats a `Date` as a local `YYYY-MM-DD` string (local time, not UTC — avoids off-by-one-day bugs). */
export function toLocalDate(date: Date): LocalDate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today as a local `YYYY-MM-DD` string. */
export function todayLocalDate(): LocalDate {
  return toLocalDate(new Date())
}

/** Adds (or subtracts, for negative `days`) whole days to a `LocalDate`, in local time. */
export function addDays(localDate: LocalDate, days: number): LocalDate {
  const [year, month, day] = localDate.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return toLocalDate(date)
}

/** Yesterday as a local `YYYY-MM-DD` string — the only permitted back-date for a session (FR-07.20). */
export function yesterdayLocalDate(): LocalDate {
  return addDays(todayLocalDate(), -1)
}

/** Whole seconds elapsed between two ISO-8601 timestamps (`b - a`), floored at 0. */
export function secondsBetween(a: ISODateTime, b: ISODateTime): number {
  const diffMs = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(0, Math.round(diffMs / 1000))
}

/** Weekday of a `Date`, using `Date.getDay()` semantics (0=Sunday … 6=Saturday). */
export function weekdayOf(date: Date): Weekday {
  return date.getDay() as Weekday
}

/**
 * Weekday of a `LocalDate` string. Parses the date as local time (not UTC) so the result
 * matches the calendar day a user actually sees, regardless of timezone offset.
 */
export function weekdayFromLocalDate(localDate: LocalDate): Weekday {
  const [year, month, day] = localDate.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  return new Date(year, month - 1, day).getDay() as Weekday
}

/** Weekday labels, index-aligned to `Date.getDay()` (0=Sunday … 6=Saturday). */
export const WEEKDAY_LABELS: readonly string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

/**
 * Current age in whole years derived from a `birthday`, as of `onDate` (default today) —
 * age is never stored, only derived at display time (FR-00.18).
 */
export function ageFromBirthday(
  birthday: LocalDate,
  onDate: LocalDate = todayLocalDate(),
): number {
  const [birthYear, birthMonth, birthDay] = birthday.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const [onYear, onMonth, onDay] = onDate.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  let age = onYear - birthYear
  if (onMonth < birthMonth || (onMonth === birthMonth && onDay < birthDay)) {
    age -= 1
  }
  return age
}
