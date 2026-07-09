import { beforeEach, describe, expect, it } from 'vitest'
import {
  db,
  exercisesRepo,
  routinesRepo,
  activeSessionRepo,
  metaRepo,
} from '../../../src/lib/db'
import { ACTIVE_SESSION_ID } from '../../../src/lib/domain'
import { buildBackupEnvelope } from '../../../src/lib/backup/export'
import {
  prepareImport,
  verifyImportSignature,
  applyImport,
} from '../../../src/lib/backup/import'
import type { BackupEnvelope } from '../../../src/lib/backup/envelope'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

function makeFile(content: unknown, name = 'backup.json'): File {
  return new File([JSON.stringify(content)], name, { type: 'application/json' })
}

async function createExercise(name = 'Back Squat') {
  return exercisesRepo.create({
    name,
    category: 'lower',
    type: 'sets_reps',
    defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
  })
}

describe('prepareImport (FR-05.6–FR-05.9, FR-05.16–FR-05.18)', () => {
  it('rejects a file that is too large', async () => {
    const file = new File(['x'], 'backup.json')
    Object.defineProperty(file, 'size', { value: 100 * 1024 * 1024 })
    const result = await prepareImport(file)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('file-too-large')
  })

  it('rejects invalid JSON', async () => {
    const result = await prepareImport(new File(['not json{'], 'backup.json'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('invalid-json')
  })

  it('rejects the wrong app id', async () => {
    const envelope = await buildBackupEnvelope()
    const result = await prepareImport(
      makeFile({ ...envelope, app: 'some-other-app' }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('wrong-app')
  })

  it('rejects a missing schemaVersion', async () => {
    const envelope = await buildBackupEnvelope()
    const result = await prepareImport(
      makeFile({
        app: envelope.app,
        exportedAt: envelope.exportedAt,
        integrity: envelope.integrity,
        data: envelope.data,
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('missing-schema-version')
  })

  it('rejects malformed data missing store keys', async () => {
    const envelope = await buildBackupEnvelope()
    const result = await prepareImport(
      makeFile({ ...envelope, data: { exercises: [] } }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('malformed-data')
  })

  it('refuses a newer schema version than the app supports', async () => {
    const envelope = await buildBackupEnvelope()
    const result = await prepareImport(
      makeFile({ ...envelope, schemaVersion: 999 }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('schema-too-new')
  })

  it('rejects invalid records and reports counts per store (no partial import)', async () => {
    const envelope = await buildBackupEnvelope()
    const result = await prepareImport(
      makeFile({
        ...envelope,
        data: { ...envelope.data, exercises: [{ bogus: true }] },
      }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok && result.error.kind === 'invalid-records') {
      expect(result.error.issues).toEqual([
        { store: 'exercises', invalidCount: 1, totalCount: 1 },
      ])
    } else {
      throw new Error('expected an invalid-records error')
    }
  })

  it('accepts a valid, unsigned backup and reports a verified hash', async () => {
    await createExercise()
    const envelope = await buildBackupEnvelope()
    const result = await prepareImport(makeFile(envelope))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.prepared.hashStatus).toBe('verified')
      expect(result.prepared.hasSignature).toBe(false)
      expect(result.prepared.recordCounts.exercises).toBe(1)
    }
  })

  it('flags a mismatched hash for a tampered file, but still returns the data (FR-05.18)', async () => {
    await createExercise()
    const envelope = await buildBackupEnvelope()
    // Change the data but keep the original hash, simulating tampering/corruption.
    const tampered: BackupEnvelope = {
      ...envelope,
      data: { ...envelope.data, exercises: [] },
    }
    const result = await prepareImport(makeFile(tampered))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.prepared.hashStatus).toBe('mismatch')
  })

  it('treats a missing integrity block as unverified, not an error', async () => {
    const envelope = await buildBackupEnvelope()
    const result = await prepareImport(
      makeFile({
        app: envelope.app,
        schemaVersion: envelope.schemaVersion,
        exportedAt: envelope.exportedAt,
        data: envelope.data,
      }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.prepared.hashStatus).toBe('unverified')
  })
})

describe('verifyImportSignature (FR-05.19)', () => {
  it('verifies with the correct passphrase', async () => {
    const envelope = await buildBackupEnvelope('correct horse battery staple')
    expect(
      await verifyImportSignature(
        makeFile(envelope),
        'correct horse battery staple',
      ),
    ).toBe(true)
  })

  it('fails with the wrong passphrase', async () => {
    const envelope = await buildBackupEnvelope('correct horse battery staple')
    expect(
      await verifyImportSignature(makeFile(envelope), 'wrong passphrase'),
    ).toBe(false)
  })

  it('returns undefined for an unsigned backup', async () => {
    const envelope = await buildBackupEnvelope()
    expect(
      await verifyImportSignature(makeFile(envelope), 'anything'),
    ).toBeUndefined()
  })
})

describe('applyImport (FR-05.10–FR-05.13)', () => {
  it('merge mode upserts by primary key, preserving untouched existing data', async () => {
    const squat = await createExercise('Back Squat')
    const bench = await createExercise('Bench Press')
    const envelope = await buildBackupEnvelope()

    const updatedSquat = { ...squat, name: 'Barbell Back Squat' }
    const newExercise = { ...squat, id: 'new-id', name: 'Deadlift' }
    const summary = await applyImport(
      { ...envelope.data, exercises: [updatedSquat, newExercise] },
      'merge',
    )

    expect(summary.mode).toBe('merge')
    expect(summary.counts.exercises).toEqual({ added: 1, updated: 1 })
    expect((await exercisesRepo.get(squat.id))?.name).toBe('Barbell Back Squat')
    expect((await exercisesRepo.get(bench.id))?.name).toBe('Bench Press')
    expect((await exercisesRepo.get('new-id'))?.name).toBe('Deadlift')
  })

  it('replace mode wipes existing data before loading the imported data', async () => {
    await createExercise('Old Exercise')
    const envelope = await buildBackupEnvelope()
    const onlyExercise = {
      ...envelope.data.exercises[0]!,
      id: 'only-one',
      name: 'Only Exercise',
    }

    const summary = await applyImport(
      { ...envelope.data, exercises: [onlyExercise] },
      'replace',
    )

    expect(summary.mode).toBe('replace')
    const all = await exercisesRepo.list()
    expect(all.map((e) => e.name)).toEqual(['Only Exercise'])
  })

  it('clears a dangling activeSession whose routine no longer exists (FR-05.11)', async () => {
    const routine = await routinesRepo.create({
      name: 'Lower Body A',
      items: [],
    })
    await activeSessionRepo.start({
      date: '2026-07-08',
      weekday: 3,
      routineId: routine.id,
      routineNameSnapshot: 'Lower Body A',
      startedAt: '2026-07-08T05:00:00.000Z',
      items: [],
    })
    expect(await activeSessionRepo.getCurrent()).toBeTruthy()

    const envelope = await buildBackupEnvelope()
    await applyImport({ ...envelope.data, routines: [] }, 'replace')

    expect(await activeSessionRepo.getCurrent()).toBeUndefined()
    expect(await metaRepo.get('activeSessionId')).toBeNull()
  })

  it('keeps a valid activeSession intact when its routine still exists', async () => {
    const routine = await routinesRepo.create({
      name: 'Lower Body A',
      items: [],
    })
    await activeSessionRepo.start({
      date: '2026-07-08',
      weekday: 3,
      routineId: routine.id,
      routineNameSnapshot: 'Lower Body A',
      startedAt: '2026-07-08T05:00:00.000Z',
      items: [],
    })

    const envelope = await buildBackupEnvelope()
    await applyImport(envelope.data, 'merge')

    expect(await activeSessionRepo.getCurrent()).toBeTruthy()
    expect(await metaRepo.get('activeSessionId')).toBe(ACTIVE_SESSION_ID)
  })
})

describe('export → replace-import round trip (AC-05.9)', () => {
  it('reproduces identical data across all stores', async () => {
    const squat = await createExercise('Back Squat')
    const routine = await routinesRepo.create({
      name: 'Lower Body A',
      items: [
        {
          itemId: 'item-1',
          exerciseId: squat.id,
          order: 0,
          prescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
        },
      ],
    })
    await activeSessionRepo.start({
      date: '2026-07-08',
      weekday: 3,
      routineId: routine.id,
      routineNameSnapshot: routine.name,
      startedAt: '2026-07-08T05:00:00.000Z',
      items: [],
    })
    // `activeSessionRepo.start()` deliberately doesn't sync `meta.activeSessionId` (F-03) — set
    // it explicitly here so the "before" snapshot is internally consistent with what
    // `applyImport`'s FR-05.11 reconciliation would *also* derive from reality, otherwise this
    // test would be asserting on a pre-existing F-03 quirk rather than round-trip fidelity.
    await metaRepo.set('activeSessionId', ACTIVE_SESSION_ID)

    const before = await buildBackupEnvelope()
    await applyImport(before.data, 'replace')
    const after = await buildBackupEnvelope()

    // exportedAt legitimately differs (each export stamps "now"); compare everything else.
    expect(after.data).toEqual(before.data)
  })
})
