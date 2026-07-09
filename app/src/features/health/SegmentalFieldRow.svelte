<script lang="ts">
  import Select from '../../lib/ui/Select.svelte'
  import TextField from '../../lib/ui/TextField.svelte'

  /** One segmental lean/fat entry row: mass (kg) + optional InBody rating. */
  let {
    label,
    mass = $bindable(''),
    rating = $bindable(''),
  }: {
    label: string
    mass?: string
    rating?: string
  } = $props()

  const ratingOptions = [
    { label: '—', value: '' },
    { label: 'Under', value: 'under' },
    { label: 'Normal', value: 'normal' },
    { label: 'Over', value: 'over' },
  ]
</script>

<div class="segmental-row">
  <span class="segmental-label">{label}</span>
  <TextField type="number" placeholder="kg" bind:value={mass} />
  <Select options={ratingOptions} bind:value={rating} />
</div>

<style>
  .segmental-row {
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr) 6rem;
    align-items: center;
    gap: var(--sp-2);
  }
  .segmental-label {
    font-size: var(--fs-sm);
    color: var(--text);
  }
</style>
