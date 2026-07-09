/**
 * Formats a duration in seconds for display per FR-00.8: `m:ss` under an hour, otherwise `h:mm`.
 */
export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Formats a byte count as a human-readable string (e.g. "1.5 MB"), used for the storage
 * usage/quota readout in Settings (FR-04.12).
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** exponent
  const decimals = exponent === 0 ? 0 : 1
  return `${value.toFixed(decimals)} ${units[exponent]}`
}
