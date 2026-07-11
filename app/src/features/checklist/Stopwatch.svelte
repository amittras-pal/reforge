<script lang="ts">
  import { formatDuration } from '../../lib/utils'
  import Icon from '../../lib/ui/Icon.svelte'

  /**
   * Optional, user-started count-up stopwatch (FR-07.10); may overshoot the planned duration.
   *
   * Anchored to wall-clock time, not counted `setInterval` ticks: backgrounding/screen-off
   * throttles or suspends timers (even in installed PWAs), so a tick counter silently drifts.
   * `startedAtMs` (bindable epoch ms) is the anchor; elapsed is always recomputed as
   * `Date.now() - startedAtMs`, self-correcting on each tick and on visibility change.
   *
   * `elapsedSec` (bindable) is the last-known value for resuming/display; `onStop` fires the
   * final elapsed seconds for the parent to copy into the actual-duration field.
   */
  let {
    elapsedSec = $bindable(0),
    startedAtMs = $bindable(undefined),
    onStop,
  }: {
    elapsedSec?: number
    startedAtMs?: number
    onStop?: (finalElapsedSec: number) => void
  } = $props()

  const running = $derived(startedAtMs !== undefined)

  let wakeLock: WakeLockSentinel | undefined

  /** Recompute `elapsedSec` from the wall-clock anchor — the single source of truth. */
  function sync() {
    if (startedAtMs === undefined) return
    elapsedSec = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
  }

  async function acquireWakeLock() {
    if (wakeLock || !('wakeLock' in navigator)) return
    try {
      const lock = await navigator.wakeLock.request('screen')
      if (startedAtMs === undefined) {
        // Stopped again before the request resolved — don't hold on to a stale lock.
        lock.release().catch(() => {})
        return
      }
      wakeLock = lock
      wakeLock.addEventListener('release', () => {
        wakeLock = undefined
      })
    } catch {
      // Best-effort only — the wall-clock resync is the actual fix, this just helps avoid it.
    }
  }

  function releaseWakeLock() {
    wakeLock?.release().catch(() => {})
    wakeLock = undefined
  }

  function start() {
    if (running) return
    startedAtMs = Date.now() - elapsedSec * 1000
  }

  function stop() {
    if (!running) return
    sync()
    const finalElapsedSec = elapsedSec
    startedAtMs = undefined
    onStop?.(finalElapsedSec)
  }

  // Interval + wake lock lifecycle, driven by `startedAtMs` — also resumes correctly on mount
  // (reload, or the accordion row re-expanding), not just after Start is clicked.
  $effect(() => {
    if (startedAtMs === undefined) return
    sync()
    const intervalId = setInterval(sync, 1000)
    acquireWakeLock()
    return () => {
      clearInterval(intervalId)
      releaseWakeLock()
    }
  })

  // Resync as soon as the page becomes visible again (don't wait for a throttled tick), and
  // re-acquire the wake lock, which the platform releases whenever the document is hidden.
  $effect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      sync()
      if (running) acquireWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
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
