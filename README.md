# Reforge

Reforge is an offline-first, installable web app for running and tracking a personal
**body-recomposition** training program — building muscle while losing fat — end to end:
from planning workouts, to logging live sessions, to charting body-composition trends.
Everything is stored **on your device**; there is no backend, no account, and no network
dependency at runtime.

> Built to replace a stack of manual tracking spreadsheets (the original `*.html` sheets in
> this repo) with a single, private, offline tool.

## Features

- **Configurator** — build a reusable exercise library, assemble routines (sets/reps or
  duration, supersets, per-item prescriptions), and lay them out across a weekly schedule.
- **Checklist** — run today's routine as a live, checkable session: log sets/reps/weight or
  duration, use a built-in stopwatch, skip with reasons, and finish with RPE + notes.
  Progress is autosaved and survives reloads.
- **Recorder** — a calendar of past sessions with completed/partial indicators, weekly and
  monthly counts, and a read-only planned-vs-actual breakdown per session.
- **Health tracker** — dated InBody body-composition reports (weight, muscle/fat, segmental
  lean/fat, obesity, targets) with trend sparklines and a body-map visualization.
- **Backup** — export/import all data as a single JSON file (optionally passphrase-signed),
  so your data stays portable and yours.

## Tech stack

Svelte 5 + TypeScript + Vite, with Dexie.js over IndexedDB for persistence, hash-based
routing (`svelte-spa-router`), and an installable, offline-capable PWA via `vite-plugin-pwa`
(Workbox). Styling is plain CSS with design tokens — no UI component library.

## Getting started

All application code lives in [`app/`](./app) — there is **no root-level `package.json`**, so
run every command from inside `app/`:

```bash
cd app
npm install
npm run dev      # start the Vite dev server
npm run build    # type-check, then production build
npm run preview  # preview the production build
```

Other useful scripts: `npm run check` (svelte-check + tsc), `npm run lint`, `npm run test`.

## Deployment

Every push to `main` that touches `app/**` runs [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml):
lint → test → type-check + build, then publish `app/dist` to GitHub Pages. It can also be run
manually from the Actions tab (`workflow_dispatch`).

The app needs no per-deployment configuration — `vite.config.ts` uses a relative `base: './'`
and every static asset/manifest/service-worker reference is relative, so the same build works
unchanged whether it's served from a user page, a project page subpath, or previewed locally.
Routing is hash-based (`svelte-spa-router`), so GitHub Pages needs no SPA-fallback/404 trick.

One-time repo setup (not part of the workflow itself): in **Settings → Pages**, set
**Source: GitHub Actions**. After that, the workflow both builds and deploys on every push.

## Repository layout

- **[`app/`](./app)** — the application (Svelte + TS + Vite). See
  [`app/README.md`](./app/README.md) for the source layout.
- **[`features/`](./features)** — numbered, spec-driven feature docs (`F-00`…`F-11`); start at
  [`features/README.md`](./features/README.md) for the index and build order.
- **[`AGENTS.md`](./AGENTS.md)** — contributor/agent guide (where code lives, conventions,
  quality gates).
- **Reference material** — `research.md` (the training-program research this app implements),
  `notes.md`, and the original `*.html` tracking sheets are background only, not application
  code.

## Privacy

Reforge is fully client-side. Your workout and health data never leave the device unless you
explicitly export a backup file.
