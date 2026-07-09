import type { LocalDate, SessionLog, UUID, Weekday } from '../../lib/domain'
import {
  type SessionLogEditablePatch,
  sessionLogsRepo,
} from '../../lib/db'
import {
  addDays,
  todayLocalDate,
  toLocalDate,
  weekdayFromLocalDate,
  yesterdayLocalDate,
} from '../../lib/utils'

export interface DateRange {
  from: LocalDate
  to: LocalDate
}

/** One cell in the month grid (FR-08.4) — may belong to the previous/next month as padding. */
export interface CalendarCell {
  date: LocalDate
  weekday: Weekday
  inCurrentMonth: boolean
  isToday: boolean
}

/**
 * Builds a full-weeks grid for `month` (1-12) of `year`, respecting `weekStartsOn` (FR-00.7).
 * Includes leading/trailing days from adjacent months so every row has all 7 weekdays.
 */
export function getMonthGrid(
  year: number,
  month: number,
  weekStartsOn: Weekday,
): CalendarCell[] {
  const firstOfMonth = new Date(year, month - 1, 1)
  const firstWeekday = firstOfMonth.getDay() as Weekday
  const leadingDays = (firstWeekday - weekStartsOn + 7) % 7
  const gridStart = new Date(year, month - 1, 1 - leadingDays)

  const daysInMonth = new Date(year, month, 0).getDate()
  const totalCellsNeeded = leadingDays + daysInMonth
  const totalRows = Math.ceil(totalCellsNeeded / 7)
  const totalCells = totalRows * 7

  const today = todayLocalDate()
  const cells: CalendarCell[] = []
  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(gridStart)
    cellDate.setDate(gridStart.getDate() + i)
    const dateStr = toLocalDate(cellDate)
    cells.push({
      date: dateStr,
      weekday: cellDate.getDay() as Weekday,
      inCurrentMonth: cellDate.getMonth() === month - 1,
      isToday: dateStr === today,
    })
  }
  return cells
}

/** The 7-day range containing `referenceDate` (default today), respecting `weekStartsOn`. */
export function currentWeekRange(
  weekStartsOn: Weekday,
  referenceDate: LocalDate = todayLocalDate(),
): DateRange {
  const refWeekday = weekdayFromLocalDate(referenceDate)
  const daysSinceStart = (refWeekday - weekStartsOn + 7) % 7
  const from = addDays(referenceDate, -daysSinceStart)
  const to = addDays(from, 6)
  return { from, to }
}

/** The calendar-month range containing `referenceDate` (default today). */
export function currentMonthRange(referenceDate: LocalDate = todayLocalDate()): DateRange {
  const [year, month] = referenceDate.split('-').map(Number) as [number, number]
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

/** Whether `date` is eligible for "Log session" (FR-08.14): only today or yesterday. */
export function isLoggableDate(date: LocalDate): boolean {
  return date === todayLocalDate() || date === yesterdayLocalDate()
}

export async function getSessionsInRange(range: DateRange): Promise<SessionLog[]> {
  return sessionLogsRepo.list(range)
}

export async function getSessionsForDate(date: LocalDate): Promise<SessionLog[]> {
  return sessionLogsRepo.getByDate(date)
}

/** Editable-fields save for a saved session (FR-08.10) — only `notes`/`rpe`, everything else read-only. */
export async function updateSessionFields(
  id: UUID,
  patch: SessionLogEditablePatch,
): Promise<SessionLog> {
  return sessionLogsRepo.updateEditableFields(id, patch)
}

/** Deletes a session log only (FR-08.11/FR-08.13) — never touches exercises/routines. */
export async function deleteSession(id: UUID): Promise<void> {
  await sessionLogsRepo.remove(id)
}
