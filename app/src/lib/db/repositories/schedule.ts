import type { ScheduleDay, UUID, Weekday } from '../../domain'
import { InvariantError, toRepositoryError } from '../errors'
import { db } from '../database'

async function getWeek(): Promise<ScheduleDay[]> {
  return db.schedule.orderBy('weekday').toArray()
}

async function getDay(weekday: Weekday): Promise<ScheduleDay | undefined> {
  return db.schedule.get(weekday)
}

async function setDay(
  weekday: Weekday,
  routineIds: UUID[],
): Promise<ScheduleDay> {
  try {
    return await db.transaction('rw', db.schedule, db.routines, async () => {
      const uniqueIds = [...new Set(routineIds)]
      if (uniqueIds.length > 0) {
        const found = await db.routines.where('id').anyOf(uniqueIds).toArray()
        if (found.length !== uniqueIds.length) {
          const foundIds = new Set(found.map((routine) => routine.id))
          const missing = uniqueIds.filter((id) => !foundIds.has(id))
          throw new InvariantError(
            `Unknown routine id(s) for weekday ${weekday}: ${missing.join(', ')}`,
          )
        }
      }
      const existing = await db.schedule.get(weekday)
      const day: ScheduleDay = { weekday, routineIds, label: existing?.label }
      await db.schedule.put(day)
      return day
    })
  } catch (err) {
    throw toRepositoryError(err)
  }
}

/** Repository for the `schedule` store (FR-03.7). Exactly 7 records (weekday 0..6), seeded by F-03. */
export const scheduleRepo = { getWeek, getDay, setDay }
