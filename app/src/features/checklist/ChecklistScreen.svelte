<script lang="ts">
  import type { Routine, UUID, Weekday } from '../../lib/domain'
  import {
    activeSessionRepo,
    exercisesRepo,
    liveQueryStore,
    routinesRepo,
    scheduleRepo,
  } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import { showToast } from '../../lib/stores/toast'
  import { WEEKDAY_LABELS, todayLocalDate } from '../../lib/utils'
  import Button from '../../lib/ui/Button.svelte'
  import ConfirmDialog from '../../lib/ui/ConfirmDialog.svelte'
  import EmptyState from '../../lib/ui/EmptyState.svelte'
  import { findDuplicateSessionLogs, getSessionLogsForDate, startSession } from './checklistService'
  import RoutinePreviewList from './RoutinePreviewList.svelte'
  import StartSessionSheet from './StartSessionSheet.svelte'

  /** `/checklist/:weekday` (FR-07.2): preview any weekday's plan and start it as a new session. */
  let { params }: { params?: { weekday?: string } } = $props()

  const weekday = $derived.by((): Weekday | null => {
    const parsed = Number(params?.weekday)
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 6 ? (parsed as Weekday) : null
  })

  const activeSession = liveQueryStore(() => activeSessionRepo.getCurrent(), undefined)
  const exercises = liveQueryStore(() => exercisesRepo.list(), [])
  const routines = liveQueryStore(() => routinesRepo.list(), [])
  const week = liveQueryStore(() => scheduleRepo.getWeek(), [])

  const exercisesById = $derived(new Map($exercises.map((exercise) => [exercise.id, exercise])))
  const day = $derived(weekday === null ? undefined : $week.find((d) => d.weekday === weekday))
  const dayRoutines = $derived(
    (day?.routineIds ?? [])
      .map((id) => $routines.find((routine) => routine.id === id))
      .filter((routine): routine is Routine => routine !== undefined),
  )

  let startSheetOpen = $state(false)

  // "Starting the same agenda again" confirmation (notes.md) — same pattern as TodayScreen.
  let pendingStart = $state<{ date: string; routineIds: UUID[] } | null>(null)
  let confirmDuplicateOpen = $state(false)
  let duplicateNames = $state('')

  $effect(() => {
    pageTitle.set(weekday === null ? 'Checklist' : (WEEKDAY_LABELS[weekday] ?? 'Checklist'))
    appBarAction.set(null)
    return () => appBarAction.set(null)
  })

  async function doStart(params: { date: string; routineIds: UUID[] }) {
    try {
      await startSession(params)
      showToast('Session started', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't start the session.", 'error')
    }
  }

  async function attemptStart(params: { date: string; routineIds: UUID[] }) {
    const existingLogs = await getSessionLogsForDate(params.date)
    const duplicates = findDuplicateSessionLogs(existingLogs, params.routineIds)
    if (duplicates.length > 0) {
      pendingStart = params
      duplicateNames = duplicates.map((log) => log.routineNameSnapshot).join(', ')
      confirmDuplicateOpen = true
      return
    }
    await doStart(params)
  }

  function confirmStartAnyway() {
    if (!pendingStart) return
    const params = pendingStart
    pendingStart = null
    void doStart(params)
  }

  async function handleStartThisDay() {
    if (!day) return
    await attemptStart({ date: todayLocalDate(), routineIds: day.routineIds })
  }
</script>

<div class="screen">
  {#if weekday === null}
    <EmptyState title="Unknown weekday" message="This link doesn't point at a valid day." />
  {:else}
    {#if $activeSession}
      <p class="active-warning">
        A session is already in progress. Finish or discard it (on the Today tab) before starting
        another.
      </p>
    {/if}

    {#if dayRoutines.length === 0}
      <EmptyState title="Rest day" message={`No routine is scheduled for ${WEEKDAY_LABELS[weekday]}.`} />
    {:else}
      <RoutinePreviewList routines={dayRoutines} {exercisesById} />
      <Button
        variant="primary"
        disabled={!!$activeSession}
        onclick={handleStartThisDay}
      >
        Start this session
      </Button>
    {/if}

    <Button variant="secondary" disabled={!!$activeSession} onclick={() => (startSheetOpen = true)}>
      Start a different routine
    </Button>
  {/if}
</div>

<StartSessionSheet
  bind:open={startSheetOpen}
  week={$week}
  routines={$routines}
  onStart={attemptStart}
/>

<ConfirmDialog
  bind:open={confirmDuplicateOpen}
  title="Already logged today?"
  message={`You've already logged "${duplicateNames}" for ${pendingStart?.date === todayLocalDate() ? 'today' : 'yesterday'}. Start it again anyway?`}
  confirmLabel="Start anyway"
  onConfirm={confirmStartAnyway}
/>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
  }
  .active-warning {
    margin: 0;
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--warning) 15%, var(--surface));
    color: var(--text);
    font-size: var(--fs-sm);
  }
</style>

