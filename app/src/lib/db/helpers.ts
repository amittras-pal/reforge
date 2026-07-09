import { createId, nowIso } from '../utils'
import type { ISODateTime, UUID } from '../domain'

/** Fields auto-managed by repository create/update helpers (FR-03.8). */
export interface CreateMeta {
  id: UUID
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

/** Generates the `id`/`createdAt`/`updatedAt` fields for a newly created record (FR-03.8). */
export function withCreateMeta(): CreateMeta {
  const now = nowIso()
  return { id: createId(), createdAt: now, updatedAt: now }
}

/** Bumps `updatedAt` on a patch object (FR-03.8). */
export function withUpdateMeta<T extends object>(
  patch: T,
): T & { updatedAt: ISODateTime } {
  return { ...patch, updatedAt: nowIso() }
}
