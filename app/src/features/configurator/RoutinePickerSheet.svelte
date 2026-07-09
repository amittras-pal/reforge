<script lang="ts">
  import type { Routine } from '../../lib/domain'
  import { routinesRepo } from '../../lib/db'
  import BottomSheet from '../../lib/ui/BottomSheet.svelte'
  import EmptyState from '../../lib/ui/EmptyState.svelte'
  import ListRow from '../../lib/ui/ListRow.svelte'

  /** Picks a non-archived routine to assign to a weekday (FR-06.14, FR-06.16). */
  let {
    open = $bindable(false),
    excludeIds = [],
    onPick,
  }: {
    open?: boolean
    excludeIds?: string[]
    onPick: (routine: Routine) => void
  } = $props()

  let routines = $state<Routine[]>([])

  $effect(() => {
    if (!open) return
    void routinesRepo.list({ isArchived: false }).then((list) => {
      routines = list
    })
  })

  const available = $derived(routines.filter((routine) => !excludeIds.includes(routine.id)))

  function pick(routine: Routine) {
    onPick(routine)
    open = false
  }
</script>

<BottomSheet bind:open title="Add routine">
  {#if available.length === 0}
    <EmptyState
      title="No routines available"
      message="Create a routine in the Routines tab first — or it's already assigned to this day."
    />
  {:else}
    <div class="list">
      {#each available as routine (routine.id)}
        <ListRow
          title={routine.name}
          subtitle={`${routine.items.length} exercise${routine.items.length === 1 ? '' : 's'}${routine.focus ? ' · ' + routine.focus : ''}`}
          onclick={() => pick(routine)}
        />
      {/each}
    </div>
  {/if}
</BottomSheet>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    margin-top: var(--sp-3);
  }
</style>
