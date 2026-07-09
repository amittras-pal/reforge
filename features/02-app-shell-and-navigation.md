# F-02 · Application Shell & Navigation

| | |
| --- | --- |
| **Spec ID** | F-02 |
| **Module** | Cross-cutting |
| **Status** | Implemented |
| **Depends on** | F-00, F-01 |
| **Depended on by** | F-04, F-06, F-07, F-08, F-09 |

---

## 1. Summary

Defines the persistent application shell: the layout frame, routing table, primary navigation,
theme and density controls, and shared UI primitives that every module renders inside. The shell is
responsive (bottom tab bar on phones, sidebar on wider screens) and honors the medium-density,
clean-layout requirement.

---

## 2. Goals / Non-goals

### Goals
- A consistent frame (app bar + navigation + content outlet) across all routes.
- Hash-based routing that deep-links to any module and survives reloads.
- Global theme (light/dark/system) and density (comfortable/medium/compact) controls.
- A small, reusable UI component kit used by all feature modules.

### Non-goals
- Module-specific screens (owned by F-06…F-09).
- Data access logic (owned by F-03).

---

## 3. User stories
- As a user, I can move between Today, Calendar, Configure, Health, and Settings with one tap.
- As a user, I land on **Today** (my current session) when I open the app.
- As a user, I can switch theme and density and have it remembered.
- As a user, reloading the app keeps me on the same screen (deep-linkable URLs).

---

## 4. Functional requirements

### 4.1 Routing
- **FR-02.1** Use hash-based routing (`svelte-spa-router`). Route table:

| Route | Screen | Spec |
| --- | --- | --- |
| `/` | Redirect to `/today` | F-02 |
| `/today` | Today / active checklist | F-07 |
| `/checklist/:weekday` | Checklist for a specific weekday (0–6) | F-07 |
| `/calendar` | Session calendar | F-08 |
| `/calendar/:date` | Session detail for a date | F-08 |
| `/configure` | Configurator home (tabs) | F-06 |
| `/configure/exercises` | Exercise library | F-06 |
| `/configure/routines` | Routines list/editor | F-06 |
| `/configure/schedule` | Weekly schedule | F-06 |
| `/health` | Health reports list | F-09 |
| `/health/new` | New report | F-09 |
| `/health/:id` | Report detail | F-09 |
| `/settings` | Settings, theme, density, backup (F-05) | F-02/F-05 |
| `*` | Not-found → redirect to `/today` | F-02 |

- **FR-02.2** Unknown routes redirect to `/today`.
- **FR-02.3** The active navigation item reflects the current route.

### 4.2 Layout & navigation
- **FR-02.4** Persistent **app bar** shows the current screen title and a contextual action slot
  (right side) that modules can populate (e.g. "Add exercise", "Finish session").
- **FR-02.5** Primary navigation has **five** entries in this order: **Today**, **Calendar**,
  **Configure**, **Health**, **Settings**.
- **FR-02.6** On viewports `< 900px`, navigation is a **bottom tab bar**; on `≥ 900px`, a left
  **sidebar**. Content area scrolls independently of the shell.
- **FR-02.7** Respect safe-area insets (notches/home indicators) so the bottom bar is usable on
  mobile and in installed PWA standalone mode (F-04).

### 4.3 Theme & density
- **FR-02.8** Theme control with `light | dark | system`; when `system`, follow
  `prefers-color-scheme`. Persist to `meta.theme` (F-03).
- **FR-02.9** Density control with `comfortable | medium | compact`, default **medium**; applies the
  spacing/row tokens from F-00 §6 via a `data-density` attribute on the root. Persist to `meta.density`.
- **FR-02.10** Apply the persisted theme/density **before first paint** to avoid a flash.

### 4.4 Shared UI kit (`lib/ui/`)
- **FR-02.11** Provide reusable primitives consumed by all modules: `Button`, `IconButton`, `Card`,
  `ListRow`, `Checkbox`, `NumberStepper`, `SegmentedControl`, `Select`, `TextField`, `Dialog`/modal,
  `BottomSheet`, `Toast`/snackbar, `Tabs`, `EmptyState`, `Chip`/tag, and `ConfirmDialog`.
- **FR-02.12** All interactive primitives meet the ≥44px touch target and focus-visible requirements
  from F-00 §6 / FR-00.14.

### 4.5 App bootstrap
- **FR-02.13** On startup: initialize the Dexie DB (F-03), load `meta` settings, apply theme/density,
  mount the router, then render the shell.
- **FR-02.14** A lightweight global toast/notification store is available for modules to surface
  success/error messages (e.g. "Session saved").

### 4.6 Settings screen & user profile
- **FR-02.15** The **Settings** tab (`/settings`) aggregates: **User Profile** (name, birthday,
  height cm, gender), **Week starts on** (Sunday…Saturday, default Sunday), **Theme**, **Density**,
  **Backup** (export/import, F-05), and **App/Storage** (install, persistent-storage, usage — F-04).
- **FR-02.16** The global **User Profile** is persisted to `meta.profile` (F-00 §5.7, FR-00.18). Age is
  shown as derived from `birthday`. Editing profile here is the single source of truth for other modules.
- **FR-02.17** `weekStartsOn` is persisted to `meta.weekStartsOn` and consumed by the Calendar (F-08)
  and any weekday listing (F-06 schedule).

---

## 5. Data model
- Reads/writes `meta` keys: `profile`, `theme`, `density`, `weekStartsOn` (F-03). No new stores.

---

## 6. UI / UX notes
- Clean, medium-density frame: compact app bar (~48–56px); a **five-entry** bottom bar (rows ~56px,
  ≥44px targets) with icon + short label per tab.
- Iconography via an inline SVG set (no icon-font network dependency, per F-00 FR-00.16).
- Motion is subtle and disabled under `prefers-reduced-motion`.
- The content outlet has a max readable width on large screens; navigation stays pinned.

---

## 7. Dependencies
- **F-00** design tokens, density model, routing decision, navigation model.
- **F-01** project structure (`lib/ui`, `lib/router`, `lib/stores`), build tooling.

---

## 8. Acceptance criteria
- [x] **AC-02.1** All routes in FR-02.1 resolve; unknown routes redirect to `/today`.
- [x] **AC-02.2** `/` redirects to `/today` and the app opens there by default.
- [x] **AC-02.3** Navigation shows **five** primary entries (Today, Calendar, Configure, Health, Settings) as a bottom bar `<900px` and a sidebar `≥900px`, with correct active state.
- [x] **AC-02.4** Theme and density changes persist across reloads and apply before first paint.
- [x] **AC-02.5** The shared UI kit primitives in FR-02.11 exist and meet touch/focus requirements.
- [x] **AC-02.6** The app bar exposes a contextual action slot used by at least one module.
- [x] **AC-02.7** Deep links (e.g. `/#/calendar/2026-07-08`) load the correct screen on reload.
- [ ] **AC-02.8** Settings hosts the global User Profile and Week-starts-on controls, persisted to `meta` and reflected in other modules. _(Profile/week-start controls exist and persist via a temporary localStorage-backed store; full completion awaits F-03's `meta` store and F-06–F-09 modules actually reading these settings.)_

---

## 9. Open questions
_All resolved for v1._
- **OQ-02.1** ✅ Resolved — **Settings is a 5th bottom-tab entry**.
- **OQ-02.2** ✅ Resolved — no global search in v1.
- **OQ-02.3** ✅ Resolved — five primary tabs, ordered Today · Calendar · Configure · Health · Settings.
