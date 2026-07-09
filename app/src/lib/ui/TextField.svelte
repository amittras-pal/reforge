<script lang="ts">
  import { createId } from '../utils/ids'

  let {
    value = $bindable(''),
    label,
    type = 'text',
    placeholder,
    disabled = false,
    id,
    oninput,
  }: {
    value?: string
    label?: string
    type?: 'text' | 'number' | 'date' | 'email' | 'password'
    placeholder?: string
    disabled?: boolean
    id?: string
    oninput?: (event: Event & { currentTarget: HTMLInputElement }) => void
  } = $props()

  const fieldId = $derived(id ?? createId())
</script>

<div class="field">
  {#if label}
    <label for={fieldId}>{label}</label>
  {/if}
  <input
    id={fieldId}
    class="input"
    {type}
    {placeholder}
    {disabled}
    bind:value
    {oninput}
  />
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  label {
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .input {
    min-height: var(--touch-target-min);
    padding: 0 var(--sp-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--muted);
    background: var(--bg);
    color: var(--text);
    font-size: var(--fs-md);
    font-family: inherit;
  }
  .input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
