import type { Exercise, ExerciseCategory, UUID } from '../../domain'
import { ACTIVE_SESSION_ID } from '../../domain'
import { InvariantError, NotFoundError, toRepositoryError } from '../errors'
import { withCreateMeta, withUpdateMeta } from '../helpers'
import { db } from '../database'

export interface ExerciseFilter {
  category?: ExerciseCategory
  isArchived?: boolean
}

export type ExerciseInput = Omit<
  Exercise,
  'id' | 'createdAt' | 'updatedAt' | 'isArchived'
> & {
  isArchived?: boolean
}

export type ExercisePatch = Partial<
  Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>
>

async function list(filter?: ExerciseFilter): Promise<Exercise[]> {
  const all = await db.exercises.orderBy('name').toArray()
  return all.filter((exercise) => {
    if (filter?.category !== undefined && exercise.category !== filter.category)
      return false
    if (
      filter?.isArchived !== undefined &&
      exercise.isArchived !== filter.isArchived
    )
      return false
    return true
  })
}

async function get(id: UUID): Promise<Exercise | undefined> {
  return db.exercises.get(id)
}

async function create(input: ExerciseInput): Promise<Exercise> {
  const exercise: Exercise = {
    ...input,
    isArchived: input.isArchived ?? false,
    ...withCreateMeta(),
  }
  try {
    await db.exercises.add(exercise)
  } catch (err) {
    throw toRepositoryError(err)
  }
  return exercise
}

async function update(id: UUID, patch: ExercisePatch): Promise<Exercise> {
  try {
    const count = await db.exercises.update(id, withUpdateMeta(patch))
    if (count === 0) throw new NotFoundError(`Exercise not found: ${id}`)
    const updated = await db.exercises.get(id)
    if (!updated) throw new NotFoundError(`Exercise not found: ${id}`)
    return updated
  } catch (err) {
    throw toRepositoryError(err)
  }
}

/** Soft-delete (FR-00.11) — archived exercises are hidden but session history stays readable. */
async function archive(id: UUID): Promise<void> {
  await update(id, { isArchived: true })
}

async function restore(id: UUID): Promise<void> {
  await update(id, { isArchived: false })
}

/**
 * Hard-deletes an exercise, but only when nothing references it (FR-06.4, F-03 FR-03.11):
 * no routine item, the active session, nor any session log may point at it. Throws
 * `InvariantError` with a user-meaningful reason otherwise.
 */
async function remove(id: UUID): Promise<void> {
  try {
    await db.transaction(
      'rw',
      db.exercises,
      db.routines,
      db.activeSession,
      db.sessionLogs,
      async () => {
        const referencingRoutines = await db.routines
          .filter((routine) => routine.items.some((item) => item.exerciseId === id))
          .count()
        if (referencingRoutines > 0) {
          throw new InvariantError(
            `Can't delete: used by ${referencingRoutines} routine${referencingRoutines === 1 ? '' : 's'}. Archive it instead, or remove it from those routines first.`,
          )
        }

        const active = await db.activeSession.get(ACTIVE_SESSION_ID)
        if (active?.items.some((item) => item.exerciseId === id)) {
          throw new InvariantError(
            "Can't delete: used by the session currently in progress.",
          )
        }

        const referencingLogs = await db.sessionLogs
          .filter((log) => log.items.some((item) => item.exerciseId === id))
          .count()
        if (referencingLogs > 0) {
          throw new InvariantError(
            `Can't delete: used by ${referencingLogs} past session log${referencingLogs === 1 ? '' : 's'}. Archive it instead to keep your history intact.`,
          )
        }

        await db.exercises.delete(id)
      },
    )
  } catch (err) {
    throw toRepositoryError(err)
  }
}

/** Repository for the `exercises` store (FR-03.7, FR-06.4). */
export const exercisesRepo = {
  list,
  get,
  create,
  update,
  archive,
  restore,
  remove,
}
