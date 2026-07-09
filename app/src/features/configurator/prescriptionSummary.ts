import type { Prescription } from '../../lib/domain'
import { formatDuration } from '../../lib/utils'

/**
 * One-line prescription summary shown on routine item cards (F-06 §6), e.g.
 * "3 × 8–10 · 60kg · rest 90s" or "10:00 · Zone 2 · HR 60-70%".
 */
export function formatPrescriptionSummary(prescription: Prescription): string {
  if (prescription.kind === 'sets_reps') {
    const reps =
      prescription.repsMax !== undefined && prescription.repsMax !== prescription.repsMin
        ? `${prescription.repsMin}–${prescription.repsMax}`
        : `${prescription.repsMin}`
    const parts = [`${prescription.sets} × ${reps}`]
    if (prescription.weight) parts.push(`${prescription.weight}kg`)
    if (prescription.restSec) parts.push(`rest ${prescription.restSec}s`)
    if (prescription.toFailure) parts.push('to failure')
    return parts.join(' · ')
  }

  const parts = [formatDuration(prescription.durationSec)]
  if (prescription.intensity) parts.push(prescription.intensity)
  if (prescription.targetHrPctMin !== undefined && prescription.targetHrPctMax !== undefined) {
    parts.push(`HR ${prescription.targetHrPctMin}-${prescription.targetHrPctMax}%`)
  }
  if (prescription.distanceMeters) {
    parts.push(`${(prescription.distanceMeters / 1000).toFixed(1)}km`)
  }
  return parts.join(' · ')
}
