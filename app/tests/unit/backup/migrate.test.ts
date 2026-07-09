import { describe, expect, it } from 'vitest'
import { migrateBackupData } from '../../../src/lib/backup/migrate'
import type { BackupData } from '../../../src/lib/backup/envelope'

const data: BackupData = {
  exercises: [],
  routines: [],
  schedule: [],
  sessionLogs: [],
  activeSession: [],
  healthReports: [],
  meta: [],
}

describe('migrateBackupData (FR-05.9)', () => {
  it('is a no-op when fromVersion === toVersion', () => {
    expect(migrateBackupData(data, 1, 1)).toEqual(data)
  })

  it('is a no-op today since no migrations are registered yet (only schema v1 has existed)', () => {
    expect(migrateBackupData(data, 1, 5)).toEqual(data)
  })
})
