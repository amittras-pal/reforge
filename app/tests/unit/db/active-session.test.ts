import { beforeEach, describe, expect, it } from 'vitest'
import {
  db,
  activeSessionRepo,
  NotFoundError,
  type ActiveSessionInput,
} from '../../../src/lib/db'
import { ACTIVE_SESSION_ID } from '../../../src/lib/domain'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

function makeSessionInput(): ActiveSessionInput {
  return {
    date: '2026-07-08',
    weekday: 3,
    routineId: 'routine-1',
    routineNameSnapshot: 'Lower Body A',
    startedAt: '2026-07-08T05:00:00.000Z',
    items: [],
  }
}

describe('activeSessionRepo (FR-03.7, OQ-03.1)', () => {
  it('getCurrent returns undefined when no session is active', async () => {
    expect(await activeSessionRepo.getCurrent()).toBeUndefined()
  })

  it('start creates the singleton session with the well-known id', async () => {
    const session = await activeSessionRepo.start(makeSessionInput())
    expect(session.id).toBe(ACTIVE_SESSION_ID)
    expect(await db.activeSession.count()).toBe(1)
  })

  it('starting a new session replaces any previous draft (at most one at a time)', async () => {
    await activeSessionRepo.start(makeSessionInput())
    await activeSessionRepo.start({
      ...makeSessionInput(),
      routineId: 'routine-2',
    })
    expect(await db.activeSession.count()).toBe(1)
    expect((await activeSessionRepo.getCurrent())?.routineId).toBe('routine-2')
  })

  it('patch merges partial updates and bumps updatedAt', async () => {
    const started = await activeSessionRepo.start(makeSessionInput())
    await new Promise((resolve) => setTimeout(resolve, 5))
    const patched = await activeSessionRepo.patch({
      routineNameSnapshot: 'Lower Body B',
    })
    expect(patched.routineNameSnapshot).toBe('Lower Body B')
    expect(patched.routineId).toBe(started.routineId)
    expect(patched.updatedAt).not.toBe(started.updatedAt)
  })

  it('patch throws NotFoundError when there is no active session', async () => {
    await expect(
      activeSessionRepo.patch({ routineNameSnapshot: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('clear removes the active session', async () => {
    await activeSessionRepo.start(makeSessionInput())
    await activeSessionRepo.clear()
    expect(await activeSessionRepo.getCurrent()).toBeUndefined()
  })
})
