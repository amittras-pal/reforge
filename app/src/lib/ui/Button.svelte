<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    variant = 'secondary',
    size = 'md',
    type = 'button',
    disabled = false,
    onclick,
    children,
  }: {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    size?: 'sm' | 'md'
    type?: 'button' | 'submit'
    disabled?: boolean
    onclick?: (event: MouseEvent) => void
    children?: Snippet
  } = $props()
</script>

<button {type} class="btn btn-{variant} btn-{size}" {disabled} {onclick}>
  {@render children?.()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-2);
    min-height: var(--touch-target-min);
    padding: 0 var(--sp-4);
    border-radius: var(--radius-md);
    border: 1px solid transparent;
    font-size: var(--fs-md);
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition:
      filter 0.15s ease,
      opacity 0.15s ease;
  }
  .btn-sm {
    min-height: 36px;
    padding: 0 var(--sp-3);
    font-size: var(--fs-sm);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn:not(:disabled):hover {
    filter: brightness(0.95);
  }
  .btn-primary {
    background: var(--primary);
    color: white;
  }
  .btn-secondary {
    background: var(--surface);
    color: var(--text);
    border-color: var(--muted);
  }
  .btn-danger {
    background: var(--danger);
    color: white;
  }
  .btn-ghost {
    background: transparent;
    color: var(--text);
  }
</style>
