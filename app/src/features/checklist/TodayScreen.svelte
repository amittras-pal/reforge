<script lang="ts">
  import type { Routine, SessionLog, UUID } from '../../lib/domain'
  import {
    activeSessionRepo,
    exercisesRepo,
    liveQueryStore,
    routinesRepo,
    scheduleRepo,
    sessionLogsRepo,
  } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import { showToast } from '../../lib/stores/toast'
  import { push } from 'svelte-spa-router'
  import { todayLocalDate, weekdayOf } from '../../lib/utils'
  import Button from '../../lib/ui/Button.svelte'
  import ConfirmDialog from '../../lib/ui/ConfirmDialog.svelte'
  import EmptyState from '../../lib/ui/EmptyState.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import ActiveSessionView from './ActiveSessionView.svelte'
  import {
    expireStaleActiveSession,
    findDuplicateSessionLogs,
    getSessionLogsForDate,
    startSession,
  } from './checklistService'
  import RoutinePreviewList from './RoutinePreviewList.svelte'
  import StartSessionSheet from './StartSessionSheet.svelte'

  /** `/today` (FR-07.1, FR-07.7): resume an in-progress session, or preview/start today's plan. */
  const activeSession = liveQueryStore(() => activeSessionRepo.getCurrent(), undefined)
  const exercises = liveQueryStore(() => exercisesRepo.list(), [])
  const routines = liveQueryStore(() => routinesRepo.list(), [])
  const week = liveQueryStore(() => scheduleRepo.getWeek(), [])
  const todaysLogs = liveQueryStore(
    () => sessionLogsRepo.getByDate(todayLocalDate()),
    [] as SessionLog[],
  )

  const today = weekdayOf(new Date())
  const exercisesById = $derived(new Map($exercises.map((exercise) => [exercise.id, exercise])))
  const todaysDay = $derived($week.find((day) => day.weekday === today))
  const todaysRoutines = $derived(
    (todaysDay?.routineIds ?? [])
      .map((id) => $routines.find((routine) => routine.id === id))
      .filter((routine): routine is Routine => routine !== undefined),
  )
  const hasLibraryData = $derived($exercises.length > 0 && $routines.length > 0)

  let startSheetOpen = $state(false)

  // Agenda (routine preview) starts collapsed once today already has a logged session — the
  // list is no longer the primary thing to look at (Notes for Improvement.md); otherwise it
  // starts expanded. Once the user manually toggles it, that choice sticks for the rest of the
  // page visit instead of snapping back every time `todaysLogs` re-emits.
  let agendaExpanded = $state(true)
  let userToggledAgenda = false
  $effect(() => {
    if (userToggledAgenda) return
    agendaExpanded = $todaysLogs.length === 0
  })

  function toggleAgenda() {
    userToggledAgenda = true
    agendaExpanded = !agendaExpanded
  }

  // "Starting the same agenda again" confirmation (notes.md) — set when a start attempt finds
  // logs already on record for that date + routine; the real `startSession()` call is deferred
  // until the user confirms.
  let pendingStart = $state<{ date: string; routineIds: UUID[] } | null>(null)
  let confirmDuplicateOpen = $state(false)
  let duplicateNames = $state('')

  // Runs once on mount (no reactive reads inside) — midnight expiry (FR-07.21).
  $effect(() => {
    expireStaleActiveSession().catch(() => {})
  })

  $effect(() => {
    if ($activeSession) return
    pageTitle.set('Today')
    appBarAction.set(null)
  })

  async function doStart(params: { date: string; routineIds: UUID[] }) {
    try {
      await startSession(params)
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

  async function handleStartToday() {
    if (!todaysDay) return
    await attemptStart({ date: todayLocalDate(), routineIds: todaysDay.routineIds })
  }

  function viewTodaysLogs() {
    push(`/calendar/${todayLocalDate()}`)
  }
</script>

{#if $activeSession}
  <ActiveSessionView session={$activeSession} />
{:else}
  <div class="screen">
    {#if $todaysLogs.length > 0}
      <div class="already-logged">
        <span>
          Already logged today: {$todaysLogs.map((log) => log.routineNameSnapshot).join(', ')}
        </span>
        <button type="button" class="view-link" onclick={viewTodaysLogs}>View</button>
      </div>
    {/if}

    {#if !hasLibraryData}
      <EmptyState
        title="Nothing set up yet"
        message="Add exercises and build routines in the Configurator, then assign them to your weekly schedule to see them here."
        actionLabel="Go to Configure"
        onAction={() => push('/configure')}
      />
    {:else if todaysRoutines.length === 0}
      <EmptyState title="Rest day" message="No routine is scheduled for today." />
      <Button variant="secondary" onclick={() => (startSheetOpen = true)}>
        Choose routine
      </Button>
    {:else}
      <div class="actions">
        <Button variant="primary" onclick={handleStartToday}>
          Start
          <Icon name="play" size={16} />
        </Button>
        <Button variant="secondary" onclick={() => (startSheetOpen = true)}>
          Choose routine
        </Button>
      </div>
      {#if $todaysLogs.length > 0}
        <button type="button" class="agenda-toggle" onclick={toggleAgenda}>
          {agendaExpanded ? 'Hide' : "Show"} today's agenda
          <Icon name={agendaExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
        </button>
      {/if}
      {#if agendaExpanded}
        <RoutinePreviewList routines={todaysRoutines} {exercisesById} />
      {/if}
    {/if}
  </div>
{/if}

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
  .actions {
    display: flex;
    flex-direction: row;
    gap: var(--sp-2);
  }
  .actions :global(.btn) {
    flex: 1;
  }
  .already-logged {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--primary) 10%, var(--surface));
    color: var(--text);
    font-size: var(--fs-sm);
  }
  .view-link {
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: var(--primary);
    font-family: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  .agenda-toggle {
    align-self: center;
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    border: none;
    background: transparent;
    color: var(--muted);
    font-family: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    cursor: pointer;
    min-height: var(--touch-target-min);
  }
</style>

