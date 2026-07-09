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
  class="sheet"
  onclose={handleClose}
  onclick={handleBackdropClick}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sheet-content" onclick={(event) => event.stopPropagation()}>
    <div class="sheet-grabber" aria-hidden="true"></div>
    <div class="sheet-header">
      {#if title}<h2>{title}</h2>{/if}
      <IconButton icon="close" label="Close" onclick={handleClose} />
    </div>
    <div class="sheet-body">
      {@render children?.()}
    </div>
  </div>
</dialog>

<style>
  .sheet {
    padding: 0;
    border: none;
    background: transparent;
    width: 100%;
    max-width: 100%;
    margin: auto 0 0;
    max-height: 85vh;
  }
  .sheet::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
  .sheet-content {
    background: var(--surface);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding: var(--sp-4);
    padding-bottom: calc(var(--sp-4) + env(safe-area-inset-bottom, 0px));
    color: var(--text);
    max-height: 85vh;
    overflow-y: auto;
    box-sizing: border-box;
  }
  .sheet-grabber {
    width: 36px;
    height: 4px;
    background: var(--muted);
    border-radius: 999px;
    margin: 0 auto var(--sp-3);
    opacity: 0.5;
  }
  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--sp-3);
  }
  .sheet-header h2 {
    margin: 0;
    font-size: var(--fs-lg);
  }
</style>
