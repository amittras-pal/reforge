<script lang="ts">
  import { formatDuration } from '../../lib/utils'
  import Icon from '../../lib/ui/Icon.svelte'

  /**
   * Optional, user-started count-up stopwatch (FR-07.10). Counts up from 0 so the user may
   * overshoot the planned duration — it's a real-time logging convenience, not a countdown.
   * `elapsedSec`/`running` are bindable so a parent can seed/read/observe them (e.g. so marking
   * the exercise complete from elsewhere can tell whether the stopwatch is currently running);
   * `onStop` fires the final elapsed seconds when the user stops it, for the parent to copy into
   * the actual-duration field.
   */
  let {
    elapsedSec = $bindable(0),
    running = $bindable(false),
    onStop,
  }: {
    elapsedSec?: number
    running?: boolean
    onStop?: (finalElapsedSec: number) => void
  } = $props()

  let intervalId: ReturnType<typeof setInterval> | undefined

  function start() {
    if (running) return
    running = true
    intervalId = setInterval(() => {
      elapsedSec += 1
    }, 1000)
  }

  function stop() {
    if (!running) return
    running = false
    clearInterval(intervalId)
    onStop?.(elapsedSec)
  }

  $effect(() => {
    return () => clearInterval(intervalId)
  })
</script>

<div class="stopwatch">
  <span class="elapsed" aria-live="polite">{formatDuration(elapsedSec)}</span>
  {#if running}
    <button type="button" class="stopwatch-btn" onclick={stop} aria-label="Stop stopwatch">
      <Icon name="pause" size={18} />
      Stop
    </button>
  {:else}
    <button type="button" class="stopwatch-btn" onclick={start} aria-label="Start stopwatch">
      <Icon name="play" size={18} />
      Start
    </button>
  {/if}
</div>

<style>
  .stopwatch {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }
  .elapsed {
    font-variant-numeric: tabular-nums;
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--text);
    min-width: 3.5ch;
  }
  .stopwatch-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--sp-2);
    min-height: var(--touch-target-min);
    padding: 0 var(--sp-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--primary);
    background: transparent;
    color: var(--primary);
    font-family: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    cursor: pointer;
  }
</style>
