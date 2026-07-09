import type { Routine, RoutineItem, UUID } from '../../domain'
import { ACTIVE_SESSION_ID } from '../../domain'
import { nowIso } from '../../utils'
import { InvariantError, NotFoundError, toRepositoryError } from '../errors'
import { withCreateMeta, withUpdateMeta } from '../helpers'
import { db } from '../database'

export interface RoutineFilter {
  isArchived?: boolean
}

export type RoutineInput = Omit<
  Routine,
  'id' | 'createdAt' | 'updatedAt' | 'isArchived'
> & {
  isArchived?: boolean
}

export type RoutinePatch = Partial<
  Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>
>

/** Throws `InvariantError` if any id doesn't resolve to an existing exercise (FR-03.12). */
async function assertExercisesExist(exerciseIds: UUID[]): Promise<void> {
  const uniqueIds = [...new Set(exerciseIds)]
  if (uniqueIds.length === 0) return
  const found = await db.exercises.where('id').anyOf(uniqueIds).toArray()
  if (found.length !== uniqueIds.length) {
    const foundIds = new Set(found.map((exercise) => exercise.id))
    const missing = uniqueIds.filter((id) => !foundIds.has(id))
    throw new InvariantError(`Unknown exercise id(s): ${missing.join(', ')}`)
  }
}

async function list(filter?: RoutineFilter): Promise<Routine[]> {
  const all = await db.routines.orderBy('name').toArray()
  if (filter?.isArchived === undefined) return all
  return all.filter((routine) => routine.isArchived === filter.isArchived)
}

async function get(id: UUID): Promise<Routine | undefined> {
  return db.routines.get(id)
}

async function create(input: RoutineInput): Promise<Routine> {
  try {
    return await db.transaction('rw', db.routines, db.exercises, async () => {
      await assertExercisesExist(input.items.map((item) => item.exerciseId))
      const routine: Routine = {
        ...input,
        isArchived: input.isArchived ?? false,
        ...withCreateMeta(),
      }
      await db.routines.add(routine)
      return routine
    })
  } catch (err) {
    throw toRepositoryError(err)
  }
}

async function update(id: UUID, patch: RoutinePatch): Promise<Routine> {
  try {
    return await db.transaction('rw', db.routines, db.exercises, async () => {
      if (patch.items) {
        await assertExercisesExist(patch.items.map((item) => item.exerciseId))
      }
      const count = await db.routines.update(id, withUpdateMeta(patch))
      if (count === 0) throw new NotFoundError(`Routine not found: ${id}`)
      const updated = await db.routines.get(id)
      if (!updated) throw new NotFoundError(`Routine not found: ${id}`)
      return updated
    })
  } catch (err) {
    throw toRepositoryError(err)
  }
}

/** Soft-delete (FR-00.11) — archived routines are hidden but session history stays readable. */
async function archive(id: UUID): Promise<void> {
  await update(id, { isArchived: true })
}

async function restore(id: UUID): Promise<void> {
  await update(id, { isArchived: false })
}

/**
 * Hard-deletes a routine, but only when nothing references it (FR-06.12, F-03 FR-03.11): no
 * scheduled weekday, the active session, nor any session log may point at it. Throws
 * `InvariantError` with a user-meaningful reason otherwise.
 */
async function remove(id: UUID): Promise<void> {
  try {
    await db.transaction(
      'rw',
      db.routines,
      db.schedule,
      db.activeSession,
      db.sessionLogs,
      async () => {
        const scheduledDays = await db.schedule
          .filter((day) => day.routineIds.includes(id))
          .count()
        if (scheduledDays > 0) {
          throw new InvariantError(
            `Can't delete: assigned to ${scheduledDays} scheduled day${scheduledDays === 1 ? '' : 's'}. Remove it from the schedule first, or archive it instead.`,
          )
        }

        const active = await db.activeSession.get(ACTIVE_SESSION_ID)
        if (active?.routineId === id) {
          throw new InvariantError(
            "Can't delete: this is the session currently in progress.",
          )
        }

        const referencingLogs = await db.sessionLogs
          .where('routineId')
          .equals(id)
          .count()
        if (referencingLogs > 0) {
          throw new InvariantError(
            `Can't delete: used by ${referencingLogs} past session log${referencingLogs === 1 ? '' : 's'}. Archive it instead to keep your history intact.`,
          )
        }

        await db.routines.delete(id)
      },
    )
  } catch (err) {
    throw toRepositoryError(err)
  }
}

/** Reorders a routine's items to match `itemIds` (must be a permutation of its current items). */
async function reorderItems(
  routineId: UUID,
  itemIds: UUID[],
): Promise<Routine> {
  try {
    return await db.transaction('rw', db.routines, async () => {
      const routine = await db.routines.get(routineId)
      if (!routine) throw new NotFoundError(`Routine not found: ${routineId}`)

      const byId = new Map(routine.items.map((item) => [item.itemId, item]))
      const isPermutation =
        itemIds.length === routine.items.length &&
        itemIds.every((itemId) => byId.has(itemId))
      if (!isPermutation) {
        throw new InvariantError(
          `reorderItems: itemIds must be a permutation of routine ${routineId}'s existing item ids`,
        )
      }

      const items: RoutineItem[] = itemIds.map((itemId, order) => ({
        ...(byId.get(itemId) as RoutineItem),
        order,
      }))
      const updated: Routine = { ...routine, items, updatedAt: nowIso() }
      await db.routines.put(updated)
      return updated
    })
  } catch (err) {
    throw toRepositoryError(err)
  }
}

/** Repository for the `routines` store (FR-03.7). */
export const routinesRepo = {
  list,
  get,
  create,
  update,
  archive,
  restore,
  reorderItems,
  remove,
}
