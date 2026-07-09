import Dexie, { type EntityTable } from 'dexie'
import { describe, expect, it } from 'vitest'
import { createId } from '../../../src/lib/utils'

interface WidgetV1 {
  id: string
  name: string
}

interface WidgetV2 extends WidgetV1 {
  note?: string
}

describe('Dexie schema migration (FR-03.4, FR-03.5, AC-03.7)', () => {
  it('upgrades an existing database to a new version without losing data', async () => {
    const dbName = `reforge-migration-test-${createId()}`

    // Simulate a user's existing installation on schema v1.
    class DbV1 extends Dexie {
      widgets!: EntityTable<WidgetV1, 'id'>
      constructor() {
        super(dbName)
        this.version(1).stores({ widgets: 'id, name' })
      }
    }
    const v1 = new DbV1()
    await v1.widgets.bulkAdd([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ])
    v1.close()

    // Simulate the app shipping a new version that adds an indexed `note` field via an
    // `.upgrade()` transaction — the pattern FR-03.4/FR-03.5 require for real schema changes.
    class DbV2 extends Dexie {
      widgets!: EntityTable<WidgetV2, 'id'>
      constructor() {
        super(dbName)
        this.version(1).stores({ widgets: 'id, name' })
        this.version(2)
          .stores({ widgets: 'id, name, note' })
          .upgrade(async (tx) => {
            await tx
              .table('widgets')
              .toCollection()
              .modify((widget: WidgetV2) => {
                widget.note = 'migrated'
              })
          })
      }
    }
    const v2 = new DbV2()
    const widgets = await v2.widgets.orderBy('id').toArray()

    expect(widgets).toHaveLength(2)
    expect(widgets.map((w) => w.name)).toEqual(['Alpha', 'Beta'])
    expect(widgets.every((w) => w.note === 'migrated')).toBe(true)

    v2.close()
    await Dexie.delete(dbName)
  })
})
