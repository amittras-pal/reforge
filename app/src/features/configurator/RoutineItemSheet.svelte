<script lang="ts">
  import type { Exercise, Prescription, RoutineItem } from '../../lib/domain'
  import BottomSheet from '../../lib/ui/BottomSheet.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import PrescriptionFields from './PrescriptionFields.svelte'

  /** Edits one routine item's prescription override, superset group, and notes (FR-06.7, FR-06.9). */
  let {
    open = $bindable(false),
    item,
    exercise,
    onSave,
  }: {
    open?: boolean
    item: RoutineItem | null
    exercise: Exercise | null
    onSave: (patch: {
      prescription: Prescription
      supersetGroup?: string
      notes?: string
    }) => void
  } = $props()

  let prescription = $state<Prescription | null>(null)
  let supersetGroup = $state('')
  let notes = $state('')

  $effect(() => {
    if (!open || !item) return
    prescription = { ...item.prescription }
    supersetGroup = item.supersetGroup ?? ''
    notes = item.notes ?? ''
  })

  function handleSave() {
    if (!prescription) return
    onSave({
      prescription,
      supersetGroup: supersetGroup.trim() || undefined,
      notes: notes.trim() || undefined,
    })
    open = false
  }
</script>

<BottomSheet bind:open title={exercise?.name ?? 'Edit item'}>
  {#if prescription}
    <div class="form">
      <PrescriptionFields bind:prescription />
      <TextField
        label="Superset group (optional)"
        placeholder="e.g. arms"
        bind:value={supersetGroup}
      />
      <TextField label="Notes (optional)" bind:value={notes} />
      <Button onclick={handleSave}>Save</Button>
    </div>
  {/if}
</BottomSheet>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
</style>
