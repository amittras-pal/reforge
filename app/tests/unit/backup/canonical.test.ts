import { describe, expect, it } from 'vitest'
import { canonicalJson } from '../../../src/lib/backup/canonical'

describe('canonicalJson (FR-05.17)', () => {
  it('produces the same output regardless of key insertion order', () => {
    const a = { b: 1, a: 2, c: 3 }
    const b = { c: 3, a: 2, b: 1 }
    expect(canonicalJson(a)).toBe(canonicalJson(b))
  })

  it('sorts nested object keys recursively', () => {
    const value = { z: { y: 1, x: 2 }, a: 1 }
    expect(canonicalJson(value)).toBe('{"a":1,"z":{"x":2,"y":1}}')
  })

  it('preserves array element order (semantically significant, e.g. routine item order)', () => {
    const value = {
      items: [
        { b: 1, a: 2 },
        { d: 3, c: 4 },
      ],
    }
    expect(canonicalJson(value)).toBe('{"items":[{"a":2,"b":1},{"c":4,"d":3}]}')
  })

  it('produces no insignificant whitespace', () => {
    expect(canonicalJson({ a: 1, b: [1, 2] })).not.toMatch(/\s/)
  })
})
