<script lang="ts">
  import { pop, push } from 'svelte-spa-router'
  import { SvelteMap } from 'svelte/reactivity'
  import type { Exercise, Routine, RoutineItem } from '../../lib/domain'
  import { exercisesRepo, routinesRepo } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import { showToast } from '../../lib/stores/toast'
  import { createId } from '../../lib/utils'
  import Button from '../../lib/ui/Button.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import Chip from '../../lib/ui/Chip.svelte'
  import ConfirmDialog from '../../lib/ui/ConfirmDialog.svelte'
  import EmptyState from '../../lib/ui/EmptyState.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import ExercisePickerSheet from './ExercisePickerSheet.svelte'
  import RoutineItemSheet from './RoutineItemSheet.svelte'
  import { EXERCISE_CATEGORY_LABELS } from './constants'
  import { formatPrescriptionSummary } from './prescriptionSummary'

  let { params }: { params?: { id?: string } } = $props()

  const routineId = $derived(params?.id)
  const isNew = $derived(!routineId)

  let routine = $state<Routine | null>(null)
  let loading = $state(true)
  let notFound = $state(false)

  let name = $state('')
  let focus = $state('')
  let notes = $state('')
  let items = $state<RoutineItem[]>([])
  const exercisesById = new SvelteMap<string, Exercise>()

  let errorMessage = $state<string | null>(null)
  let saving = $state(false)
  let pickerOpen = $state(false)
  let itemSheetOpen = $state(false)
  let editingItemIndex = $state<number | null>(null)
  let confirmDeleteOpen = $state(false)

  async function load() {
    loading = true
    notFound = false
    const allExercises = await exercisesRepo.list()
    exercisesById.clear()
    for (const exercise of allExercises) {
      exercisesById.set(exercise.id, exercise)
    }

    if (routineId) {
      const found = await routinesRepo.get(routineId)
      if (!found) {
        notFound = true
        loading = false
        return
      }
      routine = found
      name = found.name
      focus = found.focus ?? ''
      notes = found.notes ?? ''
      items = found.items.map((item) => ({ ...item }))
    } else {
      routine = null
      name = ''
      focus = ''
      notes = ''
      items = []
    }
    loading = false
  }

  $effect(() => {
    void routineId
    load()
  })

  $effect(() => {
    pageTitle.set(isNew ? 'New routine' : 'Edit routine')
    appBarAction.set(null)
    return () => appBarAction.set(null)
  })

  function renumber(list: RoutineItem[]): RoutineItem[] {
    return list.map((item, order) => ({ ...item, order }))
  }

  function handlePickExercise(exercise: Exercise) {
    exercisesById.set(exercise.id, exercise)
    const newItem: RoutineItem = {
      itemId: createId(),
      exerciseId: exercise.id,
      order: items.length,
      prescription: exercise.defaultPrescription,
    }
    items = [...items, newItem]
  }

  function removeItem(index: number) {
    items = renumber(items.filter((_, i) => i !== index))
  }

  function duplicateItem(index: number) {
    const source = items[index]
    if (!source) return
    const copy: RoutineItem = { ...source, itemId: createId() }
    const next = [...items]
    next.splice(index + 1, 0, copy)
    items = renumber(next)
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(target, 0, moved)
    items = renumber(next)
  }

  function openItemEditor(index: number) {
    editingItemIndex = index
    itemSheetOpen = true
  }

  function handleItemSave(patch: {
    prescription: RoutineItem['prescription']
    supersetGroup?: string
    notes?: string
  }) {
    if (editingItemIndex === null) return
    const index = editingItemIndex
    items = items.map((item, i) => (i === index ? { ...item, ...patch } : item))
  }

  function validate(): string | null {
    if (!name.trim()) return 'Name is required.'
    if (items.length === 0) return "Add at least one exercise (a routine can't be empty)."
    return null
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) {
      errorMessage = validationError
      return
    }
    saving = true
    try {
      const input = {
        name: name.trim(),
        focus: focus.trim() || undefined,
        notes: notes.trim() || undefined,
        // Svelte 5 $state arrays/objects are reactive Proxies, not structured-clonable
        // by IndexedDB — snapshot to plain data before handing off to the repo.
        items: $state.snapshot(items),
      }
      if (routine) {
        await routinesRepo.update(routine.id, input)
        showToast('Routine updated', 'success')
      } else {
        await routinesRepo.create(input)
        showToast('Routine created', 'success')
      }
      push('/configure/routines')
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Couldn't save routine."
    } finally {
      saving = false
    }
  }

  async function handleArchiveToggle() {
    if (!routine) return
    try {
      if (routine.isArchived) {
        await routinesRepo.restore(routine.id)
        showToast('Routine restored', 'success')
      } else {
        await routinesRepo.archive(routine.id)
        showToast('Routine archived', 'success')
      }
      push('/configure/routines')
    } catch {
      showToast('Something went wrong. Please try again.', 'error')
    }
  }

  async function handleDelete() {
    if (!routine) return
    try {
      await routinesRepo.remove(routine.id)
      showToast('Routine deleted', 'success')
      push('/configure/routines')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'error')
    }
  }

  function cancel() {
    pop()
  }
</script>

{#if loading}
  <div class="screen"><p class="hint">Loading…</p></div>
{:else if notFound}
  <div class="screen">
    <EmptyState title="Routine not found" message="It may have been deleted." />
  </div>
{:else}
  <div class="screen">
    <Card>
      <div class="field-stack">
        <TextField label="Name" bind:value={name} placeholder="e.g. Lower Body A" />
        <TextField
          label="Focus (optional)"
          bind:value={focus}
          placeholder="e.g. Lower Body Hypertrophy & Pelvic Stability"
        />
        <TextField label="Notes (optional)" bind:value={notes} />
      </div>
    </Card>

    <div class="items-header">
      <h2>Exercises</h2>
      <Button size="sm" onclick={() => (pickerOpen = true)}>Add exercise</Button>
    </div>

    {#if items.length === 0}
      <EmptyState
        title="No exercises yet"
        message="A routine can't be saved empty — add at least one."
      />
    {:else}
      <div class="item-list">
        {#each items as item, index (item.itemId)}
          {@const exercise = exercisesById.get(item.exerciseId)}
          <Card>
            <div class="item">
              <div class="item-main">
                <button
                  type="button"
                  class="item-title"
                  onclick={() => openItemEditor(index)}
                >
                  {exercise?.name ?? 'Unknown exercise'}
                </button>
                <span class="item-summary">
                  {formatPrescriptionSummary(item.prescription)}
                </span>
                <div class="item-chips">
                  {#if exercise}
                    <Chip label={EXERCISE_CATEGORY_LABELS[exercise.category]} />
                  {/if}
                  {#if exercise?.isArchived}
                    <Chip
                      label="Archived exercise — remove or swap it"
                      variant="warning"
                    />
                  {/if}
                  {#if item.supersetGroup}
                    <Chip label={`Superset: ${item.supersetGroup}`} variant="success" />
                  {/if}
                </div>
              </div>
              <div class="item-actions">
                <IconButton
                  icon="chevron-up"
                  label="Move up"
                  disabled={index === 0}
                  onclick={() => moveItem(index, -1)}
                />
                <IconButton
                  icon="chevron-down"
                  label="Move down"
                  disabled={index === items.length - 1}
                  onclick={() => moveItem(index, 1)}
                />
                <IconButton
                  icon="copy"
                  label="Duplicate"
                  onclick={() => duplicateItem(index)}
                />
                <IconButton
                  icon="trash"
                  label="Remove"
                  onclick={() => removeItem(index)}
                />
              </div>
            </div>
          </Card>
        {/each}
      </div>
    {/if}

    {#if errorMessage}
      <p class="error-text">{errorMessage}</p>
    {/if}

    <div class="actions">
      <Button variant="secondary" onclick={cancel}>Cancel</Button>
      <Button onclick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save routine'}
      </Button>
    </div>

    {#if routine}
      <div class="danger-zone">
        <Button variant="secondary" onclick={handleArchiveToggle}>
          {routine.isArchived ? 'Restore' : 'Archive'}
        </Button>
        <Button variant="danger" onclick={() => (confirmDeleteOpen = true)}>
          Delete permanently
        </Button>
      </div>
    {/if}
  </div>
{/if}

<ExercisePickerSheet bind:open={pickerOpen} onPick={handlePickExercise} />
<RoutineItemSheet
  bind:open={itemSheetOpen}
  item={editingItemIndex !== null ? (items[editingItemIndex] ?? null) : null}
  exercise={editingItemIndex !== null
    ? (exercisesById.get(items[editingItemIndex]?.exerciseId ?? '') ?? null)
    : null}
  onSave={handleItemSave}
/>

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Delete routine?"
  message="This permanently deletes the routine. It's only possible when it's not scheduled and has no session logs."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={handleDelete}
/>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
  }
  .field-stack {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .hint {
    color: var(--muted);
  }
  .items-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .items-header h2 {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--text);
  }
  .item-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sp-3);
  }
  .item-main {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    min-width: 0;
  }
  .item-title {
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }
  .item-summary {
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .item-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sp-1);
    margin-top: var(--sp-1);
  }
  .item-actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--sp-1);
  }
  .error-text {
    margin: 0;
    color: var(--danger);
    font-size: var(--fs-sm);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-2);
  }
  .danger-zone {
    display: flex;
    gap: var(--sp-2);
    padding-top: var(--sp-3);
    border-top: 1px solid var(--surface);
  }
  .danger-zone :global(.btn) {
    flex: 1;
  }
</style>
