<script lang="ts">
  import { untrack } from 'svelte'
  import type { SessionLog } from '../../lib/domain'
  import { showToast } from '../../lib/stores/toast'
  import Button from '../../lib/ui/Button.svelte'
  import Card from '../../lib/ui/Card.svelte'
  import Chip from '../../lib/ui/Chip.svelte'
  import ConfirmDialog from '../../lib/ui/ConfirmDialog.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import NumberStepper from '../../lib/ui/NumberStepper.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import { deleteSession, updateSessionFields } from './recorderService'
  import SessionItemDetail from './SessionItemDetail.svelte'

  /**
   * One saved session, full detail (FR-08.8, FR-08.9). Only `rpe`/`notes` are editable
   * (FR-08.10) — everything else is read-only history. Deleting only removes this log
   * (FR-08.11/FR-08.13).
   */
  let { session, onDeleted }: { session: SessionLog; onDeleted?: () => void } = $props()

  let rpe = $state(untrack(() => session.rpe ?? 0))
  let notes = $state(untrack(() => session.notes ?? ''))
  let confirmDeleteOpen = $state(false)
  let saving = $state(false)

  const isDirty = $derived(
    (rpe > 0 ? rpe : undefined) !== session.rpe || (notes.trim() || undefined) !== session.notes,
  )

  async function handleSaveNotes() {
    const nextRpe = rpe > 0 ? rpe : undefined
    const nextNotes = notes.trim() || undefined
    saving = true
    try {
      await updateSessionFields(session.id, { rpe: nextRpe, notes: nextNotes })
      showToast('Saved', 'success')
    } catch {
      showToast("Couldn't save changes. Please try again.", 'error')
    } finally {
      saving = false
    }
  }

  async function handleDelete() {
    try {
      await deleteSession(session.id)
      showToast('Session deleted', 'success')
      onDeleted?.()
    } catch {
      showToast("Couldn't delete the session. Please try again.", 'error')
    }
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
</script>

<Card>
  <div class="header">
    <div class="title-block">
      <h3>{session.routineNameSnapshot}</h3>
      <p class="meta">
        Recorded at {formatTime(session.startedAt)} - {formatTime(session.completedAt)}
      </p>
    </div>
    <div class="header-actions">
      <Chip
        label={session.status === 'completed' ? 'Completed' : 'Partial'}
        variant={session.status === 'completed' ? 'success' : 'warning'}
      />
      <IconButton icon="trash" label="Delete session" onclick={() => (confirmDeleteOpen = true)} />
    </div>
  </div>

  <div class="items">
    {#each session.items as item (item.exerciseId)}
      <SessionItemDetail {item} />
    {/each}
  </div>

  <div class="editable">
    <NumberStepper label="RPE (optional, 1–10)" bind:value={rpe} min={0} max={10} />
    <TextField label="Notes (optional)" bind:value={notes} placeholder="How did it go?" />
    <Button size="sm" onclick={handleSaveNotes} disabled={!isDirty || saving}>
      {saving ? 'Saving…' : 'Save'}
    </Button>
  </div>
</Card>

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Delete session?"
  message="This permanently removes this session from your history. This can't be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={handleDelete}
/>

<style>
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sp-3);
  }
  .title-block h3 {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--text);
  }
  .meta {
    margin: var(--sp-1) 0 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-shrink: 0;
  }
  .items {
    margin-top: var(--sp-3);
  }
  .editable {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    margin-top: var(--sp-4);
    padding-top: var(--sp-3);
    border-top: 1px solid var(--bg);
  }
  .editable :global(.btn) {
    align-self: flex-end;
  }
</style>
