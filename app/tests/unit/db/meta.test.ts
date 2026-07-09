import { beforeEach, describe, expect, it } from 'vitest'
import { db, metaRepo } from '../../../src/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('metaRepo (FR-03.7)', () => {
  it('reads seeded defaults', async () => {
    expect(await metaRepo.get('theme')).toBe('system')
    expect(await metaRepo.get('density')).toBe('medium')
    expect(await metaRepo.get('weekStartsOn')).toBe(0)
    expect(await metaRepo.get('profile')).toEqual({})
  })

  it('returns undefined for a key that has never been set', async () => {
    await db.meta.delete('theme')
    expect(await metaRepo.get('theme')).toBeUndefined()
  })

  it('set overwrites a value in place', async () => {
    await metaRepo.set('theme', 'dark')
    expect(await metaRepo.get('theme')).toBe('dark')
  })

  it('getAll returns every entry keyed by MetaKey', async () => {
    const all = await metaRepo.getAll()
    expect(all.theme).toBe('system')
    expect(all.schemaVersion).toBe(1)
    expect(all.activeSessionId).toBeNull()
    expect(all.lastBackupAt).toBeNull()
  })
})
