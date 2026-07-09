<script lang="ts">
  import { untrack } from 'svelte'
  import type { DurationPrescription } from '../../lib/domain'
  import TextField from '../../lib/ui/TextField.svelte'
  import Stopwatch from './Stopwatch.svelte'

  /**
   * Actuals editor for a `duration` item (FR-07.10): duration in minutes (matching the
   * Configurator's planned-duration unit, F-06), optional distance/avg HR, and an optional
   * count-up stopwatch that writes its elapsed time into the duration field when stopped.
   * `stopwatchElapsedSec`/`stopwatchRunning` are owned by the parent (`ExerciseLogRow`), not
   * locally — so the stopwatch's progress survives this component being unmounted when the
   * accordion row collapses, and so the parent can read/stop it when marking the exercise
   * complete from the header checkbox.
   */
  let {
    planned,
    actualDurationSec,
    actualDistanceMeters,
    actualAvgHr,
    stopwatchElapsedSec = $bindable(0),
    stopwatchRunning = $bindable(false),
    onChange,
  }: {
    planned: DurationPrescription
    actualDurationSec?: number
    actualDistanceMeters?: number
    actualAvgHr?: number
    stopwatchElapsedSec?: number
    stopwatchRunning?: boolean
    onChange: (patch: {
      actualDurationSec?: number
      actualDistanceMeters?: number
      actualAvgHr?: number
    }) => void
  } = $props()

  function toMinutesString(sec: number): string {
    return String(Math.round((sec / 60) * 10) / 10)
  }

  let durationMinInput = $state(
    untrack(() => (actualDurationSec !== undefined ? toMinutesString(actualDurationSec) : '')),
  )
  let distanceInput = $state(untrack(() => actualDistanceMeters?.toString() ?? ''))
  let hrInput = $state(untrack(() => actualAvgHr?.toString() ?? ''))

  function handleDurationInput(event: Event & { currentTarget: HTMLInputElement }) {
    const raw = event.currentTarget.value
    onChange({
      actualDurationSec: raw.trim() === '' ? undefined : Math.round(Number(raw) * 60),
    })
  }

  function handleDistanceInput(event: Event & { currentTarget: HTMLInputElement }) {
    const raw = event.currentTarget.value
    onChange({ actualDistanceMeters: raw.trim() === '' ? undefined : Number(raw) })
  }

  function handleHrInput(event: Event & { currentTarget: HTMLInputElement }) {
    const raw = event.currentTarget.value
    onChange({ actualAvgHr: raw.trim() === '' ? undefined : Number(raw) })
  }

  function usePlanned() {
    durationMinInput = toMinutesString(planned.durationSec)
    onChange({ actualDurationSec: planned.durationSec })
  }

  function handleStopwatchStop(finalElapsedSec: number) {
    durationMinInput = toMinutesString(finalElapsedSec)
    onChange({ actualDurationSec: finalElapsedSec })
  }
</script>

<div class="duration-log">
  <Stopwatch bind:elapsedSec={stopwatchElapsedSec} bind:running={stopwatchRunning} onStop={handleStopwatchStop} />
  <div class="field-row">
    <TextField
      label="Duration (min)"
      type="number"
      placeholder={String(Math.round(planned.durationSec / 60))}
      bind:value={durationMinInput}
      oninput={handleDurationInput}
    />
    <button type="button" class="use-planned" onclick={usePlanned}>Use planned</button>
  </div>
  <TextField
    label="Distance (m, optional)"
    type="number"
    placeholder={planned.distanceMeters !== undefined ? String(planned.distanceMeters) : ''}
    bind:value={distanceInput}
    oninput={handleDistanceInput}
  />
  <TextField
    label="Avg heart rate (bpm, optional)"
    type="number"
    bind:value={hrInput}
    oninput={handleHrInput}
  />
</div>

<style>
  .duration-log {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
  }
  .field-row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--sp-2);
  }
  .field-row :global(.field) {
    flex: 1 1 8rem;
    min-width: 0;
  }
  .use-planned {
    border: none;
    background: transparent;
    color: var(--primary);
    font-family: inherit;
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
    padding: var(--sp-2);
    white-space: nowrap;
    min-height: var(--touch-target-min);
  }
</style>
