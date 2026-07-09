import type { LocalDate, SessionLog, UUID } from '../../domain'
import { createId, nowIso } from '../../utils'
import { NotFoundError, toRepositoryError } from '../errors'
import { db } from '../database'

export interface SessionLogRange {
  from?: LocalDate
  to?: LocalDate
}

export type SessionLogInput = Omit<SessionLog, 'id' | 'createdAt'>

async function list(range?: SessionLogRange): Promise<SessionLog[]> {
  const all = await db.sessionLogs.orderBy('date').toArray()
  return all.filter((log) => {
    if (range?.from !== undefined && log.date < range.from) return false
    if (range?.to !== undefined && log.date > range.to) return false
    return true
  })
}

async function get(id: UUID): Promise<SessionLog | undefined> {
  return db.sessionLogs.get(id)
}

async function getByDate(date: LocalDate): Promise<SessionLog[]> {
  return db.sessionLogs.where('date').equals(date).toArray()
}

async function create(input: SessionLogInput): Promise<SessionLog> {
  const log: SessionLog = { ...input, id: createId(), createdAt: nowIso() }
  try {
    await db.sessionLogs.add(log)
  } catch (err) {
    throw toRepositoryError(err)
  }
  return log
}

/** Session logs are immutable once completed except for `notes` (FR-00.10). */
async function updateNotes(id: UUID, notes: string): Promise<SessionLog> {
  try {
    const count = await db.sessionLogs.update(id, { notes })
    if (count === 0) throw new NotFoundError(`Session log not found: ${id}`)
    const updated = await db.sessionLogs.get(id)
    if (!updated) throw new NotFoundError(`Session log not found: ${id}`)
    return updated
  } catch (err) {
    throw toRepositoryError(err)
  }
}

/**
 * The only two fields editable after a session is saved (F-08 FR-08.10 extends FR-00.10's
 * notes-only rule to also allow fixing the subjective RPE rating). Everything else
 * (items/status/timestamps/etc.) is read-only history.
 */
export type SessionLogEditablePatch = Partial<Pick<SessionLog, 'notes' | 'rpe'>>

async function updateEditableFields(
  id: UUID,
  patch: SessionLogEditablePatch,
): Promise<SessionLog> {
  try {
    const count = await db.sessionLogs.update(id, patch)
    if (count === 0) throw new NotFoundError(`Session log not found: ${id}`)
    const updated = await db.sessionLogs.get(id)
    if (!updated) throw new NotFoundError(`Session log not found: ${id}`)
    return updated
  } catch (err) {
    throw toRepositoryError(err)
  }
}

async function remove(id: UUID): Promise<void> {
  await db.sessionLogs.delete(id)
}

/** Repository for the `sessionLogs` store (FR-03.7, FR-08.10). */
export const sessionLogsRepo = {
  list,
  get,
  getByDate,
  create,
  updateNotes,
  updateEditableFields,
  remove,
}
