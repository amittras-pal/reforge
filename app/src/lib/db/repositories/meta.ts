import type { MetaKey, MetaSchema } from '../../domain'
import { toRepositoryError } from '../errors'
import { db } from '../database'

async function get<K extends MetaKey>(
  key: K,
): Promise<MetaSchema[K] | undefined> {
  const entry = await db.meta.get(key)
  return entry?.value as MetaSchema[K] | undefined
}

async function set<K extends MetaKey>(
  key: K,
  value: MetaSchema[K],
): Promise<void> {
  try {
    await db.meta.put({ key, value })
  } catch (err) {
    throw toRepositoryError(err)
  }
}

async function getAll(): Promise<Partial<MetaSchema>> {
  const entries = await db.meta.toArray()
  const result = {} as Partial<MetaSchema>
  for (const entry of entries) {
    ;(result as Record<string, unknown>)[entry.key] = entry.value
  }
  return result
}

/** Repository for the `meta` store (FR-03.7): settings, user profile & app metadata. */
export const metaRepo = { get, set, getAll }
