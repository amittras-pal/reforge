<script lang="ts">
  let {
    options,
    value = $bindable(''),
    label,
  }: {
    options: { label: string; value: string }[]
    value?: string
    label?: string
  } = $props()
</script>

<div class="segmented-field">
  {#if label}
    <span class="segmented-label">{label}</span>
  {/if}
  <div class="segmented" role="radiogroup" aria-label={label}>
    {#each options as option (option.value)}
      <button
        type="button"
        role="radio"
        aria-checked={option.value === value}
        class="segment"
        class:active={option.value === value}
        onclick={() => (value = option.value)}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .segmented-field {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .segmented-label {
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .segmented {
    display: flex;
    background: var(--bg);
    border-radius: var(--radius-md);
    padding: 2px;
    gap: 2px;
  }
  .segment {
    flex: 1;
    min-height: 40px;
    padding: 0 var(--sp-2);
    border: none;
    border-radius: calc(var(--radius-md) - 2px);
    background: transparent;
    color: var(--text);
    font-size: var(--fs-sm);
    font-family: inherit;
    cursor: pointer;
  }
  .segment.active {
    background: var(--surface);
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
</style>
