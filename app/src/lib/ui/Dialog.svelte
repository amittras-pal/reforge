<script lang="ts">
  import type { Snippet } from 'svelte'
  import IconButton from './IconButton.svelte'

  let {
    open = $bindable(false),
    title,
    children,
  }: { open?: boolean; title?: string; children?: Snippet } = $props()

  let dialogEl: HTMLDialogElement | undefined = $state()

  $effect(() => {
    if (!dialogEl) return
    if (open && !dialogEl.open) {
      dialogEl.showModal()
    } else if (!open && dialogEl.open) {
      dialogEl.close()
    }
  })

  function handleClose() {
    open = false
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === dialogEl) {
      open = false
    }
  }
</script>

<dialog
  bind:this={dialogEl}
  class="dialog"
  onclose={handleClose}
  onclick={handleBackdropClick}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dialog-content" onclick={(event) => event.stopPropagation()}>
    <div class="dialog-header">
      {#if title}<h2>{title}</h2>{/if}
      <IconButton icon="close" label="Close dialog" onclick={handleClose} />
    </div>
    <div class="dialog-body">
      {@render children?.()}
    </div>
  </div>
</dialog>

<style>
  .dialog {
    padding: 0;
    border: none;
    border-radius: var(--radius-lg);
    background: transparent;
    max-width: min(480px, 90vw);
    width: 100%;
    margin: auto;
  }
  .dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
  .dialog-content {
    background: var(--surface);
    border-radius: var(--radius-lg);
    padding: var(--sp-4);
    color: var(--text);
  }
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    margin-bottom: var(--sp-3);
  }
  .dialog-header h2 {
    margin: 0;
    font-size: var(--fs-lg);
  }
  .dialog-body {
    font-size: var(--fs-md);
  }
</style>
