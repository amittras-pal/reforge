import { beforeEach, describe, expect, it } from 'vitest'
import {
  db,
  sessionLogsRepo,
  NotFoundError,
  type SessionLogInput,
} from '../../../src/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

function makeLogInput(date: string): SessionLogInput {
  return {
    date,
    weekday: 3,
    routineId: 'routine-1',
    routineNameSnapshot: 'Lower Body A',
    status: 'completed',
    startedAt: '2026-07-08T05:00:00.000Z',
    completedAt: '2026-07-08T06:00:00.000Z',
    items: [],
  }
}

describe('sessionLogsRepo (FR-03.7, FR-00.10)', () => {
  it('creates a log with an auto id/createdAt', async () => {
    const log = await sessionLogsRepo.create(makeLogInput('2026-07-08'))
    expect(log.id).toBeTruthy()
    expect(log.createdAt).toBeTruthy()
  })

  it('getByDate returns all logs for that date', async () => {
    await sessionLogsRepo.create(makeLogInput('2026-07-08'))
    await sessionLogsRepo.create(makeLogInput('2026-07-08'))
    await sessionLogsRepo.create(makeLogInput('2026-07-09'))
    expect(await sessionLogsRepo.getByDate('2026-07-08')).toHaveLength(2)
  })

  it('list supports a date range filter', async () => {
    await sessionLogsRepo.create(makeLogInput('2026-07-01'))
    await sessionLogsRepo.create(makeLogInput('2026-07-08'))
    await sessionLogsRepo.create(makeLogInput('2026-07-15'))
    const inRange = await sessionLogsRepo.list({
      from: '2026-07-05',
      to: '2026-07-10',
    })
    expect(inRange.map((log) => log.date)).toEqual(['2026-07-08'])
  })

  it('updateNotes only touches notes, and throws NotFoundError for a missing id', async () => {
    const log = await sessionLogsRepo.create(makeLogInput('2026-07-08'))
    const updated = await sessionLogsRepo.updateNotes(
      log.id,
      'Felt strong today',
    )
    expect(updated.notes).toBe('Felt strong today')
    expect(updated.startedAt).toBe(log.startedAt)

    await expect(
      sessionLogsRepo.updateNotes('missing', 'x'),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('remove deletes the log', async () => {
    const log = await sessionLogsRepo.create(makeLogInput('2026-07-08'))
    await sessionLogsRepo.remove(log.id)
    expect(await sessionLogsRepo.get(log.id)).toBeUndefined()
  })
})
