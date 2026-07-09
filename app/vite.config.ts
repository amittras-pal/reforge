import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built app works from any static path or file:// (FR-00.1, FR-01.13).
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      // FR-04.2: update prompt is user-driven, not silent — the app shows its own "Update
      // available" banner (lib/ui/UpdateBanner.svelte) and calls updateServiceWorker() only
      // when the user clicks Refresh, via the `virtual:pwa-register/svelte` hook
      // (lib/pwa/register.ts). injectRegister: false disables the plugin's own auto-injected
      // registration script so there's exactly one registration path.
      registerType: 'prompt',
      injectRegister: false,
      // Manifest is hand-authored at public/manifest.webmanifest; this fills in icons/theme.
      manifest: false,
      workbox: {
        // FR-04.1/FR-04.4: precache the full app shell — JS/CSS/HTML plus icons and the
        // manifest (Workbox's own default globPatterns only covers js/css/html).
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.{test,spec}.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
})
