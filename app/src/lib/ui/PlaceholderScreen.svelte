<script lang="ts">
  import { pageTitle } from '../stores/shell'
  import Card from './Card.svelte'
  import Chip from './Chip.svelte'
  import EmptyState from './EmptyState.svelte'
  import ListRow from './ListRow.svelte'

  let {
    title,
    spec,
    params = {},
  }: { title: string; spec: string; params?: Record<string, string> } = $props()

  $effect(() => {
    pageTitle.set(title)
  })

  const paramEntries = $derived(Object.entries(params))
</script>

<div class="placeholder">
  <EmptyState
    {title}
    message={`This screen will be built as part of ${spec}.`}
  />
  <div class="badge-row"><Chip label={spec} /></div>
  {#if paramEntries.length > 0}
    <Card>
      <p class="params-label">Route params (proves deep-linking works):</p>
      {#each paramEntries as [key, value] (key)}
        <ListRow title={key} subtitle={value} />
      {/each}
    </Card>
  {/if}
</div>

<style>
  .placeholder {
    display: flex;
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-4);
  }
  .badge-row {
    display: flex;
    justify-content: center;
  }
  .params-label {
    margin: 0 0 var(--sp-2);
    font-size: var(--fs-sm);
    color: var(--muted);
  }
</style>
