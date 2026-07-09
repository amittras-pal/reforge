<script lang="ts">
  import type { Routine, ScheduleDay, Weekday } from '../../lib/domain'
  import { db, liveQueryStore, scheduleRepo } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import { weekStartsOn } from '../../lib/stores/settings'
  import { showToast } from '../../lib/stores/toast'
  import { WEEKDAY_LABELS } from '../../lib/utils'
  import Card from '../../lib/ui/Card.svelte'
  import Chip from '../../lib/ui/Chip.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import ConfiguratorTabs from './ConfiguratorTabs.svelte'
  import RoutinePickerSheet from './RoutinePickerSheet.svelte'

  $effect(() => {
    pageTitle.set('Configure')
    appBarAction.set(null)
    return () => appBarAction.set(null)
  })

  const week = liveQueryStore(
    () => db.schedule.orderBy('weekday').toArray(),
    [] as ScheduleDay[],
  )
  const routines = liveQueryStore(() => db.routines.toArray(), [] as Routine[])
  const routinesById = $derived(new Map($routines.map((routine) => [routine.id, routine])))

  // Order the 7 days starting from the user's weekStartsOn preference (FR-06.13).
  const orderedDays = $derived(
    Array.from({ length: 7 }, (_, i) => ((i + $weekStartsOn) % 7) as Weekday).map(
      (weekday) =>
        $week.find((day) => day.weekday === weekday) ?? { weekday, routineIds: [] },
    ),
  )

  let pickerOpen = $state(false)
  let pickerWeekday = $state<Weekday | null>(null)
  const pickerExcludeIds = $derived(
    pickerWeekday !== null
      ? ($week.find((day) => day.weekday === pickerWeekday)?.routineIds ?? [])
      : [],
  )

  function openPicker(weekday: Weekday) {
    pickerWeekday = weekday
    pickerOpen = true
  }

  async function handlePickRoutine(routine: Routine) {
    if (pickerWeekday === null) return
    const day = $week.find((d) => d.weekday === pickerWeekday)
    const routineIds = [...(day?.routineIds ?? []), routine.id]
    try {
      await scheduleRepo.setDay(pickerWeekday, routineIds)
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Couldn't update the schedule.",
        'error',
      )
    }
  }

  async function removeRoutine(weekday: Weekday, routineId: string) {
    const day = $week.find((d) => d.weekday === weekday)
    const routineIds = (day?.routineIds ?? []).filter((id) => id !== routineId)
    await scheduleRepo.setDay(weekday, routineIds)
  }

  async function moveRoutine(weekday: Weekday, index: number, direction: -1 | 1) {
    const day = $week.find((d) => d.weekday === weekday)
    if (!day) return
    const target = index + direction
    if (target < 0 || target >= day.routineIds.length) return
    const next = [...day.routineIds]
    const [moved] = next.splice(index, 1)
    if (moved === undefined) return
    next.splice(target, 0, moved)
    await scheduleRepo.setDay(weekday, next)
  }
</script>

<ConfiguratorTabs active="schedule" />

<div class="screen">
  {#each orderedDays as day (day.weekday)}
    <Card>
      <div class="day-header">
        <h2>{WEEKDAY_LABELS[day.weekday]}</h2>
        <IconButton
          icon="plus"
          label={`Add routine to ${WEEKDAY_LABELS[day.weekday]}`}
          onclick={() => openPicker(day.weekday)}
        />
      </div>
      {#if day.routineIds.length === 0}
        <p class="rest-day">Rest day</p>
      {:else}
        <div class="routine-list">
          {#each day.routineIds as routineId, index (routineId)}
            {@const routine = routinesById.get(routineId)}
            <div class="routine-row">
              <span class="routine-name">
                {routine?.name ?? 'Unknown routine'}
                {#if routine?.isArchived}
                  <Chip label="Archived — reassign" variant="warning" />
                {/if}
              </span>
              <div class="routine-actions">
                <IconButton
                  icon="chevron-up"
                  label="Move up"
                  disabled={index === 0}
                  onclick={() => moveRoutine(day.weekday, index, -1)}
                />
                <IconButton
                  icon="chevron-down"
                  label="Move down"
                  disabled={index === day.routineIds.length - 1}
                  onclick={() => moveRoutine(day.weekday, index, 1)}
                />
                <IconButton
                  icon="trash"
                  label="Remove"
                  onclick={() => removeRoutine(day.weekday, routineId)}
                />
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card>
  {/each}
</div>

<RoutinePickerSheet
  bind:open={pickerOpen}
  excludeIds={pickerExcludeIds}
  onPick={handlePickRoutine}
/>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-4);
  }
  .day-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--sp-2);
  }
  .day-header h2 {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--text);
  }
  .rest-day {
    margin: 0;
    color: var(--muted);
    font-size: var(--fs-sm);
  }
  .routine-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .routine-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-2) 0;
    border-top: 1px solid var(--bg);
  }
  .routine-name {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    font-size: var(--fs-md);
    color: var(--text);
  }
  .routine-actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--sp-1);
  }
</style>
