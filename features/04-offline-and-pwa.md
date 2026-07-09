# F-04 · Offline & PWA

| | |
| --- | --- |
| **Spec ID** | F-04 |
| **Module** | Cross-cutting |
| **Status** | Implemented |
| **Depends on** | F-01, F-02, F-03 |
| **Depended on by** | — |

---

## 1. Summary

Makes the app an installable, **offline-first Progressive Web App**. After the first load the entire
app shell and assets are cached so it runs with no network — essential for gym use with poor
connectivity. Because all data already lives in IndexedDB (F-03), offline data is inherent; this spec
covers the **app shell caching, manifest, install experience, and update flow**.

---

## 2. Goals / Non-goals

### Goals
- App launches and fully functions offline after first visit.
- Installable to the home screen with a native-feeling standalone window.
- Controlled, user-friendly update mechanism when a new version ships.

### Non-goals
- Background sync / push notifications (no server; out of scope).
- Runtime caching of third-party APIs (there are none — F-00 FR-00.16).

---

## 3. User stories
- As a user, I can install the app to my phone's home screen.
- As a user, I can open and use every feature in airplane mode after the first load.
- As a user, when a new version is available I'm prompted to refresh, and I never lose in-progress data.

---

## 4. Functional requirements

### 4.1 Service worker & caching
- **FR-04.1** Use `vite-plugin-pwa` (Workbox) to generate a service worker that **precaches** the
  built app shell (HTML, JS, CSS, fonts, icons).
- **FR-04.2** Registration strategy is `autoUpdate` **with a user prompt** (see §4.4) — do not
  silently reload during an active session.
- **FR-04.3** Navigation requests fall back to the cached `index.html` (SPA offline navigation).
- **FR-04.4** Static assets use a cache-first strategy; the precache manifest is revisioned on each build.
- **FR-04.5** No user data passes through the service worker cache — data persistence is IndexedDB (F-03).

### 4.2 Web app manifest
- **FR-04.6** Provide `manifest.webmanifest`: `name`, `short_name`, `description`,
  `start_url: "./"`, `scope: "./"`, `display: "standalone"`, `orientation: "portrait"`,
  `background_color`, `theme_color`, and maskable icons (192, 512, + maskable variants).
- **FR-04.7** `theme_color`/`background_color` align with the light theme tokens (F-00 §6); the
  installed status-bar color adapts to the active theme where supported.

### 4.3 Installability
- **FR-04.8** Meet installability criteria (served over HTTPS or localhost, valid manifest, SW,
  icons). Provide an in-app **"Install app"** affordance in Settings that triggers the
  `beforeinstallprompt` flow where available, and shows iOS "Add to Home Screen" guidance otherwise.
- **FR-04.9** In standalone mode, respect safe-area insets so the bottom nav (F-02 FR-02.7) is usable.

### 4.4 Update flow
- **FR-04.10** When a new service worker is waiting, show a non-blocking toast/banner: **"Update
  available — Refresh"**. Applying the update activates the new SW and reloads.
- **FR-04.11** The update prompt must never interrupt or discard an in-progress `activeSession`
  (F-07); the session is already persisted in IndexedDB and survives reload.

### 4.5 Storage durability
- **FR-04.12** Request persistent storage via `navigator.storage.persist()` at the **first meaningful
  data write** (e.g. first exercise/report created) — not on initial launch — and also expose a manual
  "Make storage persistent" control plus the estimated usage/quota (`navigator.storage.estimate()`) in
  Settings. Rationale and flow are in §6.

### 4.6 Offline-ready indicator
- **FR-04.13** On the **first successful precache** ("ready to work offline"), show a **subtle pulsing
  indicator in the app bar** that auto-dismisses after ~2 seconds — non-intrusive, no toast, no action
  required.

---

## 5. Data model
- None. Reads no stores. May display storage estimates and read `meta.lastBackupAt` for a
  "back up your data" nudge (see F-05).

---

## 6. UI / UX notes
- Offline is the default assumption; there is **no** "you are offline" error state for core features.
- **Offline-ready confirmation:** a small **pulsing dot in the app bar** on first precache that fades
  after ~2s (per FR-04.13) — instead of a toast.
- A subtle, dismissible **update banner** (actionable "Refresh"); an **Install** button and a
  **storage usage** readout in Settings.
- **Persistent-storage flow:** the browser only grants persistence to engaged sites, so we request it
  right after the user's first real data entry (when they clearly have something worth keeping), and
  also offer a manual toggle in Settings. Requesting on first launch tends to be denied and wastes the
  one good prompt moment.
- Optional connectivity indicator is not required (the app does not depend on the network).

---

## 7. Dependencies
- **F-01** `vite-plugin-pwa`, build config (`base: './'`).
- **F-02** shell (banner placement, Settings screen, safe-area handling).
- **F-03** IndexedDB persistence (data offline availability) and `meta.lastBackupAt`.

---

## 8. Acceptance criteria
- [x] **AC-04.1** After one online load, a hard reload while offline still launches the full app.
- [x] **AC-04.2** All four modules are usable offline (create/edit/record/report). _Architecturally
      satisfied (no network calls anywhere; all writes go through F-03's IndexedDB repos, which the
      service worker's precache doesn't gate at all). F-06 (Configurator), F-07 (Checklist), F-08
      (Recorder), and F-09 (Health Tracker) are all now built and confirmed offline-capable by
      construction (same reasoning) — every module's reads/writes go through `lib/db` repos with
      zero network dependency._
- [x] **AC-04.3** The app is installable and opens in a standalone window with correct icons/colors.
- [x] **AC-04.4** A new build surfaces an "Update available" prompt; refreshing loads the new version.
- [x] **AC-04.5** Applying an update during an in-progress session preserves that session after reload.
- [x] **AC-04.6** Settings shows storage usage and can request persistent storage; persistence is also requested after the first meaningful data write.
- [x] **AC-04.7** Safe-area insets are respected in installed standalone mode.
- [x] **AC-04.8** First precache shows a brief pulsing "offline ready" indicator in the app bar (no toast) that auto-dismisses.

---

## 9. Open questions
_All resolved for v1._
- **OQ-04.1** ✅ Resolved — **portrait only**; no dedicated landscape support in v1.
- **OQ-04.2** ✅ Resolved — request persistence **after the first meaningful data write** (plus a manual
  Settings control), not on first launch. See §6 for the use case and flow.
- **OQ-04.3** ✅ Resolved — replace the toast with a **subtle pulsing app-bar indicator** that
  auto-dismisses after ~2s (FR-04.13).
