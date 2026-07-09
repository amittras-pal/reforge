<script lang="ts">
  import { untrack } from 'svelte'
  import type { LoggedItem, LoggedSet } from '../../lib/domain'
  import Card from '../../lib/ui/Card.svelte'
  import Checkbox from '../../lib/ui/Checkbox.svelte'
  import Chip from '../../lib/ui/Chip.svelte'
  import IconButton from '../../lib/ui/IconButton.svelte'
  import TextField from '../../lib/ui/TextField.svelte'
  import { formatPrescriptionSummary } from '../configurator/prescriptionSummary'
  import { fillSetsFromPlan } from './checklistService'
  import DurationConfirmSheet from './DurationConfirmSheet.svelte'
  import SetsRepsLogger from './SetsRepsLogger.svelte'
  import DurationLogger from './DurationLogger.svelte'

  /**
   * One checklist row (FR-07.5, FR-07.8, FR-07.9, FR-07.10, FR-07.11): name + prescription
   * summary, a completed checkbox, an expandable actuals editor, and a skip toggle with an
   * optional reason.
   */
  let {
    item,
    onChange,
  }: {
    item: LoggedItem
    onChange: (patch: Partial<LoggedItem>) => void
  } = $props()

  let expanded = $state(false)
  let skipReasonInput = $state(untrack(() => item.notes ?? ''))
  // Lifted out of DurationLogger/Stopwatch (rather than owned there) so the stopwatch's progress
  // survives the accordion collapsing, and so marking-complete below can read/stop it.
  let stopwatchElapsedSec = $state(0)
  let stopwatchRunning = $state(false)
  let durationConfirmOpen = $state(false)

  function toggleExpanded() {
    expanded = !expanded
  }

  /**
   * Marking an exercise complete from the header autofills only the actual fields the user left
   * empty, from the plan (product decision, not in the original FR list):
   * - sets_reps: fills each empty set's reps/weight from the plan and marks every set done,
   *   leaving sets the user already filled in untouched.
   * - duration: the running stopwatch (if any) is the source of truth — stop it and record its
   *   elapsed time. If there's already a manually-entered actual, use that as-is. Otherwise (the
   *   stopwatch was never started) ask the user to confirm the actual duration instead of
   *   guessing.
   */
  function handleCompletedChange(completed: boolean) {
    if (!completed) {
      onChange({ completed })
      return
    }
    if (item.type === 'sets_reps' && item.planned.kind === 'sets_reps') {
      onChange({
        completed,
        setResults: fillSetsFromPlan(item.setResults ?? [], item.planned),
      })
      return
    }
    if (item.type === 'duration' && item.planned.kind === 'duration') {
      if (stopwatchRunning) {
        stopwatchRunning = false
        onChange({ completed, actualDurationSec: stopwatchElapsedSec })
        return
      }
      if (item.actualDurationSec !== undefined) {
        onChange({ completed })
        return
      }
      // No recorded actual and the stopwatch was never used — keep `completed` false until the
      // user confirms a duration (also re-syncs the checkbox if it optimistically toggled).
      onChange({ completed: false })
      durationConfirmOpen = true
      return
    }
    onChange({ completed })
  }

  function handleDurationConfirm(durationSec: number) {
    onChange({ completed: true, actualDurationSec: durationSec })
  }

  function toggleSkipped() {
    onChange({ skipped: !item.skipped, completed: false })
  }

  function handleSkipReasonInput(event: Event & { currentTarget: HTMLInputElement }) {
    const raw = event.currentTarget.value
    onChange({ notes: raw.trim() || undefined })
  }

  function handleSetChange(setNo: number, patch: Partial<LoggedSet>) {
    const setResults = (item.setResults ?? []).map((set) =>
      set.setNo === setNo ? { ...set, ...patch } : set,
    )
    onChange({ setResults })
  }

  function handleDurationChange(patch: {
    actualDurationSec?: number
    actualDistanceMeters?: number
    actualAvgHr?: number
  }) {
    onChange(patch)
  }
</script>

<Card>
  <div class="row" class:done={item.completed} class:skipped={item.skipped}>
    <div class="row-main">
      <button type="button" class="info" onclick={toggleExpanded}>
        <span class="name">{item.nameSnapshot}</span>
        <span class="summary">{formatPrescriptionSummary(item.planned)}</span>
      </button>
      {#if item.skipped}
        <Chip label="Skipped" variant="warning" />
      {/if}
      <IconButton
        icon={expanded ? 'chevron-up' : 'chevron-down'}
        label={expanded ? 'Collapse' : 'Expand'}
        onclick={toggleExpanded}
      />
    </div>
    <Checkbox
      label={`Mark ${item.nameSnapshot} complete`}
      checked={item.completed}
      disabled={item.skipped}
      onchange={handleCompletedChange}
    />
  </div>

  {#if expanded}
    <div class="details">
      {#if item.skipped}
        <TextField
          label="Skip reason (optional)"
          bind:value={skipReasonInput}
          oninput={handleSkipReasonInput}
        />
      {:else if item.type === 'sets_reps' && item.planned.kind === 'sets_reps'}
        <SetsRepsLogger
          planned={item.planned}
          setResults={item.setResults ?? []}
          onChangeSet={handleSetChange}
        />
      {:else if item.type === 'duration' && item.planned.kind === 'duration'}
        <DurationLogger
          planned={item.planned}
          actualDurationSec={item.actualDurationSec}
          actualDistanceMeters={item.actualDistanceMeters}
          actualAvgHr={item.actualAvgHr}
          bind:stopwatchElapsedSec
          bind:stopwatchRunning
          onChange={handleDurationChange}
        />
      {/if}
      <button type="button" class="skip-toggle" onclick={toggleSkipped}>
        {item.skipped ? 'Unskip' : 'Skip this exercise'}
      </button>
    </div>
  {/if}
</Card>

<DurationConfirmSheet
  bind:open={durationConfirmOpen}
  plannedDurationSec={item.planned.kind === 'duration' ? item.planned.durationSec : 0}
  onConfirm={handleDurationConfirm}
/>

<style>
  .row {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .row-main {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }
  .row.done .name {
    text-decoration: line-through;
    color: var(--muted);
  }
  .row.skipped .name {
    color: var(--muted);
    font-style: italic;
  }
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    padding: var(--sp-2) 0;
  }
  .name {
    font-size: var(--fs-md);
    color: var(--text);
  }
  .summary {
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .details {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    margin-top: var(--sp-3);
    padding-top: var(--sp-3);
    border-top: 1px solid var(--surface);
  }
  .skip-toggle {
    align-self: flex-start;
    border: none;
    background: transparent;
    color: var(--danger);
    font-family: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    cursor: pointer;
    padding: var(--sp-2) 0;
    min-height: var(--touch-target-min);
  }
</style>
