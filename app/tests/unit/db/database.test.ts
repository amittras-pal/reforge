import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../src/lib/db'
import { DEFAULT_META } from '../../../src/lib/domain'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('ReforgeDatabase schema (FR-03.1, FR-03.2, AC-03.1)', () => {
  it('creates all seven stores', () => {
    const tableNames = db.tables.map((table) => table.name).sort()
    expect(tableNames).toEqual(
      [
        'activeSession',
        'exercises',
        'healthReports',
        'meta',
        'routines',
        'schedule',
        'sessionLogs',
      ].sort(),
    )
  })

  it('indexes exercises on name/category/type/isArchived/updatedAt', () => {
    const schema = db.exercises.schema
    const indexed = [schema.primKey, ...schema.indexes].map((idx) => idx.name)
    expect(indexed).toEqual(
      expect.arrayContaining([
        'id',
        'name',
        'category',
        'type',
        'isArchived',
        'updatedAt',
      ]),
    )
  })

  it('indexes routines on name/isArchived/updatedAt', () => {
    const schema = db.routines.schema
    const indexed = [schema.primKey, ...schema.indexes].map((idx) => idx.name)
    expect(indexed).toEqual(
      expect.arrayContaining(['id', 'name', 'isArchived', 'updatedAt']),
    )
  })

  it('indexes sessionLogs on date/routineId/completedAt/status', () => {
    const schema = db.sessionLogs.schema
    const indexed = [schema.primKey, ...schema.indexes].map((idx) => idx.name)
    expect(indexed).toEqual(
      expect.arrayContaining([
        'id',
        'date',
        'routineId',
        'completedAt',
        'status',
      ]),
    )
  })

  it('indexes healthReports on reportDate/createdAt/updatedAt', () => {
    const schema = db.healthReports.schema
    const indexed = [schema.primKey, ...schema.indexes].map((idx) => idx.name)
    expect(indexed).toEqual(
      expect.arrayContaining(['id', 'reportDate', 'createdAt', 'updatedAt']),
    )
  })

  it('uses weekday/key as the primary key for schedule/meta', () => {
    expect(db.schedule.schema.primKey.name).toBe('weekday')
    expect(db.meta.schema.primKey.name).toBe('key')
  })
})

describe('fresh install seeding (FR-03.6, AC-03.2)', () => {
  it('seeds exactly 7 empty schedule days', async () => {
    const days = await db.schedule.orderBy('weekday').toArray()
    expect(days).toHaveLength(7)
    expect(days.map((day) => day.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(days.every((day) => day.routineIds.length === 0)).toBe(true)
  })

  it('seeds default meta entries', async () => {
    const meta = await db.meta.toArray()
    const byKey = Object.fromEntries(
      meta.map((entry) => [entry.key, entry.value]),
    )
    expect(byKey.schemaVersion).toBe(1)
    expect(byKey.profile).toEqual(DEFAULT_META.profile)
    expect(byKey.theme).toBe(DEFAULT_META.theme)
    expect(byKey.density).toBe(DEFAULT_META.density)
    expect(byKey.weekStartsOn).toBe(DEFAULT_META.weekStartsOn)
    expect(byKey.activeSessionId).toBe(DEFAULT_META.activeSessionId)
    expect(byKey.lastBackupAt).toBe(DEFAULT_META.lastBackupAt)
  })

  it('seeds no exercises or routines', async () => {
    expect(await db.exercises.count()).toBe(0)
    expect(await db.routines.count()).toBe(0)
  })
})
