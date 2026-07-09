<script lang="ts">
  import type { LoggedItem } from '../../lib/domain'
  import Chip from '../../lib/ui/Chip.svelte'
  import { formatDuration } from '../../lib/utils'
  import { formatPrescriptionSummary } from '../configurator/prescriptionSummary'

  /** Read-only planned-vs-actual display for one logged item (FR-08.9, FR-08.12). */
  let { item }: { item: LoggedItem } = $props()
</script>

<div class="item">
  <div class="item-header">
    <span class="name">{item.nameSnapshot}</span>
    {#if item.skipped}
      <Chip label="Skipped" variant="warning" />
    {:else if item.completed}
      <Chip label="Done" variant="success" />
    {:else}
      <Chip label="Not done" />
    {/if}
  </div>
  <p class="planned">Planned: {formatPrescriptionSummary(item.planned)}</p>

  {#if !item.skipped && item.type === 'sets_reps' && item.setResults}
    <table class="sets-table">
      <thead>
        <tr>
          <th>Set</th>
          <th>Reps</th>
          <th>Weight (kg)</th>
          <th>Done</th>
        </tr>
      </thead>
      <tbody>
        {#each item.setResults as set (set.setNo)}
          <tr>
            <td>{set.setNo}</td>
            <td>{set.reps ?? '\u2014'}</td>
            <td>{set.weight ?? '\u2014'}</td>
            <td>{set.done ? '\u2713' : '\u2014'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else if !item.skipped && item.type === 'duration'}
    <p class="actual">
      Actual:
      {item.actualDurationSec !== undefined ? formatDuration(item.actualDurationSec) : 'Not logged'}
      {#if item.actualDistanceMeters !== undefined}
        · {(item.actualDistanceMeters / 1000).toFixed(1)}km
      {/if}
      {#if item.actualAvgHr !== undefined}
        · {item.actualAvgHr} bpm avg
      {/if}
    </p>
  {/if}

  {#if item.notes}
    <p class="notes">{item.skipped ? 'Skip reason: ' : ''}{item.notes}</p>
  {/if}
</div>

<style>
  .item {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
    padding: var(--sp-3) 0;
    border-top: 1px solid var(--bg);
  }
  .item:first-child {
    border-top: none;
    padding-top: 0;
  }
  .item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-2);
  }
  .name {
    font-size: var(--fs-md);
    color: var(--text);
  }
  .planned {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .actual {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--text);
  }
  .notes {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
    font-style: italic;
  }
  .sets-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--fs-sm);
  }
  .sets-table th {
    text-align: left;
    color: var(--muted);
    font-weight: 600;
    padding: var(--sp-1) var(--sp-2);
  }
  .sets-table td {
    padding: var(--sp-1) var(--sp-2);
    color: var(--text);
  }
</style>
