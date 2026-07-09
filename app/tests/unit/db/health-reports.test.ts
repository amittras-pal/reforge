import { beforeEach, describe, expect, it } from 'vitest'
import {
  db,
  healthReportsRepo,
  NotFoundError,
  type HealthReportInput,
} from '../../../src/lib/db'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

function makeReportInput(reportDate: string): HealthReportInput {
  return {
    reportDate,
    composition: {},
    muscleFat: {},
    obesity: {},
    targets: {},
    research: {},
  }
}

describe('healthReportsRepo (FR-03.7, FR-00.9)', () => {
  it('creates a report with an auto id and matching createdAt/updatedAt', async () => {
    const report = await healthReportsRepo.create(makeReportInput('2026-07-08'))
    expect(report.id).toBeTruthy()
    expect(report.createdAt).toBe(report.updatedAt)
  })

  it('list orders by reportDate and supports a range filter', async () => {
    await healthReportsRepo.create(makeReportInput('2026-06-01'))
    await healthReportsRepo.create(makeReportInput('2026-07-01'))
    await healthReportsRepo.create(makeReportInput('2026-08-01'))
    const inRange = await healthReportsRepo.list({
      from: '2026-06-15',
      to: '2026-07-15',
    })
    expect(inRange.map((r) => r.reportDate)).toEqual(['2026-07-01'])
  })

  it('update corrects a report in place and bumps updatedAt (no revision log)', async () => {
    const created = await healthReportsRepo.create(
      makeReportInput('2026-07-08'),
    )
    await new Promise((resolve) => setTimeout(resolve, 5))
    const updated = await healthReportsRepo.update(created.id, { score: 82 })
    expect(updated.score).toBe(82)
    expect(updated.id).toBe(created.id)
    expect(updated.updatedAt).not.toBe(created.updatedAt)
    expect(await healthReportsRepo.list()).toHaveLength(1)
  })

  it('update throws NotFoundError for a missing id', async () => {
    await expect(
      healthReportsRepo.update('missing', { score: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('remove deletes the report', async () => {
    const created = await healthReportsRepo.create(
      makeReportInput('2026-07-08'),
    )
    await healthReportsRepo.remove(created.id)
    expect(await healthReportsRepo.get(created.id)).toBeUndefined()
  })
})
