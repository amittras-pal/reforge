<script lang="ts">
  import { loadExampleProgram } from './exampleProgram'
  import { showToast } from '../../lib/stores/toast'
  import Button from '../../lib/ui/Button.svelte'
  import ConfirmDialog from '../../lib/ui/ConfirmDialog.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'

  /**
   * `onDismiss` is only passed by Settings (Notes for Improvement.md: permanently dismissible
   * there) — omitted when this card is shown as an empty-state nudge (e.g. Routines screen),
   * where it naturally disappears once routines exist and a separate dismiss action doesn't
   * make sense. `onLoaded` lets the caller react to a successful load (Settings uses it to
   * auto-dismiss, since there's no reason to keep nudging once the program's been loaded).
   */
  let { onLoaded, onDismiss }: { onLoaded?: () => void; onDismiss?: () => void } = $props()

  let confirmOpen = $state(false)
  let loading = $state(false)

  async function handleLoad() {
    loading = true
    try {
      await loadExampleProgram()
      showToast('Example program loaded — edit or remove it anytime', 'success')
      onLoaded?.()
    } catch {
      showToast("Couldn't load the example program. Please try again.", 'error')
    } finally {
      loading = false
    }
  }
</script>

<div class="example-program">
  {#if onDismiss}
    <div class="dismiss-row">
      <IconButton icon="close" label="Dismiss" onclick={onDismiss} />
    </div>
  {/if}
  <p class="hint">
    Not sure where to start? Load a ready-made 6-day Upper/Lower + Zone 2/core + PFMT program.
    It's fully editable and can be removed at any time — nothing loads automatically.
  </p>
  <Button variant="secondary" onclick={() => (confirmOpen = true)} disabled={loading}>
    {loading ? 'Loading…' : 'Load example program'}
  </Button>
</div>

<ConfirmDialog
  bind:open={confirmOpen}
  title="Load example program?"
  message="Adds a starter set of exercises, routines, and a weekly schedule. You can edit or delete any of it afterward."
  confirmLabel="Load"
  onConfirm={handleLoad}
/>

<style>
  .example-program {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    align-items: center;
    text-align: center;
    padding: 0 var(--sp-4) var(--sp-4);
  }
  .dismiss-row {
    position: absolute;
    top: calc(-1 * var(--sp-2));
    right: 0;
  }
  .hint {
    margin: 0;
    color: var(--muted);
    font-size: var(--fs-sm);
    max-width: 48ch;
  }
</style>
