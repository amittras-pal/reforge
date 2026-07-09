import {
  DEFAULT_META,
  type Density,
  type Theme,
  type UserProfile,
  type Weekday,
} from '../domain'
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

/** Resets all shell-owned settings to their defaults (used by the Settings screen). */
export function resetSettings(): void {
  theme.set(DEFAULT_META.theme)
  density.set(DEFAULT_META.density)
  profile.set(DEFAULT_META.profile)
  weekStartsOn.set(DEFAULT_META.weekStartsOn)
}
