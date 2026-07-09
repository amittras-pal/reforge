# AGENTS.md

Instructions for coding agents and contributors working in this repository.

## Where the application code lives

**All application source code lives in [`app/`](./app).** It is a Svelte + TypeScript + Vite
SPA. There is no root-level `package.json` — **always run npm commands from inside `app/`**,
never from the repository root:

```bash
cd app
npm install
npm run dev        # Vite dev server
npm run build      # type-check, then production build
npm run preview    # preview the production build
npm run check      # svelte-check + tsc --noEmit
npm run lint       # eslint
npm run format     # prettier --write
npm run test       # vitest run
npm run test:watch # vitest watch mode
```

## What lives outside `app/`

Everything else at the repo root is **planning/reference material, not application code**:

- [`features/`](./features) — numbered feature specs (`F-00`…`F-09`) that drive implementation.
  Start at [`features/README.md`](./features/README.md) for the spec index, conventions, and
  build order (`F-00 → F-01 → … → F-09`).
- `InBody Reports.html`, `Workout Sheet.html`, `resources/` — the original manual tracking
  sheets this app replaces. Useful as reference for real-world data shapes, not to be edited
  as part of feature work.
- `notes.md`, `research.md` — free-form product notes.

Do not scaffold or place new application code at the repo root; it belongs under `app/`.

## Spec-driven workflow

Every feature is defined by a spec file in `features/`, each following the same template
(Summary, Goals/Non-goals, User stories, Functional requirements `FR-NN.x`, Data model, UI/UX
notes, Dependencies, Acceptance criteria `AC-NN.x`, Open questions). Before implementing a
module, read its spec and
[`features/00-foundation-architecture.md`](./features/00-foundation-architecture.md) — the
canonical, cross-cutting data model and conventions every other spec builds on.

## Core conventions (F-00)

- **IDs**: UUID v4 via `createId()` (`app/src/lib/utils/ids.ts`), never hand-rolled.
- **Time**: timestamps are ISO-8601 UTC strings; calendar dates are local `YYYY-MM-DD` strings
  (see `app/src/lib/utils/dates.ts`).
- **Weekdays**: `Date.getDay()` semantics, `0 = Sunday … 6 = Saturday`.
- **Units are fixed** (no unit switching in v1): mass in kg, height in cm, duration in seconds,
  distance in meters, heart rate in bpm or % of max.
- **Canonical data model** lives in `app/src/lib/domain/` (mirrors F-00 §5) — reuse these types
  rather than redefining entity shapes in a feature module.
- **Design tokens** live in `app/src/styles/tokens.css` (F-00 §6) — reuse the existing CSS
  custom properties instead of hardcoding spacing/colors.

## Quality gates

Before committing, run (from `app/`): `npm run check` and `npm run lint`. These are manual
gates in v1 — no husky/lint-staged (F-01). Add/keep tests passing with `npm run test`.

## Deployment

`.github/workflows/deploy.yml` lints, tests, builds, and publishes `app/dist` to GitHub Pages
on every push to `main` (or via manual `workflow_dispatch`) — see the root
[`README.md`](./README.md#deployment) for details. Requires the repo's Pages source to be set
to "GitHub Actions" once, in Settings → Pages.
