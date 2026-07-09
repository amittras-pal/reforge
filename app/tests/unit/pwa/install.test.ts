import { describe, expect, it } from 'vitest'
import { isIOS, isStandalone } from '../../../src/lib/pwa/install'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15'
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15'
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0'
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0'

describe('isIOS (FR-04.8)', () => {
  it('detects iPhone/iPad user agents', () => {
    expect(isIOS(IPHONE_UA)).toBe(true)
    expect(isIOS(IPAD_UA)).toBe(true)
  })

  it('does not flag Android or desktop user agents', () => {
    expect(isIOS(ANDROID_UA)).toBe(false)
    expect(isIOS(DESKTOP_UA)).toBe(false)
  })
})

describe('isStandalone (FR-04.9)', () => {
  it('is true when display-mode: standalone matches', () => {
    const win = { matchMedia: () => ({ matches: true }) as MediaQueryList }
    const nav = {} as Navigator
    expect(isStandalone(win, nav)).toBe(true)
  })

  it('is true when navigator.standalone is set (iOS)', () => {
    const win = { matchMedia: () => ({ matches: false }) as MediaQueryList }
    const nav = { standalone: true } as Navigator & { standalone?: boolean }
    expect(isStandalone(win, nav)).toBe(true)
  })

  it('is false otherwise', () => {
    const win = { matchMedia: () => ({ matches: false }) as MediaQueryList }
    const nav = {} as Navigator
    expect(isStandalone(win, nav)).toBe(false)
  })
})
