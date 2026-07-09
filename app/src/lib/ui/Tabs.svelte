<script lang="ts">
  let {
    tabs,
    value = $bindable(''),
    onchange,
  }: {
    tabs: { label: string; value: string }[]
    value?: string
    /** Fired after `value` updates — useful when the active tab is driven by something else
     * (e.g. the router) instead of purely local state. */
    onchange?: (value: string) => void
  } = $props()
</script>

<div class="tabs" role="tablist">
  {#each tabs as tab (tab.value)}
    <button
      type="button"
      role="tab"
      aria-selected={tab.value === value}
      class="tab"
      class:active={tab.value === value}
      onclick={() => {
        value = tab.value
        onchange?.(tab.value)
      }}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    border-bottom: 1px solid var(--surface);
    overflow-x: auto;
  }
  .tab {
    flex-shrink: 0;
    min-height: var(--touch-target-min);
    padding: 0 var(--sp-4);
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--muted);
    font-size: var(--fs-md);
    font-family: inherit;
    cursor: pointer;
  }
  .tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    font-weight: 600;
  }
</style>
