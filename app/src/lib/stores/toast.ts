import { writable } from 'svelte/store'
import { createId } from '../utils/ids'

export type ToastVariant = 'info' | 'success' | 'error'

export interface ToastMessage {
  id: string
  message: string
  variant: ToastVariant
}

/** Active toasts, rendered by `lib/ui/Toast.svelte` (mounted once in the app shell). */
export const toasts = writable<ToastMessage[]>([])

const DEFAULT_DURATION_MS = 4000

/** Shows a global toast/notification (FR-02.14). Auto-dismisses after `durationMs`. */
export function showToast(
  message: string,
  variant: ToastVariant = 'info',
  durationMs = DEFAULT_DURATION_MS,
): void {
  const id = createId()
  toasts.update((all) => [...all, { id, message, variant }])
  setTimeout(() => dismissToast(id), durationMs)
}

export function dismissToast(id: string): void {
  toasts.update((all) => all.filter((t) => t.id !== id))
}
