import type { ActiveSession } from '../../domain'
import { ACTIVE_SESSION_ID } from '../../domain'
import { nowIso } from '../../utils'
import { NotFoundError, toRepositoryError } from '../errors'
import { db } from '../database'

export type ActiveSessionInput = Omit<ActiveSession, 'id' | 'updatedAt'>
export type ActiveSessionPatch = Partial<Omit<ActiveSession, 'id'>>

async function getCurrent(): Promise<ActiveSession | undefined> {
  return db.activeSession.get(ACTIVE_SESSION_ID)
}

/** Starts a new active session, replacing any previous draft — at most one exists (OQ-03.1). */
async function start(input: ActiveSessionInput): Promise<ActiveSession> {
  const session: ActiveSession = {
    ...input,
    id: ACTIVE_SESSION_ID,
    updatedAt: nowIso(),
  }
  try {
    await db.activeSession.put(session)
  } catch (err) {
    throw toRepositoryError(err)
  }
  return session
}

async function patch(partial: ActiveSessionPatch): Promise<ActiveSession> {
  try {
    const count = await db.activeSession.update(ACTIVE_SESSION_ID, {
      ...partial,
      updatedAt: nowIso(),
    })
    if (count === 0) throw new NotFoundError('No active session to update')
    const updated = await db.activeSession.get(ACTIVE_SESSION_ID)
    if (!updated) throw new NotFoundError('No active session to update')
    return updated
  } catch (err) {
    throw toRepositoryError(err)
  }
}

async function clear(): Promise<void> {
  await db.activeSession.delete(ACTIVE_SESSION_ID)
}

/** Repository for the singleton `activeSession` record (FR-03.7, OQ-03.1). */
export const activeSessionRepo = { getCurrent, start, patch, clear }
