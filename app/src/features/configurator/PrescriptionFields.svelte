<script lang="ts">
  import type { Prescription } from '../../lib/domain'
  import Checkbox from '../../lib/ui/Checkbox.svelte'
  import NumberStepper from '../../lib/ui/NumberStepper.svelte'
  import TextField from '../../lib/ui/TextField.svelte'

  /**
   * Editable fields for a `Prescription`, switching by `prescription.kind` (FR-06.2, FR-06.7).
   * The parent owns which `kind` is active (exercise type is fixed once created; routine items
   * inherit it from their exercise) — this component only edits the fields for whichever kind
   * is already set.
   *
   * `NumberStepper`/`TextField` bind plain `number`/`string` values, but several domain fields
   * are optional (`number | undefined`, 0/empty meaning "unset"). Local mirrors hold the
   * editable value and are synced back onto `prescription` via `$effect`.
   */
  let { prescription = $bindable() }: { prescription: Prescription } = $props()

  let repsMax = $state(
    prescription.kind === 'sets_reps'
      ? (prescription.repsMax ?? prescription.repsMin)
      : 0,
  )
  let weight = $state(
    prescription.kind === 'sets_reps' ? (prescription.weight ?? 0) : 0,
  )
  let restSec = $state(
    prescription.kind === 'sets_reps' ? (prescription.restSec ?? 0) : 0,
  )
  let toFailure = $state(
    prescription.kind === 'sets_reps' ? (prescription.toFailure ?? false) : false,
  )

  let durationMin = $state(
    prescription.kind === 'duration'
      ? Math.round(prescription.durationSec / 60)
      : 0,
  )
  let intensity = $state(
    prescription.kind === 'duration' ? (prescription.intensity ?? '') : '',
  )
  let targetHrPctMin = $state(
    prescription.kind === 'duration' ? (prescription.targetHrPctMin ?? 0) : 0,
  )
  let targetHrPctMax = $state(
    prescription.kind === 'duration' ? (prescription.targetHrPctMax ?? 0) : 0,
  )
  let distanceMeters = $state(
    prescription.kind === 'duration' ? (prescription.distanceMeters ?? 0) : 0,
  )

  $effect(() => {
    if (prescription.kind !== 'sets_reps') return
    prescription.repsMax = repsMax > prescription.repsMin ? repsMax : undefined
    prescription.weight = weight || undefined
    prescription.restSec = restSec || undefined
    prescription.toFailure = toFailure || undefined
  })

  $effect(() => {
    if (prescription.kind !== 'duration') return
    prescription.durationSec = durationMin * 60
    prescription.intensity = intensity || undefined
    prescription.targetHrPctMin = targetHrPctMin || undefined
    prescription.targetHrPctMax = targetHrPctMax || undefined
    prescription.distanceMeters = distanceMeters || undefined
  })
</script>

{#if prescription.kind === 'sets_reps'}
  <NumberStepper label="Sets" bind:value={prescription.sets} min={1} max={12} />
  <NumberStepper
    label="Reps (min)"
    bind:value={prescription.repsMin}
    min={1}
    max={50}
  />
  <NumberStepper
    label="Reps (max, optional)"
    bind:value={repsMax}
    min={prescription.repsMin}
    max={50}
  />
  <NumberStepper label="Weight (kg, optional)" bind:value={weight} min={0} max={500} />
  <NumberStepper
    label="Rest (sec, optional)"
    bind:value={restSec}
    min={0}
    max={600}
    step={15}
  />
  <Checkbox label="Train to failure" bind:checked={toFailure} />
{:else}
  <NumberStepper label="Duration (min)" bind:value={durationMin} min={1} max={180} />
  <TextField label="Intensity (optional)" placeholder="e.g. Zone 2" bind:value={intensity} />
  <NumberStepper
    label="Target HR % (min, optional)"
    bind:value={targetHrPctMin}
    min={0}
    max={100}
    step={5}
  />
  <NumberStepper
    label="Target HR % (max, optional)"
    bind:value={targetHrPctMax}
    min={0}
    max={100}
    step={5}
  />
  <NumberStepper
    label="Distance (m, optional)"
    bind:value={distanceMeters}
    min={0}
    max={50000}
    step={100}
  />
{/if}
