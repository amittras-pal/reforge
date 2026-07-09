import { get, writable } from 'svelte/store'
import { describe, expect, it, vi } from 'vitest'
import { createAutoDismissPulse } from '../../../src/lib/pwa/pulse'

describe('createAutoDismissPulse (FR-04.13)', () => {
  it('stays false when the source never becomes true', () => {
    const source = writable(false)
    const pulse = createAutoDismissPulse(source, 2000)
    expect(get(pulse)).toBe(false)
  })

  it('pulses true when the source becomes true, then auto-dismisses after durationMs', () => {
    vi.useFakeTimers()
    try {
      const source = writable(false)
      const pulse = createAutoDismissPulse(source, 2000)

      source.set(true)
      expect(get(pulse)).toBe(true)

      vi.advanceTimersByTime(1999)
      expect(get(pulse)).toBe(true)

      vi.advanceTimersByTime(1)
      expect(get(pulse)).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('restarts the dismiss timer if the source pulses again before dismissing', () => {
    vi.useFakeTimers()
    try {
      const source = writable(false)
      const pulse = createAutoDismissPulse(source, 2000)

      source.set(true)
      vi.advanceTimersByTime(1000)
      // Toggle off/on (writable stores dedupe identical consecutive values, so a real
      // "pulse again" needs a distinct value in between) to restart the dismiss window.
      source.set(false)
      source.set(true)
      vi.advanceTimersByTime(1500)
      expect(get(pulse)).toBe(true) // 1500ms since the restart, not yet 2000ms

      vi.advanceTimersByTime(500)
      expect(get(pulse)).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})
