<script lang="ts">
  import type { Exercise, Routine, UUID } from '../../lib/domain'
  import Card from '../../lib/ui/Card.svelte'
  import Chip from '../../lib/ui/Chip.svelte'
  import { formatPrescriptionSummary } from '../configurator/prescriptionSummary'

  /** Read-only preview of one or more routines' items (FR-07.2, FR-07.4, FR-07.5). */
  let {
    routines,
    exercisesById,
  }: { routines: Routine[]; exercisesById: Map<UUID, Exercise> } = $props()
</script>

<div class="preview">
  {#each routines as routine (routine.id)}
    <Card>
      <div class="routine-header">
        <h3>{routine.name}</h3>
        {#if routine.isArchived}
          <Chip label="Archived" variant="warning" />
        {/if}
      </div>
      {#if routine.focus}
        <p class="focus">{routine.focus}</p>
      {/if}
      <ul class="items">
        {#each [...routine.items].sort((a, b) => a.order - b.order) as item (item.itemId)}
          {@const exercise = exercisesById.get(item.exerciseId)}
          <li>
            <span class="item-name">{exercise?.name ?? 'Unknown exercise'}</span>
            <span class="item-summary">{formatPrescriptionSummary(item.prescription)}</span>
          </li>
        {/each}
      </ul>
    </Card>
  {/each}
</div>

<style>
  .preview {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .routine-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-2);
  }
  .routine-header h3 {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--text);
  }
  .focus {
    margin: var(--sp-1) 0 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .items {
    list-style: none;
    margin: var(--sp-3) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .items li {
    display: flex;
    flex-direction: column;
  }
  .item-name {
    font-size: var(--fs-sm);
    color: var(--text);
  }
  .item-summary {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
</style>
