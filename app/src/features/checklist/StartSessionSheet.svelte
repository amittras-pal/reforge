<script lang="ts">
  import type { Routine, ScheduleDay, UUID, Weekday } from '../../lib/domain'
  import { todayLocalDate, WEEKDAY_LABELS, yesterdayLocalDate } from '../../lib/utils'
  import BottomSheet from '../../lib/ui/BottomSheet.svelte'
  import ListRow from '../../lib/ui/ListRow.svelte'
  import SegmentedControl from '../../lib/ui/SegmentedControl.svelte'
  import TextField from '../../lib/ui/TextField.svelte'

  /**
   * "Start a different routine" (FR-07.6): pick another weekday's scheduled plan or any
   * non-archived library routine directly (ad-hoc), plus which date (today/yesterday) to
   * file the resulting session under (FR-07.20).
   */
  let {
    open = $bindable(false),
    week,
    routines,
    onStart,
  }: {
    open?: boolean
    week: ScheduleDay[]
    routines: Routine[]
    onStart: (params: { date: string; routineIds: UUID[] }) => void
  } = $props()

  let dateValue = $state(todayLocalDate())
  let search = $state('')

  $effect(() => {
    if (!open) return
    dateValue = todayLocalDate()
    search = ''
  })

  const dateOptions = [
    { label: 'Today', value: todayLocalDate() },
    { label: 'Yesterday', value: yesterdayLocalDate() },
  ]

  const weekdays: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

  const filteredRoutines = $derived(
    routines.filter(
      (routine) =>
        !routine.isArchived &&
        routine.name.toLowerCase().includes(search.trim().toLowerCase()),
    ),
  )

  function routineNamesFor(weekday: Weekday): string[] {
    const day = week.find((d) => d.weekday === weekday)
    return (day?.routineIds ?? [])
      .map((id) => routines.find((r) => r.id === id)?.name)
      .filter((name): name is string => name !== undefined)
  }

  function pickWeekday(weekday: Weekday) {
    const day = week.find((d) => d.weekday === weekday)
    if (!day || day.routineIds.length === 0) return
    onStart({ date: dateValue, routineIds: day.routineIds })
    open = false
  }

  function pickRoutine(routine: Routine) {
    onStart({ date: dateValue, routineIds: [routine.id] })
    open = false
  }
</script>

<BottomSheet bind:open title="Start a different routine">
  <div class="content">
    <SegmentedControl label="Session date" options={dateOptions} bind:value={dateValue} />

    <h3>By weekday</h3>
    <div class="list">
      {#each weekdays as weekday (weekday)}
        {@const names = routineNamesFor(weekday)}
        <ListRow
          title={WEEKDAY_LABELS[weekday] ?? ''}
          subtitle={names.length > 0 ? names.join(', ') : 'Rest day'}
          onclick={names.length > 0 ? () => pickWeekday(weekday) : undefined}
        />
      {/each}
    </div>

    <h3>Or pick a routine directly</h3>
    <TextField placeholder="Search routines" bind:value={search} />
    <div class="list">
      {#each filteredRoutines as routine (routine.id)}
        <ListRow title={routine.name} subtitle={routine.focus} onclick={() => pickRoutine(routine)} />
      {/each}
      {#if filteredRoutines.length === 0}
        <p class="empty">No routines found.</p>
      {/if}
    </div>
  </div>
</BottomSheet>

<style>
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  h3 {
    margin: var(--sp-2) 0 0;
    font-size: var(--fs-sm);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
  .empty {
    margin: 0;
    padding: var(--sp-2) 0;
    color: var(--muted);
    font-size: var(--fs-sm);
  }
</style>
