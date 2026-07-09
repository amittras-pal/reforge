<script lang="ts">
  import { dismissToast, toasts } from '../stores/toast'
  import IconButton from './IconButton.svelte'
</script>

<div class="toast-region" role="status" aria-live="polite">
  {#each $toasts as toast (toast.id)}
    <div class="toast toast-{toast.variant}">
      <span>{toast.message}</span>
      <IconButton
        icon="close"
        label="Dismiss notification"
        onclick={() => dismissToast(toast.id)}
      />
    </div>
  {/each}
</div>

<style>
  .toast-region {
    position: fixed;
    left: 50%;
    bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
    z-index: 30;
    width: min(360px, calc(100vw - var(--sp-6)));
  }
  .toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-md);
    background: var(--text);
    color: var(--bg);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  .toast-success {
    background: var(--success);
    color: white;
  }
  .toast-error {
    background: var(--danger);
    color: white;
  }

  @media (min-width: 900px) {
    .toast-region {
      bottom: var(--sp-4);
    }
  }
</style>
