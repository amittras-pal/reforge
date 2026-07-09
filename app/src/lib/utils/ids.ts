import type { UUID } from '../domain'

/**
 * Creates a new entity identifier.
 *
 * All entity IDs are UUID v4 strings generated with `crypto.randomUUID()` (FR-00.5).
 */
export function createId(): UUID {
  return crypto.randomUUID()
}
