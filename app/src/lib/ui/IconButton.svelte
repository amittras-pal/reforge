<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte'

  let {
    icon,
    label,
    variant = 'ghost',
    onclick,
    disabled = false,
  }: {
    icon: IconName
    label: string
    variant?: 'ghost' | 'primary'
    onclick?: (event: MouseEvent) => void
    disabled?: boolean
  } = $props()
</script>

<button
  type="button"
  class="icon-btn icon-btn-{variant}"
  aria-label={label}
  title={label}
  {disabled}
  {onclick}
>
  <Icon name={icon} />
</button>

<style>
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--touch-target-min);
    height: var(--touch-target-min);
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    flex-shrink: 0;
  }
  .icon-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .icon-btn-ghost {
    background: transparent;
  }
  .icon-btn-ghost:not(:disabled):hover {
    background: var(--surface);
  }
  .icon-btn-primary {
    background: var(--primary);
    color: white;
  }
</style>
