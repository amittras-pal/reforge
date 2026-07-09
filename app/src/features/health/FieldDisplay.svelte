<script lang="ts">
  /**
   * One label/value read-only row (used across the report detail's grouped read view).
   * Shows an em dash when the value is absent (FR-09.4 — most fields are optional).
   */
  let {
    label,
    value,
    unit = '',
  }: {
    label: string
    value: number | string | undefined
    unit?: string
  } = $props()
</script>

<div class="field-display">
  <span class="label">{label}</span>
  <span class="value">{value !== undefined ? `${value}${unit}` : '—'}</span>
</div>

<style>
  .field-display {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sp-3);
    padding: var(--sp-1) 0;
    font-size: var(--fs-md);
  }
  .label {
    color: var(--muted);
  }
  .value {
    color: var(--text);
    font-weight: 600;
    text-align: right;
  }
</style>
