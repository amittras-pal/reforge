import { describe, expect, it } from 'vitest'
import {
  computeHash,
  checkHash,
  computeHmac,
  checkHmac,
  type IntegrityPayload,
} from '../../../src/lib/backup/integrity'

const payload: IntegrityPayload = {
  schemaVersion: 1,
  exportedAt: '2026-07-08T00:00:00.000Z',
  data: { a: 1 },
}

describe('computeHash / checkHash (FR-05.17, FR-05.18)', () => {
  it('is deterministic for the same payload', async () => {
    const a = await computeHash(payload)
    const b = await computeHash(payload)
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('differs when the payload changes', async () => {
    const a = await computeHash(payload)
    const b = await computeHash({ ...payload, data: { a: 2 } })
    expect(a).not.toBe(b)
  })

  it('reports unverified when no hash is present (older/hand-made backups)', async () => {
    expect(await checkHash(payload, undefined)).toBe('unverified')
  })

  it('reports verified for a matching hash', async () => {
    const hash = await computeHash(payload)
    expect(await checkHash(payload, hash)).toBe('verified')
  })

  it('reports mismatch for a wrong hash', async () => {
    expect(await checkHash(payload, 'deadbeef')).toBe('mismatch')
  })
})

describe('computeHmac / checkHmac (FR-05.19)', () => {
  it('verifies with the correct passphrase', async () => {
    const { hmac, hmacSalt } = await computeHmac(
      payload,
      'correct horse battery staple',
    )
    expect(
      await checkHmac(payload, 'correct horse battery staple', hmac, hmacSalt),
    ).toBe(true)
  })

  it('fails with the wrong passphrase', async () => {
    const { hmac, hmacSalt } = await computeHmac(
      payload,
      'correct horse battery staple',
    )
    expect(await checkHmac(payload, 'wrong passphrase', hmac, hmacSalt)).toBe(
      false,
    )
  })

  it('returns undefined when there is no signature to check', async () => {
    expect(
      await checkHmac(payload, 'anything', undefined, undefined),
    ).toBeUndefined()
  })

  it('uses a random salt per export, so repeated signing produces different output', async () => {
    const first = await computeHmac(payload, 'passphrase')
    const second = await computeHmac(payload, 'passphrase')
    expect(first.hmacSalt).not.toBe(second.hmacSalt)
    expect(first.hmac).not.toBe(second.hmac)
  })
})
