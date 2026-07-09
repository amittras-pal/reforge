<script lang="ts">
  import { push } from 'svelte-spa-router'
  import type { Routine } from '../../lib/domain'
  import { db, liveQueryStore } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import Checkbox from '../../lib/ui/Checkbox.svelte'
  import Chip from '../../lib/ui/Chip.svelte'
  import EmptyState from '../../lib/ui/EmptyState.svelte'
  import ListRow from '../../lib/ui/ListRow.svelte'
  import ConfiguratorTabs from './ConfiguratorTabs.svelte'
  import ExampleProgramCard from './ExampleProgramCard.svelte'

  $effect(() => {
    pageTitle.set('Configure')
    appBarAction.set({
      label: 'Add routine',
      onClick: () => push('/configure/routines/new'),
    })
    return () => appBarAction.set(null)
  })

  const routines = liveQueryStore(
    () => db.routines.orderBy('name').toArray(),
    [] as Routine[],
  )

  let showArchived = $state(false)
  const filtered = $derived($routines.filter((r) => showArchived || !r.isArchived))
</script>

<ConfiguratorTabs active="routines" />

<div class="screen">
  {#if $routines.length === 0}
    <EmptyState
      title="No routines yet"
      message="Add a few exercises first, then build a routine from them."
      actionLabel="Add routine"
      onAction={() => push('/configure/routines/new')}
    />
    <ExampleProgramCard />
  {:else}
    <Checkbox label="Show archived" bind:checked={showArchived} />
    <div class="list">
      {#each filtered as routine (routine.id)}
        <ListRow
          title={routine.name}
          subtitle={`${routine.items.length} exercise${routine.items.length === 1 ? '' : 's'}${routine.focus ? ' · ' + routine.focus : ''}`}
          onclick={() => push(`/configure/routines/${routine.id}`)}
        >
          {#snippet trailing()}
            {#if routine.isArchived}
              <Chip label="Archived" variant="warning" />
            {/if}
          {/snippet}
        </ListRow>
      {/each}
    </div>
  {/if}
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-4);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
</style>
