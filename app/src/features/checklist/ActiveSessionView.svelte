<script lang="ts">
  import { untrack } from 'svelte'
  import type { ActiveSession, LoggedItem } from '../../lib/domain'
  import { activeSessionRepo } from '../../lib/db'
  import { appBarAction, pageTitle } from '../../lib/stores/shell'
  import { showToast } from '../../lib/stores/toast'
  import {
    todayLocalDate,
    weekdayFromLocalDate,
    yesterdayLocalDate,
  } from '../../lib/utils'
  import Card from '../../lib/ui/Card.svelte'
  import ConfirmDialog from '../../lib/ui/ConfirmDialog.svelte'
  import SegmentedControl from '../../lib/ui/SegmentedControl.svelte'
  import { discardSession, finishSession, sessionProgress } from './checklistService'
  import ExerciseLogRow from './ExerciseLogRow.svelte'
  import FinishSessionSheet from './FinishSessionSheet.svelte'

  /**
   * The interactive, in-progress checklist (FR-07.8 through FR-07.15). Owns a local editable
   * copy of `session.items`, persisting changes back via a debounced `activeSessionRepo.patch`
   * (FR-07.13); the parent screen's `liveQuery` on `activeSessionRepo` picks up Finish/Discard
   * automatically and swaps this view out once the draft is cleared.
   */
  let { session }: { session: ActiveSession } = $props()

  let items = $state<LoggedItem[]>(untrack(() => session.items.map((item) => ({ ...item }))))
  let dateValue = $state(untrack(() => session.date))
  let finishSheetOpen = $state(false)
  let confirmDiscardOpen = $state(false)

  const progress = $derived(sessionProgress(items))
  const dateOptions = [
    { label: 'Today', value: todayLocalDate() },
    { label: 'Yesterday', value: yesterdayLocalDate() },
  ]

  // Debounced persistence of item edits (FR-07.13). $state.snapshot is required: `items` is a
  // Svelte 5 reactive Proxy and Dexie can't structured-clone it directly.
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  $effect(() => {
    const snapshot = $state.snapshot(items)
    saveTimer = setTimeout(() => {
      activeSessionRepo.patch({ items: snapshot }).catch(() => {
        showToast("Couldn't save your progress. Please try again.", 'error')
      })
    }, 300)
    return () => clearTimeout(saveTimer)
  })

  // Date chip (Today/Yesterday, FR-07.20) — persists immediately, no debounce needed for a tap.
  $effect(() => {
    if (dateValue === session.date) return
    const weekday = weekdayFromLocalDate(dateValue)
    activeSessionRepo.patch({ date: dateValue, weekday }).catch(() => {
      showToast("Couldn't update the session date. Please try again.", 'error')
    })
  })

  $effect(() => {
    pageTitle.set(session.routineNameSnapshot)
    appBarAction.set({ label: 'Finish', onClick: () => (finishSheetOpen = true) })
    return () => appBarAction.set(null)
  })

  function handleItemChange(index: number, patch: Partial<LoggedItem>) {
    items = items.map((item, i) => (i === index ? { ...item, ...patch } : item))
  }

  async function handleFinish(params: { rpe?: number; notes?: string }) {
    try {
      await finishSession(params)
      finishSheetOpen = false
      showToast('Session finished', 'success')
    } catch {
      showToast("Couldn't finish the session. Please try again.", 'error')
    }
  }

  async function handleDiscard() {
    try {
      await discardSession()
      showToast('Session discarded', 'success')
    } catch {
      showToast("Couldn't discard the session. Please try again.", 'error')
    }
  }
</script>

<div class="screen">
  <Card>
    <div class="header">
      <div class="header-top">
        <h2>{session.routineNameSnapshot}</h2>
        <SegmentedControl options={dateOptions} bind:value={dateValue} />
      </div>
      <div class="header-stats">
        <span>{progress.done} / {progress.total} done</span>
      </div>
    </div>
  </Card>

  <div class="items">
    {#each items as item, i (item.exerciseId + '-' + i)}
      <ExerciseLogRow {item} onChange={(patch) => handleItemChange(i, patch)} />
    {/each}
  </div>

  <button type="button" class="discard-link" onclick={() => (confirmDiscardOpen = true)}>
    Discard session
  </button>
</div>

<FinishSessionSheet bind:open={finishSheetOpen} onFinish={handleFinish} />

<ConfirmDialog
  bind:open={confirmDiscardOpen}
  title="Discard session?"
  message="This clears your in-progress checklist without saving it to your history. This can't be undone."
  confirmLabel="Discard"
  variant="danger"
  onConfirm={handleDiscard}
/>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-4);
  }
  .header {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
  }
  .header h2 {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--text);
  }
  .header-stats {
    display: flex;
    gap: var(--sp-4);
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .discard-link {
    align-self: center;
    border: none;
    background: transparent;
    color: var(--danger);
    font-family: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    cursor: pointer;
    min-height: var(--touch-target-min);
  }
</style>
