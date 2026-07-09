# F-08 · Workout Recorder (Module 2)

| | |
| --- | --- |
| **Spec ID** | F-08 |
| **Module** | Module 2 |
| **Status** | Implemented |
| **Depends on** | F-00, F-02, F-03, F-07 |
| **Depended on by** | — |

---

## 1. Summary

The history and calendar. It persists **completed sessions** produced by the Checklist (F-07) and
presents them as a browsable **calendar** so the user can review what they did and when. Selecting a
day opens the full session detail (exercises, actual sets/reps or durations, RPE, notes).

---

## 2. Goals / Non-goals

### Goals
- Durably store every finished session as a `sessionLog`.
- A calendar view that shows which days have recorded sessions at a glance.
- A detailed read view of any past session, with light editing (notes/RPE).
- Simple counts (sessions this week / this month). No streaks in v1.

### Non-goals
- Running/creating a session (F-07 owns that; this module receives the result).
- Program configuration (F-06).
- Advanced analytics/charts of progression (candidate for a later version).

---

## 3. User stories
- As a user, after finishing a workout it appears on my calendar for that date.
- As a user, I can browse months and see which days I trained.
- As a user, I can tap a day to see exactly what I did, including actual reps/weights/durations.
- As a user, I can add or fix a note or RPE on a past session.
- As a user, I can delete a session I logged by mistake.
- As a user, from the calendar I can log a missed session for **today or yesterday**.
- As a user, I can see simple counts of sessions this week and this month.

---

## 4. Functional requirements

### 4.1 Recording (handoff from F-07)
- **FR-08.1** Provide the `sessionLogsRepo.create(log)` contract used by F-07's "Finish" to persist a
  `SessionLog` (F-00 §5.5) atomically.
- **FR-08.2** A recorded session stores the full `items` array with planned vs. actual data,
  `status`, `startedAt`, `completedAt`, optional `rpe` and `notes`, and `weekday`.
- **FR-08.3** Multiple sessions on the same date are allowed and listed together.

### 4.2 Calendar view (`/calendar`)
- **FR-08.4** Render a month calendar (respecting `weekStartsOn`, F-00 FR-00.7) with the current month
  by default and prev/next month navigation plus a "jump to today" control.
- **FR-08.5** Mark days that have ≥1 session with an indicator (e.g. a dot/count and a subtle fill);
  distinguish `completed` vs. `partial` sessions.
- **FR-08.6** Selecting a day shows that day's session(s) — a summary list if multiple. The grid is
  interactive: tapping a date reveals its records.
- **FR-08.7** Show at-a-glance counts: sessions **this week** and **this month**. (No streaks in v1.)

### 4.3 Session detail (`/calendar/:date`)
- **FR-08.8** Show routine name, status, start/end time, RPE, and notes. There is no total-duration
  figure (F-07 deliberately doesn't track overall session time).
- **FR-08.9** List each exercise with planned vs. actual: for sets/reps, a per-set table
  (reps × weight, done/skipped); for duration, actual time / distance / avg HR.
- **FR-08.10** Allow editing `notes` and `rpe` on a saved session (F-00 FR-00.10); all other fields are
  read-only to preserve historical integrity.
- **FR-08.11** Allow **deleting** a session with confirmation.

### 4.4 Integrity
- **FR-08.12** Session detail renders correctly even if the source exercise/routine was later
  archived or renamed, using the stored **snapshots** (F-00 §5.5, F-03 FR-03.11).
- **FR-08.13** Deleting a session removes only that `sessionLog`; it never alters exercises/routines.

### 4.5 Manual entry window
- **FR-08.14** Logging is limited to **today and yesterday**. The calendar offers **"Log session"**
  only on those two dates (handing off to F-07, FR-07.20); dates two or more days in the past are
  read-only. This is the single back-dating rule for the whole app (OQ-08.3).

---

## 5. Data model
- **Writes:** `sessionLogs` (create from F-07; update notes/rpe; delete).
- **Reads:** `sessionLogs` by date/range (`getByDate`, `list(range)`), plus `meta.weekStartsOn`.
- No dependency on live `exercises`/`routines` for display (snapshots are used).

---

## 6. UI / UX notes
- Calendar is compact and thumb-navigable; today is highlighted; days with sessions show a colored
  dot/count. Medium density: a month fits without excessive scrolling on a phone.
- Below the calendar, a list of the selected day's sessions; tapping opens detail. Today/Yesterday
  cells show a **"Log session"** affordance (F-07); older cells are read-only.
- Detail uses collapsible per-exercise cards; planned vs. actual shown side by side or stacked.
- Counts (week/month) shown as small stat chips at the top.
- Delete uses `ConfirmDialog`; edits to notes/RPE save immediately with a toast.

---

## 7. Dependencies
- **F-00** SessionLog shape, date/weekday rules.
- **F-02** shell, routing (`/calendar`, `/calendar/:date`), UI kit, toasts.
- **F-03** `sessionLogsRepo`, reactive reads, `meta.weekStartsOn`.
- **F-07** produces the sessions this module records and displays.

---

## 8. Acceptance criteria
- [x] **AC-08.1** Finishing a session in F-07 persists a `sessionLog` that appears on the correct calendar date.
- [x] **AC-08.2** The calendar marks days with sessions and distinguishes completed vs. partial.
- [x] **AC-08.3** Month navigation and "jump to today" work; `weekStartsOn` is respected.
- [x] **AC-08.4** Selecting a day lists its session(s); multiple same-day sessions are supported.
- [x] **AC-08.5** Session detail shows planned vs. actual for both exercise types accurately.
- [x] **AC-08.6** Notes and RPE are editable on a saved session; other fields are read-only.
- [x] **AC-08.7** A session can be deleted with confirmation, affecting nothing else.
- [x] **AC-08.8** Detail renders correctly after the source exercise/routine is archived or renamed.
- [x] **AC-08.9** Week/month session counts compute correctly (no streaks).
- [x] **AC-08.10** "Log session" is available only on today/yesterday cells; older dates are read-only.

---

## 9. Open questions
_All resolved for v1._
- **OQ-08.1** ✅ Resolved — **no streak** computation in v1 (the "scheduled training days" definition is
  noted as the better fit if it's added later).
- **OQ-08.2** ✅ Resolved — the interactive month **calendar is sufficient**; no separate agenda/list view.
- **OQ-08.3** ✅ Resolved — manual entry is allowed for **today and yesterday only** (FR-08.14 / FR-07.20).
- **OQ-08.4** ✅ Resolved — progression charts **deferred**.
