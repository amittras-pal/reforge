<script lang="ts">
  import Icon from './Icon.svelte'

  let {
    label,
    variant = 'default',
    onRemove,
  }: {
    label: string
    variant?: 'default' | 'success' | 'warning' | 'danger'
    onRemove?: () => void
  } = $props()
</script>

<span class="chip chip-{variant}">
  {label}
  {#if onRemove}
    <button
      type="button"
      class="chip-remove"
      onclick={onRemove}
      aria-label={`Remove ${label}`}
    >
      <Icon name="close" size={12} />
    </button>
  {/if}
</span>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-1);
    padding: var(--sp-1) var(--sp-3);
    border-radius: 999px;
    background: var(--surface);
    color: var(--text);
    font-size: var(--fs-xs);
    font-weight: 600;
  }
  .chip-success {
    background: color-mix(in srgb, var(--success) 18%, var(--surface));
    color: var(--success);
  }
  .chip-warning {
    background: color-mix(in srgb, var(--warning) 18%, var(--surface));
    color: var(--warning);
  }
  .chip-danger {
    background: color-mix(in srgb, var(--danger) 18%, var(--surface));
    color: var(--danger);
  }
  .chip-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
</style>
