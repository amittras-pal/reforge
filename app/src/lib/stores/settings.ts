import {
  DEFAULT_META,
  type Density,
  type Theme,
  type UserProfile,
  type Weekday,
} from '../domain'
import { metaRepo } from '../db'
import { persisted } from './persisted'

/** Theme preference (FR-02.8). `'system'` follows `prefers-color-scheme`. */
export const theme = persisted<Theme>('theme', DEFAULT_META.theme)

/** UI density (FR-02.9). Applied via `data-density` on the document root. */
export const density = persisted<Density>('density', DEFAULT_META.density)

/** Global user profile (FR-02.16, F-00 FR-00.18). Single source of truth for other modules. */
export const profile = persisted<UserProfile>('profile', DEFAULT_META.profile)

/** First day of the week shown in calendar/weekday views (FR-02.17). */
export const weekStartsOn = persisted<Weekday>(
  'weekStartsOn',
  DEFAULT_META.weekStartsOn,
)

/**
 * Whether the user has permanently dismissed the "load example program" card in Settings
 * (Notes for Improvement.md) — independent of `resetSettings()`, since dismissing it isn't a
 * profile/appearance preference and shouldn't reappear on a settings reset.
 */
export const exampleProgramDismissed = persisted<boolean>('exampleProgramDismissed', false)

/**
 * Mirror every change into the Dexie-backed `meta` store (F-03) so backup export (F-05) sees
 * real values (Notes for Improvement.md: the exported `meta.profile` was always `{}`, because
 * these settings actually live in `localStorage` via `persisted()` — a stand-in from F-02,
 * predating F-03, that was never migrated — while `db.meta` was only ever touched by
 * `seedDatabase()`'s one-time defaults). Each `subscribe` also fires immediately with the
 * current value, so this also backfills `db.meta` for an already-running install the moment
 * this module loads, not just on the next change.
 */
theme.subscribe((value) => {
  metaRepo.set('theme', value).catch(() => {})
})
density.subscribe((value) => {
  metaRepo.set('density', value).catch(() => {})
})
profile.subscribe((value) => {
  metaRepo.set('profile', value).catch(() => {})
})
weekStartsOn.subscribe((value) => {
  metaRepo.set('weekStartsOn', value).catch(() => {})
})

/**
 * Re-hydrates the live (`localStorage`-backed) settings stores from `db.meta` (FR-05.10).
 * Needed specifically after an import: `applyImport` writes the imported profile/theme/etc.
 * straight into `db.meta`, but every screen reads these `persisted()` stores instead, so
 * without this an imported profile silently never appears anywhere in the UI.
 */
export async function hydrateSettingsFromMeta(): Promise<void> {
  const meta = await metaRepo.getAll()
  if (meta.profile !== undefined) profile.set(meta.profile)
  if (meta.theme !== undefined) theme.set(meta.theme)
  if (meta.density !== undefined) density.set(meta.density)
  if (meta.weekStartsOn !== undefined) weekStartsOn.set(meta.weekStartsOn)
}

/** Resets all shell-owned settings to their defaults (used by the Settings screen). */
export function resetSettings(): void {
  theme.set(DEFAULT_META.theme)
  density.set(DEFAULT_META.density)
  profile.set(DEFAULT_META.profile)
  weekStartsOn.set(DEFAULT_META.weekStartsOn)
}
