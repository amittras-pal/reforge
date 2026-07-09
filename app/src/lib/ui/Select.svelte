<script lang="ts">
  import { createId } from '../utils/ids'
  import Icon from './Icon.svelte'

  let {
    value = $bindable(''),
    options,
    label,
    id,
  }: {
    value?: string
    options: { label: string; value: string }[]
    label?: string
    id?: string
  } = $props()

  const selectId = $derived(id ?? createId())
</script>

<div class="field">
  {#if label}
    <label for={selectId}>{label}</label>
  {/if}
  <div class="select-wrap">
    <select id={selectId} class="select" bind:value>
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <span class="chevron" aria-hidden="true"
      ><Icon name="chevron-down" size={16} /></span
    >
  </div>
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
  .select-wrap {
    position: relative;
  }
  .select {
    width: 100%;
    min-height: var(--touch-target-min);
    padding: 0 var(--sp-6) 0 var(--sp-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--muted);
    background: var(--bg);
    color: var(--text);
    font-size: var(--fs-md);
    font-family: inherit;
    appearance: none;
  }
  .chevron {
    position: absolute;
    right: var(--sp-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
  }
</style>
