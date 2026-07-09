import { beforeEach, describe, expect, it } from 'vitest'
import { db, sessionLogsRepo, type SessionLogInput } from '../../../src/lib/db'
import { addDays, todayLocalDate, yesterdayLocalDate } from '../../../src/lib/utils'
import {
  currentMonthRange,
  currentWeekRange,
  deleteSession,
  getMonthGrid,
  getSessionsForDate,
  getSessionsInRange,
  isLoggableDate,
  updateSessionFields,
} from '../../../src/features/recorder/recorderService'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

function makeLogInput(date: string, overrides: Partial<SessionLogInput> = {}): SessionLogInput {
  return {
    date,
    weekday: 4,
    routineId: 'r1',
    routineNameSnapshot: 'Lower Body A',
    status: 'completed',
    startedAt: `${date}T10:00:00.000Z`,
    completedAt: `${date}T11:00:00.000Z`,
    items: [],
    ...overrides,
  }
}

describe('getMonthGrid (FR-08.4)', () => {
  it('returns a multiple of 7 cells covering the whole month', () => {
    const grid = getMonthGrid(2026, 7, 0)
    expect(grid.length % 7).toBe(0)
    const inMonth = grid.filter((c) => c.inCurrentMonth)
    expect(inMonth).toHaveLength(31) // July has 31 days
  })

  it('starts the grid on weekStartsOn and pads with adjacent-month days', () => {
    // July 2026 starts on a Wednesday (weekday 3).
    const grid = getMonthGrid(2026, 7, 0) // week starts Sunday
    expect(grid[0]?.weekday).toBe(0)
    expect(grid[0]?.inCurrentMonth).toBe(false) // padding from June
    const firstOfMonth = grid.find((c) => c.date === '2026-07-01')
    expect(firstOfMonth?.weekday).toBe(3)
  })

  it('respects a non-Sunday weekStartsOn', () => {
    const grid = getMonthGrid(2026, 7, 1) // week starts Monday
    expect(grid[0]?.weekday).toBe(1)
  })

  it('flags isToday correctly for the real today', () => {
    const today = todayLocalDate()
    const [year, month] = today.split('-').map(Number) as [number, number]
    const grid = getMonthGrid(year, month, 0)
    const todayCell = grid.find((c) => c.date === today)
    expect(todayCell?.isToday).toBe(true)
    const otherCells = grid.filter((c) => c.date !== today)
    expect(otherCells.every((c) => !c.isToday)).toBe(true)
  })
})

describe('currentWeekRange', () => {
  it('returns a 7-day range starting on weekStartsOn', () => {
    // 2026-07-09 is a Thursday (weekday 4).
    const range = currentWeekRange(0, '2026-07-09')
    expect(range.from).toBe('2026-07-05') // preceding Sunday
    expect(range.to).toBe('2026-07-11') // following Saturday
  })

  it('respects a Monday weekStartsOn', () => {
    const range = currentWeekRange(1, '2026-07-09')
    expect(range.from).toBe('2026-07-06') // preceding Monday
    expect(range.to).toBe('2026-07-12')
  })
})

describe('currentMonthRange', () => {
  it('returns the first and last day of the month', () => {
    const range = currentMonthRange('2026-07-09')
    expect(range).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })

  it('handles a leap-year February', () => {
    const range = currentMonthRange('2028-02-15')
    expect(range).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
})

describe('isLoggableDate (FR-08.14)', () => {
  it('is true for today and yesterday, false otherwise', () => {
    expect(isLoggableDate(todayLocalDate())).toBe(true)
    expect(isLoggableDate(yesterdayLocalDate())).toBe(true)
    expect(isLoggableDate(addDays(todayLocalDate(), -2))).toBe(false)
    expect(isLoggableDate(addDays(todayLocalDate(), 1))).toBe(false)
  })
})

describe('session queries and mutations (FR-08.1, FR-08.10, FR-08.11)', () => {
  it('getSessionsForDate/getSessionsInRange find created logs', async () => {
    await sessionLogsRepo.create(makeLogInput('2026-07-09'))
    await sessionLogsRepo.create(makeLogInput('2026-07-10'))

    expect(await getSessionsForDate('2026-07-09')).toHaveLength(1)
    expect(await getSessionsInRange({ from: '2026-07-09', to: '2026-07-10' })).toHaveLength(2)
  })

  it('updateSessionFields edits notes and rpe only', async () => {
    const log = await sessionLogsRepo.create(makeLogInput('2026-07-09'))
    const updated = await updateSessionFields(log.id, { notes: 'Great session', rpe: 8 })
    expect(updated.notes).toBe('Great session')
    expect(updated.rpe).toBe(8)
    expect(updated.status).toBe('completed') // untouched
  })

  it('deleteSession removes only that log', async () => {
    const log1 = await sessionLogsRepo.create(makeLogInput('2026-07-09'))
    const log2 = await sessionLogsRepo.create(makeLogInput('2026-07-10'))
    await deleteSession(log1.id)
    const remaining = await sessionLogsRepo.list()
    expect(remaining.map((l) => l.id)).toEqual([log2.id])
  })
})
