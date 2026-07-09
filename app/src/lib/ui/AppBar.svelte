<script lang="ts">
  import { appBarAction, pageTitle } from '../stores/shell'
  import { offlineReadyPulse } from '../pwa/register'
</script>

<header class="app-bar">
  <h1 class="title">
    {$pageTitle}
    {#if $offlineReadyPulse}
      <span
        class="offline-ready-dot"
        title="Ready to work offline"
        aria-hidden="true"
      ></span>
    {/if}
  </h1>
  {#if $appBarAction}
    {@const action = $appBarAction}
    <button type="button" class="action" onclick={action.onClick}>
      {action.label}
    </button>
  {/if}
</header>

<style>
  .app-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    min-height: 56px;
    padding: var(--sp-2) var(--sp-4);
    padding-top: calc(var(--sp-2) + env(safe-area-inset-top, 0px));
    background: var(--bg);
    border-bottom: 1px solid var(--surface);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .title {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* FR-04.13: subtle, non-blocking "ready to work offline" pulse; auto-dismissed by the
     offlineReadyPulse store after ~2s, and neutralized globally under reduced-motion. */
  .offline-ready-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--success);
    animation: offline-ready-pulse 1s ease-in-out infinite;
  }
  @keyframes offline-ready-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
  .action {
    flex-shrink: 0;
    min-height: 44px;
    padding: 0 var(--sp-3);
    border: none;
    background: transparent;
    color: var(--primary);
    font-weight: 600;
    font-size: var(--fs-md);
    font-family: inherit;
    cursor: pointer;
    border-radius: var(--radius-md);
  }
  .action:hover {
    background: var(--surface);
  }
</style>
