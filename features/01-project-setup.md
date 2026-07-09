# F-01 · Project Setup & Tooling

| | |
| --- | --- |
| **Spec ID** | F-01 |
| **Module** | Cross-cutting |
| **Status** | Implemented |
| **Depends on** | F-00 |
| **Depended on by** | F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-09 |

---

## 1. Summary

Defines the project scaffolding, folder structure, dependencies, scripts, and quality gates for the
Recomp Tracker SPA. The target stack is **Svelte + Vite + TypeScript**, with **Dexie.js** for
IndexedDB and **`vite-plugin-pwa`** for offline support. This spec makes the repository buildable,
runnable, testable, and lintable before any feature work begins.

---

## 2. Goals / Non-goals

### Goals
- One command to install, one to run, one to build, one to test.
- Strict TypeScript and consistent formatting/linting from day one.
- A feature-first folder structure that maps cleanly onto F-02…F-09.
- Fast local dev with hot module replacement.

### Non-goals
- CI/CD pipelines, deployment hosting, and release automation (out of scope for v1 specs).
- Component library selection (styling is plain CSS + tokens per F-00 §6).

---

## 3. User stories
- As a developer, I can clone the repo and run `npm install && npm run dev` to get a working app shell.
- As a developer, I get type errors and lint warnings in-editor and via a manual pre-commit check.
- As a developer, I can run the unit test suite locally.

---

## 4. Functional requirements

### 4.1 Toolchain
- **FR-01.1** Use **Vite** with the official Svelte + TypeScript template as the build/dev tool.
- **FR-01.2** Node.js ≥ 20 LTS; package manager **npm** (lockfile committed).
- **FR-01.3** TypeScript in **strict** mode (`strict: true`, `noUncheckedIndexedAccess: true`).

### 4.2 Dependencies (runtime)
- **FR-01.4** `svelte`, `dexie`, `svelte-spa-router`.
- **FR-01.5** `vite-plugin-pwa` (+ `workbox-window`) for the service worker/manifest (F-04).

### 4.3 Dependencies (dev)
- **FR-01.6** `typescript`, `svelte-check`, `@tsconfig/svelte`.
- **FR-01.7** `eslint` + `eslint-plugin-svelte` + `@typescript-eslint/*`; `prettier` +
  `prettier-plugin-svelte`.
- **FR-01.8** `vitest` + `@testing-library/svelte` + `jsdom` (unit/component);
  `fake-indexeddb` for testing the data layer without a browser.
- **FR-01.9** End-to-end testing (e.g. Playwright) is **deferred beyond v1**; v1 relies on Vitest
  unit/component tests only.

### 4.4 NPM scripts
- **FR-01.10** Provide scripts:
  - `dev` — start Vite dev server.
  - `build` — type-check then production build.
  - `preview` — serve the production build locally.
  - `check` — `svelte-check` + `tsc --noEmit`.
  - `lint` / `format` — ESLint / Prettier.
  - `test` — Vitest run; `test:watch` — Vitest watch mode.

### 4.5 Folder structure (feature-first)
- **FR-01.11** Adopt the following structure:

```
src/
  main.ts                 # app bootstrap, router mount, DB init
  App.svelte              # shell: nav + <Router/>
  lib/
    db/                   # F-03 Dexie database, schema, migrations, repositories
    router/               # route table, guards
    ui/                   # shared presentational components (Button, Card, ListRow, Dialog…)
    stores/               # cross-cutting Svelte stores (theme, density, activeSession)
    utils/                # dates, ids, formatting, validation
    backup/               # F-05 export/import
  features/
    configurator/         # F-06 (Module 3)
    checklist/            # F-07 (Module 1)
    recorder/             # F-08 (Module 2)
    health/               # F-09 (Module 4)
    settings/             # theme, density, backup UI
  styles/
    tokens.css            # F-00 §6 design tokens
    global.css
tests/
  unit/                   # Vitest
public/
  manifest.webmanifest    # F-04
  icons/
```

### 4.6 Configuration files
- **FR-01.12** Commit `tsconfig.json`, `.eslintrc.*`, `.prettierrc`, `vite.config.ts`,
  `.editorconfig`, `.gitignore`, and a project `README.md`.
- **FR-01.13** `vite.config.ts` registers the Svelte and PWA plugins and sets `base: './'` so the
  built app works from any static path or the file system (supports hash routing, F-00 FR-00.1).

### 4.7 Quality gates
- **FR-01.14** Quality gates are **manual** in v1 (no `husky`/`lint-staged`): a documented
  contributor step runs `npm run check` + `npm run lint` before committing.
- **FR-01.15** `npm run build` fails on type or Svelte-check errors.

---

## 5. Data model
- None directly. Establishes the `src/lib/db/` location where F-03 defines stores.

---

## 6. UI / UX notes
- Include the F-00 design tokens (`styles/tokens.css`) and a minimal global reset in the initial
  scaffold so the shell (F-02) renders with correct spacing/typography from the start.

---

## 7. Dependencies
- **F-00** — architecture, stack decisions, folder intent, design tokens.

---

## 8. Acceptance criteria
- [x] **AC-01.1** `npm install` succeeds on a clean checkout with a committed lockfile.
- [x] **AC-01.2** `npm run dev` serves a running app shell with HMR.
- [x] **AC-01.3** `npm run build` produces a static, hash-routed bundle that runs from `file://` or any static host.
- [x] **AC-01.4** `npm run check` and `npm run lint` pass on the scaffold.
- [x] **AC-01.5** `npm run test` executes the Vitest suite (even with placeholder tests).
- [x] **AC-01.6** The folder structure in FR-01.11 exists and matches the feature specs.
- [x] **AC-01.7** TypeScript strict mode is enabled and enforced by the build.

---

## 9. Open questions
_All resolved for v1._
- **OQ-01.1** ✅ Resolved — keep quality gates **manual** (no husky/lint-staged).
- **OQ-01.2** ✅ Resolved — Playwright/E2E **not required** for v1; Vitest only.
- **OQ-01.3** ✅ Resolved — **npm** is the package manager; lockfile committed.
