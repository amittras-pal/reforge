<script lang="ts">
  import Card from '../../lib/ui/Card.svelte'
  import TrendSparkline from './TrendSparkline.svelte'

  /** One key-metric trend card (FR-09.13/AC-09.9): label, latest value, delta, sparkline. */
  let {
    label,
    unit,
    points,
    current,
    delta,
  }: {
    label: string
    unit: string
    points: number[]
    current?: number
    delta?: number
  } = $props()
</script>

<Card>
  <div class="trend-card">
    <div class="trend-info">
      <span class="trend-label">{label}</span>
      <span class="trend-value">{current !== undefined ? `${current}${unit}` : '—'}</span>
      {#if delta !== undefined}
        <span class="trend-delta">
          {delta > 0 ? '+' : ''}{delta}{unit} vs previous
        </span>
      {/if}
    </div>
    <TrendSparkline {points} height={28} />
  </div>
</Card>

<style>
  .trend-card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-2);
  }
  .trend-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .trend-label {
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .trend-value {
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--text);
  }
  .trend-delta {
    font-size: var(--fs-xs);
    color: var(--muted);
  }
</style>
