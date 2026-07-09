import { describe, expect, it } from 'vitest'
import {
  parseEnvelope,
  validateBackupData,
} from '../../../src/lib/backup/validate'
import { APP_ID, type BackupData } from '../../../src/lib/backup/envelope'

function emptyData(): BackupData {
  return {
    exercises: [],
    routines: [],
    schedule: [],
    sessionLogs: [],
    activeSession: [],
    healthReports: [],
    meta: [],
  }
}

describe('parseEnvelope (FR-05.7)', () => {
  it('accepts a well-formed envelope', () => {
    const result = parseEnvelope({
      app: APP_ID,
      schemaVersion: 1,
      exportedAt: '2026-07-08T00:00:00.000Z',
      integrity: { algo: 'SHA-256', hash: 'abc' },
      data: emptyData(),
    })
    expect(result.ok).toBe(true)
  })

  it('rejects a non-object', () => {
    expect(parseEnvelope('not an object').ok).toBe(false)
    expect(parseEnvelope(null).ok).toBe(false)
    expect(parseEnvelope([1, 2, 3]).ok).toBe(false)
  })

  it('rejects the wrong app id', () => {
    const result = parseEnvelope({
      app: 'some-other-app',
      schemaVersion: 1,
      data: emptyData(),
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('wrong-app')
  })

  it('rejects a missing schemaVersion', () => {
    const result = parseEnvelope({ app: APP_ID, data: emptyData() })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('missing-schema-version')
  })

  it('rejects data missing known store keys', () => {
    const result = parseEnvelope({
      app: APP_ID,
      schemaVersion: 1,
      data: { exercises: [] },
    })
    expect(result.ok).toBe(false)
    if (!result.ok && result.error.kind === 'malformed-data') {
      expect(result.error.missingKeys).toEqual(
        expect.arrayContaining(['routines', 'schedule', 'meta']),
      )
    } else {
      throw new Error('expected a malformed-data error')
    }
  })
})

describe('validateBackupData (FR-05.8)', () => {
  it('passes for empty (but well-shaped) data', () => {
    expect(validateBackupData(emptyData()).valid).toBe(true)
  })

  it('passes for valid records', () => {
    const data = emptyData()
    data.exercises = [
      {
        id: 'a',
        name: 'Squat',
        category: 'lower',
        type: 'sets_reps',
        defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
        isArchived: false,
        createdAt: 'x',
        updatedAt: 'x',
      },
    ]
    expect(validateBackupData(data).valid).toBe(true)
  })

  it('flags invalid records with counts per store, without aborting other stores', () => {
    const data = emptyData()
    data.exercises = [{ bogus: true } as never]
    data.schedule = [{ weekday: 0, routineIds: [] }]
    const result = validateBackupData(data)
    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      { store: 'exercises', invalidCount: 1, totalCount: 1 },
    ])
  })
})
