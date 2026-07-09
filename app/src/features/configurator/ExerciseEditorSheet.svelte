<script lang="ts">
  import type { Exercise, ExerciseType, Prescription } from '../../lib/domain'
  import { exercisesRepo } from '../../lib/db'
  import { showToast } from '../../lib/stores/toast'
  import BottomSheet from '../../lib/ui/BottomSheet.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import ConfirmDialog from '../../lib/ui/ConfirmDialog.svelte'
  import SegmentedControl from '../../lib/ui/SegmentedControl.svelte'
  import Select from '../../lib/ui/Select.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import PrescriptionFields from './PrescriptionFields.svelte'
  import { EXERCISE_CATEGORY_OPTIONS, EXERCISE_TYPE_OPTIONS } from './constants'

  /**
   * Create/edit sheet for an exercise (FR-06.2, FR-06.3, FR-06.4). `exercise` unset = create.
   *
   * Also reused as-is for F-10's inline creation flow (stacked over `ExercisePickerSheet`):
   * `initialName` seeds the name field from the picker's search text, and `onCreate` — when
   * provided — is called with the newly-created exercise instead of showing this sheet's own
   * "Exercise created" toast, so the caller can add it to a routine and show its own toast.
   */
  let {
    open = $bindable(false),
    exercise = null,
    initialName = '',
    onCreate,
  }: {
    open?: boolean
    exercise?: Exercise | null
    initialName?: string
    onCreate?: (exercise: Exercise) => void
  } = $props()

  function defaultPrescriptionFor(type: ExerciseType): Prescription {
    return type === 'sets_reps'
      ? { kind: 'sets_reps', sets: 3, repsMin: 8, repsMax: 10 }
      : { kind: 'duration', durationSec: 600 }
  }

  let name = $state('')
  let category = $state<string>('lower')
  let typeValue = $state<string>('sets_reps')
  let instructions = $state('')
  let prescription = $state<Prescription>(defaultPrescriptionFor('sets_reps'))
  let errorMessage = $state<string | null>(null)
  let confirmDeleteOpen = $state(false)
  let saving = $state(false)

  // BottomSheet is a long-lived component instance; re-seed the form every time it opens
  // (rather than only at first mount) so editing a different exercise starts from that
  // exercise's data, not stale state from a previous open.
  $effect(() => {
    if (!open) return
    name = exercise?.name ?? initialName
    category = exercise?.category ?? 'lower'
    typeValue = exercise?.type ?? 'sets_reps'
    instructions = exercise?.instructions ?? ''
    prescription = exercise?.defaultPrescription ?? defaultPrescriptionFor('sets_reps')
    errorMessage = null
  })

  // SegmentedControl's `value` is a plain bindable string; react to it changing type and
  // reset the prescription to a fresh default of the right kind (FR-06.2's "type switch").
  $effect(() => {
    const nextType = typeValue as ExerciseType
    if (prescription.kind !== nextType) {
      prescription = defaultPrescriptionFor(nextType)
    }
  })

  function validate(): string | null {
    if (!name.trim()) return 'Name is required.'
    if (prescription.kind === 'sets_reps') {
      if (prescription.sets < 1) return 'Sets must be at least 1.'
      if (prescription.repsMin < 1) return 'Reps must be at least 1.'
      if (
        prescription.repsMax !== undefined &&
        prescription.repsMax < prescription.repsMin
      ) {
        return 'Max reps must be at least min reps (FR-06.3).'
      }
    } else {
      if (prescription.durationSec < 1) return 'Duration must be at least 1 minute.'
      if (
        prescription.targetHrPctMin !== undefined &&
        prescription.targetHrPctMax !== undefined &&
        prescription.targetHrPctMin > prescription.targetHrPctMax
      ) {
        return 'Min target HR% must be at most max target HR% (FR-06.3).'
      }
    }
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
        category: category as Exercise['category'],
        type: typeValue as ExerciseType,
        instructions: instructions.trim() || undefined,
        // Svelte 5 $state objects are reactive Proxies, not structured-clonable by
        // IndexedDB — snapshot to a plain object before handing off to the repo.
        defaultPrescription: $state.snapshot(prescription),
      }
      if (exercise) {
        await exercisesRepo.update(exercise.id, input)
        showToast('Exercise updated', 'success')
      } else {
        const created = await exercisesRepo.create(input)
        if (onCreate) {
          onCreate(created)
        } else {
          showToast('Exercise created', 'success')
        }
      }
      open = false
    } catch {
      showToast("Couldn't save exercise. Please try again.", 'error')
    } finally {
      saving = false
    }
  }

  async function handleArchiveToggle() {
    if (!exercise) return
    try {
      if (exercise.isArchived) {
        await exercisesRepo.restore(exercise.id)
        showToast('Exercise restored', 'success')
      } else {
        await exercisesRepo.archive(exercise.id)
        showToast('Exercise archived', 'success')
      }
      open = false
    } catch {
      showToast('Something went wrong. Please try again.', 'error')
    }
  }

  async function handleDelete() {
    if (!exercise) return
    try {
      await exercisesRepo.remove(exercise.id)
      showToast('Exercise deleted', 'success')
      open = false
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed.', 'error')
    }
  }
</script>

<BottomSheet bind:open title={exercise ? 'Edit exercise' : 'New exercise'}>
  <div class="form">
    <TextField label="Name" bind:value={name} placeholder="e.g. Barbell Back Squat" />
    <Select label="Category" options={EXERCISE_CATEGORY_OPTIONS} bind:value={category} />
    <SegmentedControl label="Type" options={EXERCISE_TYPE_OPTIONS} bind:value={typeValue} />

    <PrescriptionFields bind:prescription />

    <TextField
      label="Instructions (optional)"
      bind:value={instructions}
      placeholder="Cues / notes"
    />

    {#if errorMessage}
      <p class="error-text">{errorMessage}</p>
    {/if}

    <Button onclick={handleSave} disabled={saving}>
      {saving ? 'Saving…' : 'Save'}
    </Button>

    {#if exercise}
      <div class="danger-zone">
        <Button variant="secondary" onclick={handleArchiveToggle}>
          {exercise.isArchived ? 'Restore' : 'Archive'}
        </Button>
        <Button variant="danger" onclick={() => (confirmDeleteOpen = true)}>
          Delete permanently
        </Button>
      </div>
    {/if}
  </div>
</BottomSheet>

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Delete exercise?"
  message="This permanently deletes the exercise. It's only possible when no routine or session log references it."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={handleDelete}
/>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .error-text {
    margin: 0;
    color: var(--danger);
    font-size: var(--fs-sm);
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
