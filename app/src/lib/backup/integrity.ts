import { canonicalJson } from './canonical'

/** The exact payload shape the integrity hash/HMAC is computed over (FR-05.17). */
export interface IntegrityPayload {
  schemaVersion: number
  exportedAt: string
  data: unknown
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** Constant-time string comparison. Not security-critical for a purely local, client-side
 * comparison (no remote attacker can measure timing), but cheap to do properly. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** SHA-256 hex digest of the canonical payload (FR-05.17), via the Web Crypto API (offline). */
export async function computeHash(payload: IntegrityPayload): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(payload))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return bytesToHex(new Uint8Array(digest))
}

export type HashStatus = 'verified' | 'unverified' | 'mismatch'

/** Recomputes the hash and compares it to the envelope's stored hash (FR-05.18). A missing
 * hash is allowed (older/hand-made backups) but surfaced as "unverified", not a hard error. */
export async function checkHash(
  payload: IntegrityPayload,
  expectedHash: string | undefined,
): Promise<HashStatus> {
  if (!expectedHash) return 'unverified'
  const actual = await computeHash(payload)
  return actual === expectedHash ? 'verified' : 'mismatch'
}

async function deriveHmacKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign', 'verify'],
  )
}

/** Computes an HMAC-SHA-256 over the canonical payload, keyed by a passphrase-derived key
 * (PBKDF2, random salt per export) — opt-in authenticity signature (FR-05.19). */
export async function computeHmac(
  payload: IntegrityPayload,
  passphrase: string,
): Promise<{ hmac: string; hmacSalt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveHmacKey(passphrase, salt)
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(canonicalJson(payload)),
  )
  return {
    hmac: bytesToHex(new Uint8Array(signature)),
    hmacSalt: bytesToHex(salt),
  }
}

/** Re-derives the HMAC with a re-entered passphrase and the stored salt, and compares
 * (FR-05.19). Returns `undefined` if the envelope wasn't signed. */
export async function checkHmac(
  payload: IntegrityPayload,
  passphrase: string,
  expectedHmac: string | undefined,
  hmacSalt: string | undefined,
): Promise<boolean | undefined> {
  if (!expectedHmac || !hmacSalt) return undefined
  const key = await deriveHmacKey(passphrase, hexToBytes(hmacSalt))
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(canonicalJson(payload)),
  )
  return timingSafeEqual(bytesToHex(new Uint8Array(signature)), expectedHmac)
}
