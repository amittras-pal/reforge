# F-03 · Data Persistence Layer

| | |
| --- | --- |
| **Spec ID** | F-03 |
| **Module** | Cross-cutting |
| **Status** | Implemented |
| **Depends on** | F-00, F-01 |
| **Depended on by** | F-05, F-06, F-07, F-08, F-09 |

---

## 1. Summary

Defines the IndexedDB persistence layer built on **Dexie.js**: the database, its versioned schema
and indexes, migration strategy, and the **repository/service API** that every module uses instead of
touching IndexedDB directly. This is the only place that talks to IndexedDB.

---

## 2. Goals / Non-goals

### Goals
- A single typed Dexie database implementing the canonical model from F-00 §5.
- Clean repository functions per entity (CRUD + queries the modules need).
- Safe, forward-only schema migrations that never lose user data.
- Reactive reads so Svelte views update automatically on data changes.

### Non-goals
- UI (F-02, F-06…F-09) and backup file handling (F-05, which uses this layer).
- Business rules that belong to a module (e.g. session-completion logic lives in F-07/F-08 but
  persists through this layer).

---

## 3. User stories
- As a developer, I call `exercisesRepo.list()` rather than writing IndexedDB cursors.
- As a developer, my Svelte components re-render when underlying data changes, with no manual refresh.
- As a user, my data survives app upgrades because migrations preserve existing records.

---

## 4. Functional requirements

### 4.1 Database & schema
- **FR-03.1** Create one Dexie database, e.g. `recomp-tracker`, defined in `src/lib/db/`.
- **FR-03.2** Declare stores and indexes matching F-00 §5:

| Store | Dexie schema string |
| --- | --- |
| `exercises` | `id, name, category, type, isArchived, updatedAt` |
| `routines` | `id, name, isArchived, updatedAt` |
| `schedule` | `weekday` |
| `sessionLogs` | `id, date, routineId, completedAt, status` |
| `activeSession` | `id` |
| `healthReports` | `id, reportDate, createdAt, updatedAt` |
| `meta` | `key` |

- **FR-03.3** The current schema version is tracked in code (Dexie `version(n)`) **and** mirrored in
  `meta.schemaVersion` for backup/import compatibility checks (F-05).

### 4.2 Migrations
- **FR-03.4** Schema changes are **additive and forward-only**; each new Dexie version includes an
  `upgrade()` transaction when data transformation is required.
- **FR-03.5** Migrations must be idempotent-safe and must not drop or truncate stores holding user data.
- **FR-03.6** On first run (fresh DB), seed only structural defaults: 7 empty `schedule` records
  (weekday 0–6, empty `routineIds`) and default `meta` entries (`density='medium'`, `theme='system'`,
  `weekStartsOn=0` (Sunday), `profile={}`, `schemaVersion`, `activeSessionId=null`,
  `lastBackupAt=null`). **No workout seed data** (per product decision — Configurator starts empty).

### 4.3 Repository API
- **FR-03.7** Provide a repository module per store exposing typed functions. Minimum surface:
  - `exercisesRepo`: `list(filter?)`, `get(id)`, `create(data)`, `update(id, patch)`,
    `archive(id)`, `restore(id)`.
  - `routinesRepo`: `list(filter?)`, `get(id)`, `create`, `update`, `archive`, `restore`,
    `reorderItems(routineId, itemIds)`.
  - `scheduleRepo`: `getWeek()`, `getDay(weekday)`, `setDay(weekday, routineIds)`.
  - `sessionLogsRepo`: `list(range?)`, `get(id)`, `getByDate(date)`, `create(log)`,
    `updateNotes(id, notes)`, `remove(id)`.
  - `activeSessionRepo`: `getCurrent()`, `start(session)`, `patch(partial)`, `clear()`.
  - `healthReportsRepo`: `list(range?)`, `get(id)`, `create(data)`, `update(id, patch)`, `remove(id)`.
  - `metaRepo`: `get(key)`, `set(key, value)`, `getAll()`.
- **FR-03.8** Create/update helpers auto-manage `id` (UUID v4), `createdAt`, and `updatedAt`
  (F-00 FR-00.5/00.6).
- **FR-03.9** Writes that span multiple records use Dexie transactions to guarantee atomicity
  (F-00 FR-00.17).

### 4.4 Reactivity
- **FR-03.10** Provide reactive read helpers (Dexie `liveQuery` wrapped as Svelte stores) so lists
  and details update automatically when data changes.

### 4.5 Integrity & safety
- **FR-03.11** Deleting/archiving an exercise or routine must not corrupt existing `sessionLogs`,
  which retain name/prescription **snapshots** (F-00 §5.5).
- **FR-03.12** Reject writes that violate basic invariants (e.g. a `RoutineItem.exerciseId` that does
  not resolve) with a typed error surfaced to the caller.
- **FR-03.13** Expose a `resetAll()` maintenance function (used by F-05 "replace" import and by a
  Settings "erase all data" action) that clears all stores within a single transaction and re-seeds
  structural defaults.

---

## 5. Data model
- Implements **all** stores in F-00 §5. Adds no new entities.

---

## 6. UI / UX notes
- No UI. Surfaces typed results/errors that modules render via the toast store (F-02 FR-02.14).
- Repository errors should be user-meaningful (e.g. "Couldn't save — storage may be full").

---

## 7. Dependencies
- **F-00** canonical data model, ID/time/versioning rules.
- **F-01** dependency on `dexie`, `fake-indexeddb` for tests, `src/lib/db/` location.

---

## 8. Acceptance criteria
- [x] **AC-03.1** The Dexie DB creates all seven stores with the indexes in FR-03.2.
- [x] **AC-03.2** A fresh install seeds 7 empty schedule days and default `meta`, and **no** exercises/routines.
- [x] **AC-03.3** Each repository exposes the functions in FR-03.7 with correct types.
- [x] **AC-03.4** Create/update helpers set `id`, `createdAt`, `updatedAt` automatically.
- [x] **AC-03.5** Multi-record writes are transactional (verified by a forced-failure test leaving no partial state).
- [x] **AC-03.6** `liveQuery`-backed stores update Svelte views without manual refresh.
- [x] **AC-03.7** A simulated version bump migrates an existing DB without data loss (tested with `fake-indexeddb`).
- [x] **AC-03.8** `resetAll()` clears every store and restores structural defaults atomically.

---

## 9. Open questions
_All resolved for v1._
- **OQ-03.1** ✅ Resolved — a **single** `activeSession` (`id="current"`); no concurrent drafts.
- **OQ-03.2** ✅ Resolved — no cross-tab/optimistic-concurrency guards; assume **one device, one tab,
  one user per instance**.
- **OQ-03.3** ✅ Resolved — the persistent-storage request lives in **F-04 (FR-04.12)**; see the delivery
  notes for what `navigator.storage.persist()` actually changes.
