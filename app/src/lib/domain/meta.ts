import type { ISODateTime, LocalDate, UUID, Weekday } from './shared'

/**
 * Settings, global user profile & app metadata.
 *
 * Canonical source: features/00-foundation-architecture.md §5.7
 * Dexie indexes (F-03): key (PK).
 */
export interface MetaEntry {
  key: string
  value: unknown
}

/**
 * Stored under meta key `"profile"` (FR-00.18). Age is derived from `birthday` at display
 * time and is never stored.
 */
export interface UserProfile {
  name?: string
  /** Used to derive current age. */
  birthday?: LocalDate
  heightCm?: number
  gender?: 'male' | 'female' | 'other'
}

export type Theme = 'light' | 'dark' | 'system'
export type Density = 'comfortable' | 'medium' | 'compact'

/** Well-known `meta` keys and their value types (§5.7). */
export interface MetaSchema {
  schemaVersion: number
  profile: UserProfile
  theme: Theme
  density: Density
  /** 0..6, default 0 = Sunday (FR-00.7). */
  weekStartsOn: Weekday
  activeSessionId: UUID | null
  lastBackupAt: ISODateTime | null
}

export type MetaKey = keyof MetaSchema

/** Default values for a fresh install (FR-03.6), excluding `schemaVersion` (set by F-03). */
export const DEFAULT_META: Omit<MetaSchema, 'schemaVersion'> = {
  profile: {},
  theme: 'system',
  density: 'medium',
  weekStartsOn: 0,
  activeSessionId: null,
  lastBackupAt: null,
}
