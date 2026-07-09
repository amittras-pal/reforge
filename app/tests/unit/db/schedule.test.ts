import { beforeEach, describe, expect, it } from 'vitest'
import {
  db,
  routinesRepo,
  scheduleRepo,
  InvariantError,
} from '../../../src/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('scheduleRepo (FR-03.7, FR-03.12)', () => {
  it('getWeek returns exactly 7 days ordered by weekday, empty by default', async () => {
    const week = await scheduleRepo.getWeek()
    expect(week).toHaveLength(7)
    expect(week.map((day) => day.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('setDay assigns routines for a given weekday', async () => {
    const routine = await routinesRepo.create({
      name: 'Lower Body A',
      items: [],
    })
    const day = await scheduleRepo.setDay(1, [routine.id])
    expect(day.routineIds).toEqual([routine.id])
    expect((await scheduleRepo.getDay(1))?.routineIds).toEqual([routine.id])
  })

  it('rejects an unknown routine id and leaves the day unchanged (AC-03.5)', async () => {
    const before = await scheduleRepo.getDay(2)
    await expect(
      scheduleRepo.setDay(2, ['does-not-exist']),
    ).rejects.toBeInstanceOf(InvariantError)
    expect(await scheduleRepo.getDay(2)).toEqual(before)
  })

  it('setDay(weekday, []) clears a day back to a rest day', async () => {
    const routine = await routinesRepo.create({
      name: 'Lower Body A',
      items: [],
    })
    await scheduleRepo.setDay(3, [routine.id])
    await scheduleRepo.setDay(3, [])
    expect((await scheduleRepo.getDay(3))?.routineIds).toEqual([])
  })
})
