<script lang="ts">
  import type { Segmental, SegmentRating } from '../../lib/domain'

  /** Read-only 5-cell segmental lean/fat visualization, laid out like a body silhouette. */
  let { title, segmental }: { title: string; segmental?: Segmental } = $props()

  function ratingClass(rating?: SegmentRating): string {
    if (rating === 'normal') return 'rating-normal'
    if (rating === 'over') return 'rating-over'
    if (rating === 'under') return 'rating-under'
    return ''
  }

  function formatMass(mass?: number): string {
    return mass !== undefined ? `${mass}kg` : '—'
  }
</script>

<div class="body-map">
  <h3>{title}</h3>
  {#if !segmental}
    <p class="empty-hint">No data recorded.</p>
  {:else}
    <div class="grid">
      <div class="cell {ratingClass(segmental.leftArm.rating)}">
        <span class="part-label">L Arm</span>
        <span class="part-value">{formatMass(segmental.leftArm.mass)}</span>
      </div>
      <div class="cell spacer" aria-hidden="true"></div>
      <div class="cell {ratingClass(segmental.rightArm.rating)}">
        <span class="part-label">R Arm</span>
        <span class="part-value">{formatMass(segmental.rightArm.mass)}</span>
      </div>

      <div class="cell spacer" aria-hidden="true"></div>
      <div class="cell {ratingClass(segmental.torso.rating)}">
        <span class="part-label">Torso</span>
        <span class="part-value">{formatMass(segmental.torso.mass)}</span>
      </div>
      <div class="cell spacer" aria-hidden="true"></div>

      <div class="cell {ratingClass(segmental.leftLeg.rating)}">
        <span class="part-label">L Leg</span>
        <span class="part-value">{formatMass(segmental.leftLeg.mass)}</span>
      </div>
      <div class="cell spacer" aria-hidden="true"></div>
      <div class="cell {ratingClass(segmental.rightLeg.rating)}">
        <span class="part-label">R Leg</span>
        <span class="part-value">{formatMass(segmental.rightLeg.mass)}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .body-map h3 {
    margin: 0 0 var(--sp-2);
    font-size: var(--fs-md);
    color: var(--text);
  }
  .empty-hint {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--sp-2);
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: var(--sp-2);
    border-radius: var(--radius-md);
    background: var(--bg);
    min-height: 56px;
  }
  .cell.spacer {
    background: transparent;
  }
  .part-label {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
  .part-value {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--text);
  }
  .rating-normal {
    background: color-mix(in srgb, var(--success) 18%, var(--bg));
  }
  .rating-normal .part-value {
    color: var(--success);
  }
  .rating-over {
    background: color-mix(in srgb, var(--danger) 18%, var(--bg));
  }
  .rating-over .part-value {
    color: var(--danger);
  }
  .rating-under {
    background: color-mix(in srgb, var(--warning) 18%, var(--bg));
  }
  .rating-under .part-value {
    color: var(--warning);
  }
</style>
