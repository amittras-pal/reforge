import type {
  ActiveSession,
  Exercise,
  LocalDate,
  LoggedItem,
  LoggedSet,
  Routine,
  SessionLog,
  SetsRepsPrescription,
  UUID,
  Weekday,
} from '../../lib/domain'
import { ACTIVE_SESSION_ID } from '../../lib/domain'
import {
  activeSessionRepo,
  db,
  exercisesRepo,
  InvariantError,
  metaRepo,
  routinesRepo,
  scheduleRepo,
  sessionLogsRepo,
} from '../../lib/db'
import {
  nowIso,
  todayLocalDate,
  weekdayFromLocalDate,
  yesterdayLocalDate,
} from '../../lib/utils'

/** The only two dates a session may be filed under (FR-07.20). */
export function allowedSessionDates(): { today: LocalDate; yesterday: LocalDate } {
  return { today: todayLocalDate(), yesterday: yesterdayLocalDate() }
}

/** Fetches the routines (in schedule order, including archived ones — FR-06.16) for a weekday. */
export async function getScheduledRoutines(weekday: Weekday): Promise<Routine[]> {
  const day = await scheduleRepo.getDay(weekday)
  if (!day || day.routineIds.length === 0) return []
  const routines = await Promise.all(day.routineIds.map((id) => routinesRepo.get(id)))
  return routines.filter((routine): routine is Routine => routine !== undefined)
}

/** Whether an exercise/routine library exists at all to build a session from (FR-07.19). */
export async function hasAnyLibraryData(): Promise<boolean> {
  const [exerciseCount, routineCount] = await Promise.all([
    db.exercises.count(),
    db.routines.count(),
  ])
  return exerciseCount > 0 && routineCount > 0
}

function combinedRoutineName(routines: Routine[]): string {
  return routines.map((routine) => routine.name).join(' + ')
}

/** Flattens one or more routines' items into `LoggedItem`s, snapshotting exercise name/type. */
async function buildLoggedItems(routines: Routine[]): Promise<LoggedItem[]> {
  const exercises = await exercisesRepo.list()
  const exercisesById = new Map<UUID, Exercise>(
    exercises.map((exercise) => [exercise.id, exercise]),
  )
  const items: LoggedItem[] = []
  for (const routine of routines) {
    for (const item of routine.items) {
      const exercise = exercisesById.get(item.exerciseId)
      if (!exercise) continue // defensive: exercise deleted out from under a snapshot-free reference
      const planned = item.prescription
      items.push({
        exerciseId: item.exerciseId,
        nameSnapshot: exercise.name,
        type: exercise.type,
        planned,
        setResults:
          planned.kind === 'sets_reps'
            ? Array.from({ length: planned.sets }, (_, i) => ({
                setNo: i + 1,
                done: false,
              }))
            : undefined,
        completed: false,
        skipped: false,
      })
    }
  }
  return items
}

export interface StartSessionParams {
  date: LocalDate
  routineIds: UUID[]
}

/**
 * Starts a new active session from one or more routines (today's schedule, another weekday's
 * schedule, or an ad-hoc single routine — FR-07.6). Throws `InvariantError` if a session is
 * already in progress (FR-07.17) or the date isn't today/yesterday (FR-07.20).
 */
export async function startSession(params: StartSessionParams): Promise<ActiveSession> {
  const existing = await activeSessionRepo.getCurrent()
  if (existing) {
    throw new InvariantError(
      'A session is already in progress. Finish or discard it before starting another.',
    )
  }
  const { today, yesterday } = allowedSessionDates()
  if (params.date !== today && params.date !== yesterday) {
    throw new InvariantError('Sessions can only be dated today or yesterday.')
  }
  const routines = await Promise.all(params.routineIds.map((id) => routinesRepo.get(id)))
  const foundRoutines = routines.filter((routine): routine is Routine => routine !== undefined)
  if (foundRoutines.length === 0) {
    throw new InvariantError('No routines to start a session from.')
  }
  const items = await buildLoggedItems(foundRoutines)
  const startedAt = nowIso()
  const session = await activeSessionRepo.start({
    date: params.date,
    weekday: weekdayFromLocalDate(params.date),
    routineId: foundRoutines[0]!.id,
    routineNameSnapshot: combinedRoutineName(foundRoutines),
    startedAt,
    items,
  })
  await metaRepo.set('activeSessionId', ACTIVE_SESSION_ID)
  return session
}

function hasProgress(items: LoggedItem[]): boolean {
  return items.some(
    (item) =>
      item.completed ||
      item.skipped ||
      item.actualDurationSec !== undefined ||
      (item.setResults?.some((set) => set.done) ?? false),
  )
}

/**
 * Midnight expiry (FR-07.21): an active session belongs only to its start day. If it's from
 * before today, auto-finalize it as a `partial` sessionLog (if it has any logged progress) or
 * discard it (if not), then clear it. Never resumed. Safe/idempotent to call on every load.
 */
export async function expireStaleActiveSession(): Promise<void> {
  const active = await activeSessionRepo.getCurrent()
  if (!active) return
  if (active.date >= todayLocalDate()) return
  if (hasProgress(active.items)) {
    await sessionLogsRepo.create({
      date: active.date,
      weekday: active.weekday,
      routineId: active.routineId,
      routineNameSnapshot: active.routineNameSnapshot,
      status: 'partial',
      startedAt: active.startedAt,
      completedAt: active.updatedAt,
      items: active.items,
    })
  }
  await activeSessionRepo.clear()
  await metaRepo.set('activeSessionId', null)
}

export interface FinishSessionParams {
  rpe?: number
  notes?: string
}

/** Finishes the active session, writing a `sessionLog` and clearing the draft (FR-07.14/07.15). */
export async function finishSession(params: FinishSessionParams = {}): Promise<SessionLog> {
  const active = await activeSessionRepo.getCurrent()
  if (!active) {
    throw new InvariantError('No active session to finish.')
  }
  const allDone = active.items.every((item) => item.completed || item.skipped)
  const completedAt = nowIso()
  const log = await sessionLogsRepo.create({
    date: active.date,
    weekday: active.weekday,
    routineId: active.routineId,
    routineNameSnapshot: active.routineNameSnapshot,
    status: allDone ? 'completed' : 'partial',
    startedAt: active.startedAt,
    completedAt,
    items: active.items,
    rpe: params.rpe,
    notes: params.notes,
  })
  await activeSessionRepo.clear()
  await metaRepo.set('activeSessionId', null)
  return log
}

/** Discards the active session without writing a log (FR-07.16). */
export async function discardSession(): Promise<void> {
  await activeSessionRepo.clear()
  await metaRepo.set('activeSessionId', null)
}

/** Live progress count for the sticky header (UI notes \u00a76): completed items out of total. */
export function sessionProgress(items: LoggedItem[]): { done: number; total: number } {
  return { done: items.filter((item) => item.completed).length, total: items.length }
}
/**
 * Session logs already on record for `date` (notes.md: "indication if a session has already
 * been logged for the day"). A thin, testable wrapper over `sessionLogsRepo.getByDate` so the
 * UI doesn't need to import the repo directly for this.
 */
export async function getSessionLogsForDate(date: LocalDate): Promise<SessionLog[]> {
  return sessionLogsRepo.getByDate(date)
}

/**
 * Which of `existingLogs` (already on record for the date about to be started) would be
 * duplicated by starting `routineIds` again (notes.md: "confirmation if the user is starting
 * the same agenda again"). Compares against each log's own `routineId` — the *first* routine of
 * a possibly-combined session (F-07's routineId/routineNameSnapshot resolution) — which reliably
 * catches the common single-routine case; a log combining several routines is only matched if
 * its first routine is being started again.
 */
export function findDuplicateSessionLogs(
  existingLogs: SessionLog[],
  routineIds: UUID[],
): SessionLog[] {
  return existingLogs.filter((log) => routineIds.includes(log.routineId))
}

/**
 * Fills only the *empty* actual fields of each set from the plan, and marks every set done.
 * Used when marking a `sets_reps` exercise complete from the header checkbox: any set the user
 * already entered values for is left untouched, only genuinely empty fields are autofilled.
 */
export function fillSetsFromPlan(
  setResults: LoggedSet[],
  planned: SetsRepsPrescription,
): LoggedSet[] {
  const plannedReps = planned.repsMax ?? planned.repsMin
  return setResults.map((set) => ({
    ...set,
    reps: set.reps ?? plannedReps,
    weight: set.weight ?? planned.weight,
    done: true,
  }))
}