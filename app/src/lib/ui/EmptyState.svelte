<script lang="ts">
  import Button from './Button.svelte'

  let {
    title,
    message,
    actionLabel,
    onAction,
  }: {
    title: string
    message?: string
    actionLabel?: string
    onAction?: () => void
  } = $props()
</script>

<div class="empty-state">
  <h3>{title}</h3>
  {#if message}
    <p>{message}</p>
  {/if}
  {#if actionLabel && onAction}
    <Button variant="primary" onclick={onAction}>{actionLabel}</Button>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--sp-2);
    padding: var(--sp-6) var(--sp-4);
    color: var(--muted);
  }
  h3 {
    margin: 0;
    color: var(--text);
    font-size: var(--fs-lg);
  }
  p {
    margin: 0 0 var(--sp-2);
    font-size: var(--fs-md);
    max-width: 40ch;
  }
</style>
