<script lang="ts">
  import type { Exercise } from '../../lib/domain'
  import { db, liveQueryStore } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import Chip from '../../lib/ui/Chip.svelte'
  import Checkbox from '../../lib/ui/Checkbox.svelte'
  import EmptyState from '../../lib/ui/EmptyState.svelte'
  import ListRow from '../../lib/ui/ListRow.svelte'
  import Select from '../../lib/ui/Select.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import ConfiguratorTabs from './ConfiguratorTabs.svelte'
  import ExampleProgramCard from './ExampleProgramCard.svelte'
  import ExerciseEditorSheet from './ExerciseEditorSheet.svelte'
  import UsageGuideSheet from './UsageGuideSheet.svelte'
  import { EXERCISE_CATEGORY_LABELS, EXERCISE_CATEGORY_OPTIONS } from './constants'

  let editorOpen = $state(false)
  let editingExercise = $state<Exercise | null>(null)
  let guideOpen = $state(false)

  function openEditor(exercise: Exercise | null) {
    editingExercise = exercise
    editorOpen = true
  }

  $effect(() => {
    pageTitle.set('Configure')
    appBarAction.set({ label: 'Add exercise', onClick: () => openEditor(null) })
    return () => appBarAction.set(null)
  })

  const exercises = liveQueryStore(
    () => db.exercises.orderBy('name').toArray(),
    [] as Exercise[],
  )

  let search = $state('')
  let categoryFilter = $state('all')
  let showArchived = $state(false)

  const categoryOptions = [
    { label: 'All categories', value: 'all' },
    ...EXERCISE_CATEGORY_OPTIONS,
  ]

  const filtered = $derived(
    $exercises.filter((exercise) => {
      if (!showArchived && exercise.isArchived) return false
      if (categoryFilter !== 'all' && exercise.category !== categoryFilter) return false
      const query = search.trim().toLowerCase()
      if (query && !exercise.name.toLowerCase().includes(query)) return false
      return true
    }),
  )
</script>

<ConfiguratorTabs active="exercises" />

<div class="screen">
  {#if $exercises.length === 0}
    <EmptyState
      title="No exercises yet"
      message="Add your first exercise to start building routines, or load the example program to see a full setup."
      actionLabel="Add exercise"
      onAction={() => openEditor(null)}
    />
    <ExampleProgramCard />
    <button type="button" class="guide-link" onclick={() => (guideOpen = true)}>
      How should I structure a training day?
    </button>
  {:else}
    <div class="filters">
      <TextField placeholder="Search exercises" bind:value={search} />
      <div class="filter-row">
        <Select options={categoryOptions} bind:value={categoryFilter} />
        <Checkbox label="Show archived" bind:checked={showArchived} />
      </div>
    </div>

    {#if filtered.length === 0}
      <EmptyState title="No matches" message="Try a different search or filter." />
    {:else}
      <div class="list">
        {#each filtered as exercise (exercise.id)}
          <ListRow
            title={exercise.name}
            subtitle={EXERCISE_CATEGORY_LABELS[exercise.category]}
            onclick={() => openEditor(exercise)}
          >
            {#snippet trailing()}
              {#if exercise.isArchived}
                <Chip label="Archived" variant="warning" />
              {/if}
            {/snippet}
          </ListRow>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<ExerciseEditorSheet bind:open={editorOpen} exercise={editingExercise} />
<UsageGuideSheet bind:open={guideOpen} />

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-4);
  }
  .guide-link {
    align-self: center;
    border: none;
    background: transparent;
    color: var(--primary);
    font-family: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
    min-height: var(--touch-target-min);
  }
  .filters {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .filter-row {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }
  .filter-row :global(.field) {
    flex: 1;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
</style>
