import { useRegisterSW } from 'virtual:pwa-register/svelte'
import { createAutoDismissPulse } from './pulse'

/**
 * The app's single service worker registration (FR-04.1, FR-04.2). `registerType: 'prompt'`
 * (vite.config.ts) means a new worker never activates on its own: `needRefresh` flips to
 * `true` and the app decides when to call `updateServiceWorker()` —
 * `lib/ui/UpdateBanner.svelte` does this when the user clicks "Refresh" (FR-04.10). Because an
 * in-progress `activeSession` already lives in IndexedDB (F-03), reloading to apply an update
 * never loses it (FR-04.11) — it's just read back on the next load.
 *
 * `offlineReady` flips to `true` once, the first time the app shell is fully precached.
 */
export const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW(
  {
    immediate: true,
  },
)

/** Brief pulsing "ready to work offline" indicator in the app bar (FR-04.13). */
export const offlineReadyPulse = createAutoDismissPulse(offlineReady, 2000)
