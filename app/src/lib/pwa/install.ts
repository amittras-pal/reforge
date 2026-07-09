import { writable } from 'svelte/store'

/**
 * Installability & install-prompt handling (FR-04.8). Detects iOS (which never fires
 * `beforeinstallprompt`, so Settings shows static "Add to Home Screen" guidance instead) and
 * whether the app is already running standalone/installed.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

interface NavigatorWithStandalone extends Navigator {
  /** Non-standard iOS Safari flag: true when launched from the home screen. */
  standalone?: boolean
}

/** True for iOS/iPadOS Safari, which has no `beforeinstallprompt` support. */
export function isIOS(userAgent: string = navigator.userAgent): boolean {
  return /iPad|iPhone|iPod/.test(userAgent)
}

/** True when the app is already running installed/standalone (any platform). */
export function isStandalone(
  win: Pick<Window, 'matchMedia'> = window,
  nav: NavigatorWithStandalone = navigator,
): boolean {
  const matchesStandaloneMode =
    win.matchMedia?.('(display-mode: standalone)').matches ?? false
  return matchesStandaloneMode || nav.standalone === true
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

/** True once the browser has fired `beforeinstallprompt` and it hasn't been used yet. */
export const installPromptAvailable = writable(false)

/** True once the app is installed (already-standalone at load, or the `appinstalled` event). */
export const appInstalled = writable(isStandalone())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    installPromptAvailable.set(true)
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installPromptAvailable.set(false)
    appInstalled.set(true)
  })
}

/** Triggers the stashed `beforeinstallprompt` event, if any (FR-04.8). Usable once per event. */
export async function promptInstall(): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> {
  if (!deferredPrompt) return 'unavailable'
  const prompt = deferredPrompt
  deferredPrompt = null
  installPromptAvailable.set(false)
  await prompt.prompt()
  const { outcome } = await prompt.userChoice
  return outcome
}
