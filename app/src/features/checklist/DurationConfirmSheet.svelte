<script lang="ts">
  import BottomSheet from '../../lib/ui/BottomSheet.svelte'
  import Button from '../../lib/ui/Button.svelte'
  import TextField from '../../lib/ui/TextField.svelte'

  /**
   * Asks the user to confirm the actual duration when marking a `duration` exercise complete
   * from the header checkbox while its stopwatch was never started (so there's no recorded
   * actual to fall back on). The plan's duration is offered as an editable default to confirm
   * or adjust, rather than silently guessing.
   */
  let {
    open = $bindable(false),
    plannedDurationSec,
    onConfirm,
  }: {
    open?: boolean
    plannedDurationSec: number
    onConfirm: (durationSec: number) => void
  } = $props()

  let minutesInput = $state('')
  let errorMessage = $state<string | null>(null)

  // Re-seed from the plan every time the sheet opens, so a previous item's edits don't leak in.
  $effect(() => {
    if (!open) return
    minutesInput = String(Math.round((plannedDurationSec / 60) * 10) / 10)
    errorMessage = null
  })

  // `minutesInput` is declared/bound as a string (TextField's bindable `value` contract), but
  // Svelte coerces a `type="number"` input's bound value to a real number (or undefined when
  // empty) at runtime regardless of that declared type — accept the wider, runtime-accurate
  // type here rather than trusting the declared one.
  function parseMinutes(value: string | number | undefined): number | undefined {
    if (typeof value === 'number') return value
    if (value === undefined || value.trim() === '') return undefined
    const parsed = Number(value)
    return Number.isNaN(parsed) ? undefined : parsed
  }

  function handleConfirm() {
    const minutes = parseMinutes(minutesInput)
    if (minutes === undefined || minutes < 0) {
      errorMessage = 'Enter a valid duration.'
      return
    }
    onConfirm(Math.round(minutes * 60))
    open = false
  }
</script>

<BottomSheet bind:open title="Confirm duration">
  <div class="form">
    <p class="hint">The stopwatch wasn't used for this exercise — confirm how long you spent.</p>
    <TextField label="Duration (min)" type="number" bind:value={minutesInput} />
    {#if errorMessage}
      <p class="error-text">{errorMessage}</p>
    {/if}
    <Button onclick={handleConfirm}>Confirm</Button>
  </div>
</BottomSheet>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: var(--fs-sm);
  }
  .error-text {
    margin: 0;
    color: var(--danger);
    font-size: var(--fs-sm);
  }
</style>
