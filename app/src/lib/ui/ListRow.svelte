<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    subtitle,
    leading,
    trailing,
    onclick,
  }: {
    title: string
    subtitle?: string
    leading?: Snippet
    trailing?: Snippet
    onclick?: () => void
  } = $props()
</script>

{#if onclick}
  <button type="button" class="list-row" {onclick}>
    {#if leading}
      <span class="leading">{@render leading()}</span>
    {/if}
    <span class="content">
      <span class="title">{title}</span>
      {#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
    </span>
    {#if trailing}
      <span class="trailing">{@render trailing()}</span>
    {/if}
  </button>
{:else}
  <div class="list-row">
    {#if leading}
      <span class="leading">{@render leading()}</span>
    {/if}
    <span class="content">
      <span class="title">{title}</span>
      {#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
    </span>
    {#if trailing}
      <span class="trailing">{@render trailing()}</span>
    {/if}
  </div>
{/if}

<style>
  .list-row {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    min-height: var(--touch-target-min);
    padding: var(--sp-2) var(--sp-3);
    width: 100%;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    text-align: left;
    font-family: inherit;
    color: var(--text);
    box-sizing: border-box;
  }
  button.list-row {
    cursor: pointer;
  }
  button.list-row:hover {
    background: var(--surface);
  }
  .content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .title {
    font-size: var(--fs-md);
  }
  .subtitle {
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .leading,
  .trailing {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
</style>
