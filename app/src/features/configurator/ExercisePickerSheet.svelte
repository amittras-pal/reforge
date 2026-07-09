<script lang="ts">
  import type { Exercise } from '../../lib/domain'
  import { exercisesRepo } from '../../lib/db'
  import { showToast } from '../../lib/stores/toast'
  import BottomSheet from '../../lib/ui/BottomSheet.svelte'
  import EmptyState from '../../lib/ui/EmptyState.svelte'
  import Icon from '../../lib/ui/Icon.svelte'
  import ListRow from '../../lib/ui/ListRow.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import ExerciseEditorSheet from './ExerciseEditorSheet.svelte'
  import { EXERCISE_CATEGORY_LABELS } from './constants'

  /**
   * Picks a non-archived exercise to add to a routine (FR-06.7), or creates a brand-new
   * library exercise inline (F-10) via `ExerciseEditorSheet` stacked on top of this sheet.
   */
  let {
    open = $bindable(false),
    onPick,
  }: {
    open?: boolean
    onPick: (exercise: Exercise) => void
  } = $props()

  let exercises = $state<Exercise[]>([])
  let search = $state('')
  let creatorOpen = $state(false)

  $effect(() => {
    if (!open) return
    search = ''
    void exercisesRepo.list({ isArchived: false }).then((list) => {
      exercises = list
    })
  })

  const filtered = $derived(
    exercises.filter((exercise) => {
      const query = search.trim().toLowerCase()
      return !query || exercise.name.toLowerCase().includes(query)
    }),
  )

  function pick(exercise: Exercise) {
    onPick(exercise)
    open = false
  }

  // F-10: the new exercise is a first-class library entry, created via the exact same
  // ExerciseEditorSheet/exercisesRepo.create() path as /configure/exercises — then added to
  // the routine exactly like picking an existing exercise (FR-10.3). Closes both sheets.
  function handleCreated(exercise: Exercise) {
    onPick(exercise)
    creatorOpen = false
    open = false
    showToast('Exercise created and added', 'success')
  }
</script>

<BottomSheet bind:open title="Add exercise">
  <TextField placeholder="Search exercises" bind:value={search} />
  <div class="create-row">
    <ListRow title="Create new exercise" onclick={() => (creatorOpen = true)}>
      {#snippet leading()}
        <Icon name="plus" />
      {/snippet}
    </ListRow>
  </div>
  {#if exercises.length === 0}
    <EmptyState
      title="No exercises available"
      message="Create your first exercise above, or add one from the Exercises tab."
    />
  {:else if filtered.length === 0}
    <EmptyState
      title="No matches"
      message="Try a different search, or create a new exercise above."
    />
  {:else}
    <div class="list">
      {#each filtered as exercise (exercise.id)}
        <ListRow
          title={exercise.name}
          subtitle={EXERCISE_CATEGORY_LABELS[exercise.category]}
          onclick={() => pick(exercise)}
        />
      {/each}
    </div>
  {/if}
</BottomSheet>

<ExerciseEditorSheet
  bind:open={creatorOpen}
  exercise={null}
  initialName={search.trim()}
  onCreate={handleCreated}
/>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    margin-top: var(--sp-3);
  }
  .create-row {
    margin-top: var(--sp-3);
  }
  .create-row :global(.list-row) {
    background: color-mix(in srgb, var(--primary) 10%, var(--surface));
    color: var(--primary);
    font-weight: 600;
  }
</style>
