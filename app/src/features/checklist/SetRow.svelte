<script lang="ts">
  import { untrack } from 'svelte'
  import type { LoggedSet, SetsRepsPrescription } from '../../lib/domain'
  import Checkbox from '../../lib/ui/Checkbox.svelte'
  import TextField from '../../lib/ui/TextField.svelte'

  /**
   * One editable set row (FR-07.9). Actuals start empty — the planned reps/weight show only
   * as placeholders; "Use planned" copies them in for speed. Keeps its own local string mirrors
   * (not synced back from props after mount) so typing stays smooth; changes propagate up via
   * `onChange` rather than two-way binding, since the parent's `LoggedSet` is a plain value, not
   * a component prop.
   */
  let {
    set,
    planned,
    onChange,
  }: {
    set: LoggedSet
    planned: SetsRepsPrescription
    onChange: (patch: Partial<LoggedSet>) => void
  } = $props()

  let repsInput = $state(untrack(() => set.reps?.toString() ?? ''))
  let weightInput = $state(untrack(() => set.weight?.toString() ?? ''))

  function handleRepsInput(event: Event & { currentTarget: HTMLInputElement }) {
    const raw = event.currentTarget.value
    onChange({ reps: raw.trim() === '' ? undefined : Number(raw) })
  }

  function handleWeightInput(event: Event & { currentTarget: HTMLInputElement }) {
    const raw = event.currentTarget.value
    onChange({ weight: raw.trim() === '' ? undefined : Number(raw) })
  }

  function usePlanned() {
    const reps = planned.repsMax ?? planned.repsMin
    repsInput = String(reps)
    if (planned.weight !== undefined) weightInput = String(planned.weight)
    onChange({ reps, weight: planned.weight, done: true })
  }

  function handleDoneChange(done: boolean) {
    onChange({ done })
  }
</script>

<div class="set-row">
  <span class="set-no">Set {set.setNo}</span>
  <TextField
    type="number"
    placeholder={String(planned.repsMax ?? planned.repsMin) + " Reps"}
    bind:value={repsInput}
    oninput={handleRepsInput}
  />
  <TextField
    type="number"
    placeholder={planned.weight !== undefined ? String(planned.weight) : 'Weight'}
    bind:value={weightInput}
    oninput={handleWeightInput}
  />
  <button type="button" class="use-planned" onclick={usePlanned}>Use planned</button>
  <Checkbox label="Done" checked={set.done} onchange={handleDoneChange} />
</div>

<style>
  .set-row {
    /* flex-wrap (not a rigid grid) so the row degrades gracefully instead of overflowing the
       card/screen width when everything can't fit on one line (e.g. compact density isn't
       enough room on narrow phones for 2 number inputs + a text button + a labeled checkbox) —
       the least-important item (the Done checkbox) is the one that wraps to its own line. */
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sp-2);
  }
  .set-no {
    flex: 0 0 auto;
    min-width: 2.75rem;
    font-size: var(--fs-sm);
    color: var(--muted);
  }
  .set-row :global(.field) {
    flex: 1 1 4.5rem;
    min-width: 4rem;
  }
  .use-planned {
    flex: 0 0 auto;
    border: none;
    background: transparent;
    color: var(--primary);
    font-family: inherit;
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
    padding: var(--sp-1);
    white-space: nowrap;
  }
</style>
