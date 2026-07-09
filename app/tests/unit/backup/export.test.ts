import { beforeEach, describe, expect, it } from 'vitest'
import { db, exercisesRepo } from '../../../src/lib/db'
import { buildBackupEnvelope } from '../../../src/lib/backup/export'
import { checkHash } from '../../../src/lib/backup/integrity'
import { APP_ID } from '../../../src/lib/backup/envelope'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('buildBackupEnvelope (FR-05.1, FR-05.2, FR-05.17, FR-05.19)', () => {
  it('captures every record from every store, including seeded structural defaults', async () => {
    await exercisesRepo.create({
      name: 'Back Squat',
      category: 'lower',
      type: 'sets_reps',
      defaultPrescription: { kind: 'sets_reps', sets: 3, repsMin: 5 },
    })

    const envelope = await buildBackupEnvelope()
    expect(envelope.app).toBe(APP_ID)
    expect(envelope.data.exercises).toHaveLength(1)
    expect(envelope.data.schedule).toHaveLength(7)
    expect(envelope.data.meta.length).toBeGreaterThan(0)
    expect(envelope.integrity.algo).toBe('SHA-256')
  })

  it('embeds a hash that verifies against the exported data', async () => {
    const envelope = await buildBackupEnvelope()
    const status = await checkHash(
      {
        schemaVersion: envelope.schemaVersion,
        exportedAt: envelope.exportedAt,
        data: envelope.data,
      },
      envelope.integrity.hash,
    )
    expect(status).toBe('verified')
  })

  it('adds an hmac + salt when a passphrase is supplied', async () => {
    const envelope = await buildBackupEnvelope('my passphrase')
    expect(envelope.integrity.hmac).toBeTruthy()
    expect(envelope.integrity.hmacSalt).toBeTruthy()
  })

  it('omits the hmac when no passphrase is supplied (opt-in, off by default)', async () => {
    const envelope = await buildBackupEnvelope()
    expect(envelope.integrity.hmac).toBeUndefined()
    expect(envelope.integrity.hmacSalt).toBeUndefined()
  })
})
