import { writable } from 'svelte/store'

export interface ShellAction {
  label: string
  onClick: () => void
}

/** Current screen title, shown in the app bar (FR-02.4). Screens set this on mount. */
export const pageTitle = writable('Reforge')

/** Optional contextual action shown on the right of the app bar (FR-02.4, AC-02.6). */
export const appBarAction = writable<ShellAction | null>(null)
