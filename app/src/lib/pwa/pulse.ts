import { writable, type Readable } from 'svelte/store'

/**
 * Derives a boolean store that pulses `true` for `durationMs` the first time (and every time)
 * `source` becomes true, then automatically resets to `false` (FR-04.13). Kept independent of
 * any PWA/browser API so it's unit-testable in isolation from `useRegisterSW()`.
 */
export function createAutoDismissPulse(
  source: Readable<boolean>,
  durationMs = 2000,
): Readable<boolean> {
  const pulse = writable(false)
  let dismissTimer: ReturnType<typeof setTimeout> | undefined

  source.subscribe((value) => {
    if (!value) return
    pulse.set(true)
    clearTimeout(dismissTimer)
    dismissTimer = setTimeout(() => pulse.set(false), durationMs)
  })

  return pulse
}
