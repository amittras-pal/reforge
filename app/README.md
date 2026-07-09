# Reforge — App

Offline-first, client-only SPA for running and tracking a body-recomposition training
program (workouts + InBody health reports). All data is stored on-device in IndexedDB —
no backend, no account, no network dependency at runtime.

This directory is the **entire application**. There is no root-level `package.json` —
always run commands from inside `app/`:

```bash
cd app
npm install
npm run dev        # start the Vite dev server
npm run build      # type-check, then production build
npm run preview    # preview the production build
npm run check      # svelte-check + tsc --noEmit
npm run lint       # eslint
npm run format     # prettier --write
npm run test       # vitest run
npm run test:watch # vitest watch mode
```

Before committing, run `npm run check` and `npm run lint` (quality gates are manual in v1 —
no husky/lint-staged, per F-01).

## Stack

Svelte 5 + TypeScript + Vite. Persistence via Dexie.js (IndexedDB, F-03). Routing via
`svelte-spa-router` (hash-based, F-02). Offline/installable via `vite-plugin-pwa` (F-04).
See [`../features/README.md`](../features/README.md) for the full spec index, stack table,
and build order.

## Source layout

```
src/
  lib/
    domain/    # canonical data model (types only) — F-00 §5
    utils/     # cross-cutting conventions: IDs, dates, formatting — F-00 §4.2/4.3
    db/        # Dexie database, schema, migrations, repositories — F-03
    pwa/       # SW registration/update flow, install prompt, storage persistence — F-04
    backup/    # export/import envelope, integrity, validation, migration — F-05
    router/    # route table + redirect helper — F-02
    ui/        # shared UI kit (Button, Dialog, NavBar, AppBar, Icon, …) — F-02
    stores/    # theme/density/profile/weekStartsOn, toast, app-bar title/action — F-02
  features/
    configurator/ # exercise library, routines, weekly schedule — F-06
    checklist/    # today/checklist — active session, set/duration logging — F-07
    recorder/     # calendar + session detail/edit/delete — F-08
    health/       # InBody health reports: list, form, detail — F-09
    settings/     # Settings screen + BackupCard (profile, theme, density, week-start,
                  # export/import, workout setup) — F-02/F-05/F-06
  styles/
    tokens.css   # design tokens (spacing, type scale, color, density) — F-00 §6
    global.css   # minimal global reset + focus-visible ring — F-01 §6, F-02 FR-02.12
  main.ts
  App.svelte     # shell: NavBar + AppBar + Router outlet + Toast + UpdateBanner — F-02/F-04
tests/
  unit/          # Vitest
public/
  manifest.webmanifest # real icons/theme (F-04)
  icons/                # any + maskable PNGs, 192/512 (F-04)
  apple-touch-icon.png  # iOS home-screen icon (F-04)
```

`lib/db` (F-03) provides a Dexie-backed `db` instance plus typed repositories
(`exercisesRepo`, `routinesRepo`, `scheduleRepo`, `sessionLogsRepo`, `activeSessionRepo`,
`healthReportsRepo`, `metaRepo`) and a `liveQueryStore()` helper for reactive reads — see
`lib/db/index.ts`. `exercisesRepo.remove()`/`routinesRepo.remove()` (F-06) hard-delete only when
unreferenced (by routines/active session/session logs, or by the schedule/active
session/session logs respectively), throwing an `InvariantError` with a user-facing message
otherwise. `lib/pwa` (F-04) provides the service worker registration/update-prompt flow
(`needRefresh`, `offlineReady`, `updateServiceWorker`), install-prompt handling
(`installPromptAvailable`, `promptInstall`, `isIOS`), and storage persistence/usage helpers
(`requestPersistentStorage`, `getStorageUsage`, `watchForFirstMeaningfulWrite`) — see
`lib/pwa/index.ts`. `lib/backup` (F-05) provides `exportBackup()`/`buildBackupEnvelope()`,
`prepareImport()`/`applyImport()`/`verifyImportSignature()`, and `shouldShowBackupReminder()` —
see `lib/backup/index.ts`; the Settings "Backup" card (`features/settings/BackupCard.svelte`)
is the only consumer today. `features/configurator` (F-06) implements the exercise library,
routine editor (items, prescriptions, reordering, supersets), and weekly schedule behind a
shared `ConfiguratorTabs` bar; it also provides an opt-in "Load example program" action
(`exampleProgram.ts`) and a static usage guide (`UsageGuideSheet.svelte`), both linked from the
Configurator empty-state and reused from Settings' "Workout setup" card (FR-06.19/FR-06.20).
`features/checklist` (F-07) is the app's default landing screen (`/today`) plus
`/checklist/:weekday`: `checklistService.ts` holds the business logic (start/finish/discard a
session, midnight expiry) on top of `activeSessionRepo`/`sessionLogsRepo`, syncing
`meta.activeSessionId` alongside it (a gap F-03 deliberately left for whichever spec reads it).
`ActiveSessionView.svelte` renders the interactive checklist (progress, elapsed time, a
Today/Yesterday date chip) over per-item `ExerciseLogRow`s that expand into a set-by-set
`SetsRepsLogger` or a `DurationLogger` with an optional count-up `Stopwatch`; actuals start
empty with the plan shown only as a placeholder/"Use planned" shortcut (FR-07.9). Starting a
session (today's plan, another weekday's, or any routine ad-hoc) goes through
`StartSessionSheet.svelte`. `features/recorder` (F-08) implements `/calendar` (a month grid,
respecting `weekStartsOn`, with completed/partial dot indicators plus this-week/this-month
counts — `recorderService.ts` holds the pure date-range/grid math) and `/calendar/:date` (that
day's full session detail: planned-vs-actual per exercise via `SessionItemDetail.svelte`,
an editable RPE/notes pair via `SessionDetailCard.svelte` using `sessionLogsRepo`'s new
`updateEditableFields()`, and delete). Detail rendering never re-reads live
exercises/routines — it only uses the `SessionLog`'s own stored snapshots, so archiving/renaming
an exercise afterward never changes historical detail (FR-08.12). `features/health` (F-09)
implements `/health` (all reports newest-first, a latest-vs-targets highlight, and 4 key-metric
trend cards with sparklines via `MetricTrendCard`/`TrendSparkline`), `/health/new`, and
`/health/:id` (a grouped read view — including a `BodyMap` visualization of segmental lean/fat —
with Edit/Delete; Edit toggles in place to the same shared `HealthReportForm.svelte` used by
`/health/new`). `healthService.ts` holds the pure logic: BMI/PBF auto-fill-with-override
suggestions (FR-09.7), segmental form↔domain conversion, and trend/delta calculations. Identity/
anthropometrics are read from the global `profile` store (`ProfileSummary.svelte`), never
duplicated per report. F-02's theme/density/profile/week-start settings still persist to
`localStorage` for now (`lib/stores/persisted.ts`) rather than the new `meta` store; migrating
that store to `metaRepo` is a deliberate follow-up, not part of F-03, F-04, or F-05. See
[`../features/README.md`](../features/README.md) for the build order.

## Conventions (see F-00 for full detail)

- IDs: `createId()` (UUID v4) from `lib/utils`.
- Timestamps: ISO-8601 UTC strings. Calendar dates: local `YYYY-MM-DD` strings.
- Weekdays: `Date.getDay()` semantics, `0=Sunday … 6=Saturday`.
- Units are fixed in v1: mass in kg, height in cm, duration in seconds, distance in meters,
  heart rate in bpm or % of max.
- TypeScript strict mode (`strict`, `noUncheckedIndexedAccess`) is enforced repo-wide.
