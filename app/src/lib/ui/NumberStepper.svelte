<script lang="ts">
  import Icon from './Icon.svelte'

  let {
    value = $bindable(0),
    min,
    max,
    step = 1,
    label,
  }: {
    value?: number
    min?: number
    max?: number
    step?: number
    label?: string
  } = $props()

  function clamp(next: number): number {
    let result = next
    if (min !== undefined) result = Math.max(min, result)
    if (max !== undefined) result = Math.min(max, result)
    return result
  }

  function decrement() {
    value = clamp(value - step)
  }

  function increment() {
    value = clamp(value + step)
  }
</script>

<div class="stepper">
  {#if label}
    <span class="stepper-label">{label}</span>
  {/if}
  <div class="stepper-controls">
    <button
      type="button"
      class="stepper-btn"
      onclick={decrement}
      disabled={min !== undefined && value <= min}
      aria-label={label ? `Decrease ${label}` : 'Decrease'}
    >
      <Icon name="minus" size={16} />
    </button>
    <span class="stepper-value" aria-live="polite">{value}</span>
    <button
      type="button"
      class="stepper-btn"
      onclick={increment}
      disabled={max !== undefined && value >= max}
      aria-label={label ? `Increase ${label}` : 'Increase'}
    >
      <Icon name="plus" size={16} />
    </button>
  </div>
</div>

<style>
  .stepper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
  }
  .stepper-label {
    font-size: var(--fs-md);
    color: var(--text);
  }
  .stepper-controls {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }
  .stepper-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--touch-target-min);
    height: var(--touch-target-min);
    border-radius: var(--radius-md);
    border: 1px solid var(--muted);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .stepper-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .stepper-value {
    min-width: 2.5em;
    text-align: center;
    font-size: var(--fs-lg);
    font-variant-numeric: tabular-nums;
  }
</style>
