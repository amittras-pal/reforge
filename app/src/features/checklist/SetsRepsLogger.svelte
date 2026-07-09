<script lang="ts">
  import type { LoggedSet, SetsRepsPrescription } from '../../lib/domain'
  import SetRow from './SetRow.svelte'

  /** Renders the editable set-by-set actuals table for a `sets_reps` item (FR-07.9). */
  let {
    planned,
    setResults,
    onChangeSet,
  }: {
    planned: SetsRepsPrescription
    setResults: LoggedSet[]
    onChangeSet: (setNo: number, patch: Partial<LoggedSet>) => void
  } = $props()
</script>

<div class="sets">
  {#each setResults as set (set.setNo)}
    <SetRow {set} {planned} onChange={(patch) => onChangeSet(set.setNo, patch)} />
  {/each}
</div>

<style>
  .sets {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
</style>
