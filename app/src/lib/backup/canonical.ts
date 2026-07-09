/**
 * Recursively sorts object keys (arrays keep their element order, which is semantically
 * significant — e.g. routine item order) so the same logical data always serializes to the
 * exact same bytes, regardless of property insertion order (FR-05.17).
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = canonicalize((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}

/** Canonical (stable key order, no insignificant whitespace) JSON serialization (FR-05.17). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}
