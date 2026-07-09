<script lang="ts">
  import { needRefresh, updateServiceWorker } from '../pwa/register'
  import Button from './Button.svelte'

  // FR-04.10/FR-04.11: non-blocking — stays up until the user acts, never auto-reloads. The
  // in-progress activeSession (if any) already lives in IndexedDB (F-03), so applying the
  // update is safe at any time.
  function refresh() {
    void updateServiceWorker()
  }

  function dismiss() {
    needRefresh.set(false)
  }
</script>

{#if $needRefresh}
  <div class="update-banner" role="status">
    <span>Update available</span>
    <div class="actions">
      <Button size="sm" variant="ghost" onclick={dismiss}>Later</Button>
      <Button size="sm" variant="primary" onclick={refresh}>Refresh</Button>
    </div>
  </div>
{/if}

<style>
  .update-banner {
    position: fixed;
    left: 50%;
    bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    width: min(360px, calc(100vw - var(--sp-6)));
    padding: var(--sp-3);
    border-radius: var(--radius-md);
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  .actions {
    display: flex;
    gap: var(--sp-2);
    flex-shrink: 0;
  }

  @media (min-width: 900px) {
    .update-banner {
      bottom: var(--sp-4);
    }
  }
</style>
