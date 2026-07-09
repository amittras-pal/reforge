<script lang="ts">
  import BottomSheet from '../../lib/ui/BottomSheet.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import NumberStepper from '../../lib/ui/NumberStepper.svelte'
  import TextField from '../../lib/ui/TextField.svelte'

  /** Optional RPE/notes capture on finish (FR-07.15). RPE 0 means "not set" (unset -> omitted). */
  let {
    open = $bindable(false),
    onFinish,
  }: {
    open?: boolean
    onFinish: (params: { rpe?: number; notes?: string }) => void
  } = $props()

  let rpe = $state(0)
  let notes = $state('')

  $effect(() => {
    if (!open) return
    rpe = 0
    notes = ''
  })

  function handleFinish() {
    onFinish({ rpe: rpe > 0 ? rpe : undefined, notes: notes.trim() || undefined })
  }
</script>

<BottomSheet bind:open title="Finish session">
  <div class="form">
    <NumberStepper label="RPE (optional, 1–10)" bind:value={rpe} min={0} max={10} />
    <TextField label="Notes (optional)" bind:value={notes} placeholder="How did it go?" />
    <Button onclick={handleFinish}>Finish session</Button>
  </div>
</BottomSheet>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
  }
</style>
