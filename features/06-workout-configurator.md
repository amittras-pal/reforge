# F-06 · Workout Configurator (Module 3)

| | |
| --- | --- |
| **Spec ID** | F-06 |
| **Module** | Module 3 |
| **Status** | Implemented |
| **Depends on** | F-00, F-02, F-03 |
| **Depended on by** | F-07 (Checklist), F-08 (Recorder, indirectly) |

---

## 1. Summary

The configuration hub where the user builds and maintains their training program. It manages three
related things: a reusable **exercise library**, **routines** (workout-day templates composed of
exercises with prescriptions), and the **weekly schedule** (which routines run on which weekday).
Every exercise is either **sets/reps-based** or **duration-based**, and that is fully configurable.
The Configurator starts **empty** — the user adds everything themselves.

---

## 2. Goals / Non-goals

### Goals
- Add / edit / archive exercises, with a type of sets/reps or duration and sensible default prescriptions.
- Compose routines from exercises, set per-routine prescriptions, reorder, and group supersets.
- Assign routines to weekdays to form the weekly microcycle that drives the Checklist (F-07).
- Prevent data-integrity problems (archival vs. historical logs).

### Non-goals
- Running a session or checking off exercises (that is F-07).
- Recording completed sessions or the calendar (F-08).
- Auto-generating or auto-seeding a program (configuration is manual; an example program is available
  only as an explicit, opt-in action — FR-06.19).

---

## 3. User stories
- As a user, I can create an exercise "Barbell Back Squat" as sets/reps (3×8–10) with a rest time.
- As a user, I can create an exercise "Zone 2 Treadmill" as duration (45 min, HR 60–70%).
- As a user, I can build a "Lower Body A" routine by adding exercises and tuning sets/reps per routine.
- As a user, I can reorder exercises within a routine and mark two as a superset.
- As a user, I can assign "Lower Body A" to Monday and Thursday and leave Sunday as rest.
- As a user, I can archive an exercise I no longer use without breaking my past session history.

---

## 4. Functional requirements

### 4.1 Exercise library (`/configure/exercises`)
- **FR-06.1** List exercises with name, category, and type; search by name and filter by category/type;
  toggle to show archived.
- **FR-06.2** Create/edit an exercise: `name` (required), `category` (F-00 enum), `type`
  (`sets_reps | duration`), `instructions` (optional), and a **default prescription** whose fields
  switch by type:
  - *sets_reps:* `sets`, `repsMin`, optional `repsMax`, optional `weight` (kg), optional `restSec`,
    optional `toFailure`.
  - *duration:* `durationSec`, optional `intensity`, optional `targetHrPctMin/Max`, optional `distanceMeters`.
- **FR-06.3** Validate inputs (positive numbers; `repsMin ≤ repsMax`; `targetHrPctMin ≤ targetHrPctMax`).
- **FR-06.4** Archive/restore instead of hard delete (F-00 FR-00.11). Hard delete is allowed **only**
  when no routine or session log references the exercise, and is confirmed.

### 4.2 Routines (`/configure/routines`)
- **FR-06.5** List routines with name, focus, item count, estimated duration; show/hide archived.
- **FR-06.6** Create/edit a routine: `name` (required), optional `focus`, optional `notes`, and an
  ordered list of **routine items**.
- **FR-06.7** Add an item by picking an exercise from the library; the item's prescription is
  pre-filled from the exercise default and can be **overridden per routine** (F-00 §5.3).
- **FR-06.8** Reorder items (drag or up/down), remove items, and duplicate an item.
- **FR-06.9** Group items into a **superset** by assigning a shared `supersetGroup` label.
- **FR-06.10** Optionally set/auto-estimate `estimatedDurationMin`.
- **FR-06.11** Prevent saving a routine with zero items; warn if an item references an archived exercise.
- **FR-06.12** Archive/restore routines; hard delete only when unreferenced by the schedule or logs, confirmed.

### 4.3 Weekly schedule (`/configure/schedule`)
- **FR-06.13** Show all 7 weekdays (respecting `weekStartsOn`); each day lists its assigned routines.
- **FR-06.14** Assign zero or more routines to a weekday; a day with none is a **rest day**.
- **FR-06.15** Reorder multiple routines within a day (e.g. "Lower Body" then "PFMT").
- **FR-06.16** Assigning an archived routine is prevented; if a scheduled routine becomes archived, the
  day flags it for the user to fix.
- **FR-06.17** Schedule changes take effect immediately for the Checklist (F-07).

### 4.4 Configurator home (`/configure`)
- **FR-06.18** Tabbed layout (Exercises · Routines · Schedule). When everything is empty, show an
  **empty-state** with a primary call-to-action to create the first exercise/routine.

### 4.5 Example program & guidance (opt-in)
- **FR-06.19** Offer an **opt-in "Load example program"** action (in the empty-state and in Settings)
  that inserts a starter set of exercises, routines, and a weekly schedule derived from `research.md`
  (the 6-day Upper/Lower + Zone 2/core + PFMT microcycle). It is clearly labelled as an example, is
  fully editable, and can be removed; it is **never** loaded automatically (default remains empty).
- **FR-06.20** Provide a short in-app **usage guide** (linked from the empty-state/Settings) that walks
  through structuring a training day — including how to represent **warm-up** and **cool-down** without
  formal sections (see §6 "Modeling warm-up / cool-down").

---

## 5. Data model
- **Writes:** `exercises`, `routines`, `schedule` (F-00 §5.2–5.4) via F-03 repositories.
- **Reads:** the same, plus references checked against `sessionLogs` for safe hard-delete (F-03 FR-03.11).
- Uses `scheduleRepo.getWeek/setDay`, `routinesRepo.reorderItems`, archive/restore helpers.

---

## 6. UI / UX notes
- Medium density: exercise/routine lists as compact `ListRow`s; the routine editor shows each item as
  a card with an inline prescription summary (e.g. "3 × 8–10 · 60kg · rest 90s" or "45:00 · Zone 2").
- Prescription editor uses `NumberStepper`/`SegmentedControl` for fast thumb input during setup.
- Type switch (sets/reps ⇄ duration) swaps the visible prescription fields cleanly.
- Reordering is touch-friendly (drag handle with up/down fallback).
- Destructive actions use `ConfirmDialog`; archived items are visually de-emphasized.

**Modeling warm-up / cool-down (without sections).** v1 routines are a single **ordered** list, which
is enough to express a full session on, say, an Upper Body day with free weights/machines:
1. **Warm-up** — add it as the **first item(s)**: e.g. a *duration* exercise "Treadmill Warm-up"
   (5:00) and/or a *sets/reps* "Band Pull-apart" (2×15, bodyweight). Category `cardio`/`mobility`
   visually distinguishes them.
2. **Main work** — the ordered lifts (e.g. Bench Press 3×8–10, Lat Pulldown 3×8–12, Overhead Press
   3×8–10…), optionally pairing antagonists with a shared `supersetGroup` label.
3. **Cool-down** — add as the **last item(s)**: a *duration* "Easy Bike" (5:00) or a `mobility`
   stretch, again distinguished by category.
So order + category + the optional superset label + per-item notes cover warm-up/main/cool-down; a
formal section/block construct is intentionally deferred (OQ-06.2).

---

## 7. Dependencies
- **F-00** entity shapes (Exercise, Routine, RoutineItem, ScheduleDay, Prescription).
- **F-02** shell, tabs, UI kit, app-bar action slot ("Add").
- **F-03** repositories, transactions, reactive lists, integrity checks.

---

## 8. Acceptance criteria
- [x] **AC-06.1** A user can create, edit, and archive an exercise of each type with valid prescriptions.
- [x] **AC-06.2** Type switching shows the correct prescription fields and validates them (FR-06.3).
- [x] **AC-06.3** A routine can be built from library exercises with per-routine prescription overrides.
- [x] **AC-06.4** Routine items can be reordered, removed, duplicated, and grouped as supersets.
- [x] **AC-06.5** A routine cannot be saved with zero items.
- [x] **AC-06.6** Each weekday can be assigned 0..n routines; empty = rest day; order is preserved.
- [x] **AC-06.7** Archiving an exercise/routine keeps historical session logs readable (snapshots intact).
- [x] **AC-06.8** Hard delete is blocked when references exist and allowed (with confirm) when none do.
- [x] **AC-06.9** Schedule edits are immediately reflected in the Checklist (F-07). _Confirmed once F-07
  was built: `/today` and `/checklist/:weekday` read the schedule via `liveQuery`, so edits made in the
  Configurator (add/remove/reorder a day's routines) are reflected without a reload._
- [x] **AC-06.10** Empty states guide first-time setup (no seed data present).

---

## 9. Open questions
_All resolved for v1._
- **OQ-06.1** ✅ Resolved — no extra tags; a single `category` is enough for v1.
- **OQ-06.2** ✅ Resolved — no formal sections; a flat ordered list + categories + superset labels
  express warm-up/main/cool-down (see §6 "Modeling warm-up / cool-down").
- **OQ-06.3** ✅ Resolved — a single repeating week only (no A/B cycles) in v1.
- **OQ-06.4** ✅ Resolved — provide an **opt-in** "Load example program" from `research.md` plus a usage
  guide (FR-06.19/FR-06.20); data is never seeded automatically.
