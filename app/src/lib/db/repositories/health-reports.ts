import type { HealthReport, LocalDate, UUID } from '../../domain'
import { NotFoundError, toRepositoryError } from '../errors'
import { withCreateMeta, withUpdateMeta } from '../helpers'
import { db } from '../database'

export interface HealthReportRange {
  from?: LocalDate
  to?: LocalDate
}

export type HealthReportInput = Omit<
  HealthReport,
  'id' | 'createdAt' | 'updatedAt'
>
export type HealthReportPatch = Partial<Omit<HealthReport, 'id' | 'createdAt'>>

async function list(range?: HealthReportRange): Promise<HealthReport[]> {
  const all = await db.healthReports.orderBy('reportDate').toArray()
  return all.filter((report) => {
    if (range?.from !== undefined && report.reportDate < range.from)
      return false
    if (range?.to !== undefined && report.reportDate > range.to) return false
    return true
  })
}

async function get(id: UUID): Promise<HealthReport | undefined> {
  return db.healthReports.get(id)
}

async function create(input: HealthReportInput): Promise<HealthReport> {
  const report: HealthReport = { ...input, ...withCreateMeta() }
  try {
    await db.healthReports.add(report)
  } catch (err) {
    throw toRepositoryError(err)
  }
  return report
}

/** Reports are edited in place, bumping `updatedAt` — no per-edit revision log (FR-00.9). */
async function update(
  id: UUID,
  patch: HealthReportPatch,
): Promise<HealthReport> {
  try {
    const count = await db.healthReports.update(id, withUpdateMeta(patch))
    if (count === 0) throw new NotFoundError(`Health report not found: ${id}`)
    const updated = await db.healthReports.get(id)
    if (!updated) throw new NotFoundError(`Health report not found: ${id}`)
    return updated
  } catch (err) {
    throw toRepositoryError(err)
  }
}

async function remove(id: UUID): Promise<void> {
  await db.healthReports.delete(id)
}

/** Repository for the `healthReports` store (FR-03.7). */
export const healthReportsRepo = { list, get, create, update, remove }
