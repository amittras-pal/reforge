<script lang="ts">
  import { createId } from '../utils/ids'
  import Icon from './Icon.svelte'

  let {
    checked = $bindable(false),
    label,
    disabled = false,
    id,
    onchange,
  }: {
    checked?: boolean
    label: string
    disabled?: boolean
    id?: string
    onchange?: (checked: boolean) => void
  } = $props()

  const checkboxId = $derived(id ?? createId())

  function handleChange(event: Event & { currentTarget: HTMLInputElement }) {
    onchange?.(event.currentTarget.checked)
  }
</script>

<label class="checkbox-row" class:disabled for={checkboxId}>
  <input
    type="checkbox"
    class="input"
    id={checkboxId}
    bind:checked
    {disabled}
    onchange={handleChange}
  />
  <span class="box" class:checked aria-hidden="true">
    <Icon name={checked ? 'square-check' : 'square'} size={22} />
  </span>
  <span class="label">{label}</span>
</label>

<style>
  .checkbox-row {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: var(--touch-target-min);
    padding: var(--sp-2) 0;
    cursor: pointer;
  }
  .checkbox-row.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .input {
    /* Visually hidden but still focusable/clickable via the associated <label> — lets the
       checkbox render as accent-colored tabler icons (`.box`) instead of the native,
       OS-themed control, which stayed light/white-boxed even in dark mode. */
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .input:focus-visible + .box {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  .box {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--muted);
  }
  .box.checked {
    color: var(--primary);
  }
  .label {
    font-size: var(--fs-md);
    color: var(--text);
  }
</style>
