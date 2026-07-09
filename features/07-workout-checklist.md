# F-07 · Workout Checklist (Module 1)

| | |
| --- | --- |
| **Spec ID** | F-07 |
| **Module** | Module 1 |
| **Status** | Implemented |
| **Depends on** | F-00, F-02, F-03, F-06 |
| **Depended on by** | F-08 (Recorder) |

---

## 1. Summary

The in-session driver. For a given weekday it loads the scheduled routine(s) from the Configurator
(F-06) and presents every prescribed exercise as a **checkable list** the user works through during
training. It tracks live progress (checking off exercises, logging actual sets/reps or duration),
survives reloads, and on completion hands a finished session to the Recorder (F-08).

This is the app's **default landing screen** (`/today`).

---

## 2. Goals / Non-goals

### Goals
- Show today's prescribed exercises as a clear, tappable checklist.
- Let the user tick off exercises and optionally record actuals with minimal friction.
- Persist in-progress state so a mid-gym reload/PWA update loses nothing.
- Finish a session and produce a `sessionLog` (F-08).

### Non-goals
- Configuring exercises/routines/schedule (F-06).
- The calendar/history view (F-08).
- Rest timers or coaching. The only timer is an **optional, user-started stopwatch for duration items**
  (FR-07.10); it is a convenience for real-time logging, not required. There is deliberately **no
  overall session timer or total-duration tracking** — a workout's value isn't its total elapsed time.

---

## 3. User stories
- As a user, I open the app at the gym and immediately see today's session checklist.
- As a user, I check off each exercise as I complete it and see my progress.
- As a user, I can log the actual reps/weight I did, or the actual duration, per exercise.
- As a user, if I reload or my phone locks, my progress is exactly where I left it.
- As a user, I can view another weekday's planned session and choose to perform it today (e.g. do
  Tuesday's plan on Wednesday) — without any manual "skip" bookkeeping.
- As a user, if I forgot to log, I can record a session for **yesterday** (but no further back).
- As a user, I can finish the session (fully or partially) and save it to my history.

---

## 4. Functional requirements

### 4.1 Loading today / a weekday
- **FR-07.1** `/today` resolves the current weekday (`Date.getDay()`) and loads its scheduled
  routine(s) from `scheduleRepo` + `routinesRepo` (F-03).
- **FR-07.2** `/checklist/:weekday` shows any weekday's plan (preview) and lets the user **start it as
  today's session** (or a chosen eligible date, FR-07.20). This covers picking up a skipped day's plan
  on another day — no manual skip record is kept.
- **FR-07.3** If the day has **no** routine (rest day), show a friendly rest-day state.
- **FR-07.4** If the day has multiple routines, render them as ordered sections in one checklist.
- **FR-07.5** Each exercise row shows its name and prescription summary (e.g. "3 × 8–10 · 60 kg" or
  "45:00 · Zone 2, HR 60–70%") sourced from the routine item's prescription snapshot.

### 4.2 Running a session (active state)
- **FR-07.6** Starting a session creates an `activeSession` (F-00 §5.5) seeded from the chosen
  routine(s), snapshotting each item's `nameSnapshot` and `planned` prescription. Only **one** active
  session exists at a time. The routine may be **today's scheduled** one, **another weekday's**
  scheduled routine, or **any routine** from the library (ad-hoc).
- **FR-07.7** If an `activeSession` already exists for **today**, `/today` resumes it. Sessions do not
  carry across days — a leftover active session from a previous day is handled by the midnight-expiry
  rule (FR-07.21), not resumed.
- **FR-07.8** Checking an exercise marks its `LoggedItem.completed = true`; unchecking reverts it.
- **FR-07.9** For **sets/reps** items, the user logs **actuals** per set (`reps`, `weight`, `done`).
  Actual fields start **empty** — the planned values are shown only as a placeholder/hint (the plan is
  a recommendation; the checklist records what was actually done). A one-tap **"use planned"** copies
  the hint into the actual for speed; marking a set `done` requires an actual value (or an explicit
  "as planned").
- **FR-07.10** For **duration** items, the user enters actual `durationSec` (empty by default) plus
  optional `distanceMeters` / `avgHr`. An **optional stopwatch** (counts **up** from 0) can be
  **started by the user** to capture the actual time in real time. A count-up stopwatch — rather than a
  countdown — lets the user **overshoot the planned duration**, so the recorded actual reflects time
  truly spent and can **surpass the plan**. It is purely a convenience; a user logging later (e.g. at
  night) can just type the value.
- **FR-07.11** Allow **skipping** an item (`skipped = true`) with an optional reason note.
- **FR-07.12** Show live progress (e.g. "4 / 9 done"). There is no overall session elapsed-time
  indicator — only the per-item duration stopwatch (FR-07.10).
- **FR-07.13** Every change persists immediately to `activeSession` via `activeSessionRepo.patch`
  (debounced), so state is durable across reloads/PWA updates (F-04 FR-04.11).

### 4.3 Finishing / discarding
- **FR-07.14** "Finish session" writes a `sessionLog` (F-08) with `status = 'completed'` if all
  non-skipped items are done, else `'partial'`; sets `completedAt`. The session's total duration is
  not computed or stored (see Non-goals).
- **FR-07.15** On finish, capture optional session `rpe` (1–10) and `notes`, then clear the
  `activeSession` and reset `meta.activeSessionId`.
- **FR-07.16** "Discard session" (confirmed) clears the `activeSession` without writing a log.
- **FR-07.17** Prevent creating a duplicate active session while one is in progress (FR-07.6/07.7).

### 4.4 Edge cases
- **FR-07.18** If a scheduled routine was edited/archived after a session started, the active session
  keeps its **snapshot** (does not mutate mid-session).
- **FR-07.19** Handle empty schedule and empty library gracefully with a CTA to open the Configurator (F-06).

### 4.5 Session date & expiry
- **FR-07.20** A session's **date** defaults to **today**. The user may set it to **yesterday** (the
  only permitted back-date; see F-08 FR-08.14); dates older than yesterday and future dates are not
  allowed. The finished `sessionLog.date` reflects this chosen date.
- **FR-07.21** **Midnight expiry:** an `activeSession` belongs to its start day only. On app load (or at
  the day rollover), if `activeSession.date` is before today it is **expired** — auto-finalized as a
  `partial` `sessionLog` for its original date if it has any logged progress, otherwise discarded — and
  then cleared. It is never resumed the next day (no carry-forward).

---

## 5. Data model
- **Reads:** `schedule`, `routines`, `exercises` (F-00 §5.2–5.4).
- **Reads/Writes:** `activeSession` (create/patch/clear) and `meta.activeSessionId`.
- **Writes (on finish):** one `sessionLog` (F-00 §5.5) — persisted via F-08's contract.

---

## 6. UI / UX notes
- Default screen; medium density. Each exercise is a `ListRow` with a large checkbox/tap target, the
  prescription summary, and an expandable area for set-by-set logging or the duration stopwatch.
- A **date chip** (Today / Yesterday) sits near the top; a **"Start a different routine"** action lets
  the user pick another day's schedule or any routine (FR-07.6).
- A sticky header shows routine name and progress ("4 / 9"); a sticky footer/app-bar
  action holds **Finish** (and an overflow **Discard**).
- Completed rows are visually checked and de-emphasized; skipped rows are distinctly marked.
- Actuals are **empty by default** with the planned value shown as a faint placeholder and a
  **"use planned"** shortcut; `NumberStepper`s are sized for sweaty-thumb use with minimal typing.
- Duration items show an **optional Start/Stop stopwatch** (counts up, may exceed the planned time) the
  user may run for real-time logging.
- Rest-day and empty states are clear and friendly with a link to Configure (F-06).

---

## 7. Dependencies
- **F-00** ActiveSession/SessionLog/Prescription shapes, weekday/date/time rules.
- **F-02** shell, routing (`/today`, `/checklist/:weekday`), UI kit, app-bar action, toasts.
- **F-03** repositories for schedule/routines/exercises/activeSession/meta; reactive reads.
- **F-06** provides the routines/schedule this module consumes.
- **F-08** consumes the finished `sessionLog` (finish handoff).

---

## 8. Acceptance criteria
- [x] **AC-07.1** `/today` shows the current weekday's scheduled exercises as a checklist.
- [x] **AC-07.2** A rest day (no routine) shows a rest-day state; other weekdays are previewable via `/checklist/:weekday`.
- [x] **AC-07.3** Starting a session creates a single `activeSession` snapshotting names/prescriptions.
- [x] **AC-07.4** Actuals start empty; entering per-set / duration values (or "use planned") updates the active session.
- [x] **AC-07.5** The user can start today's routine, another weekday's routine, or any library routine (ad-hoc).
- [x] **AC-07.6** Session date defaults to today and may be set to yesterday only; older/future dates are rejected.
- [x] **AC-07.7** Items can be skipped with an optional reason; progress updates live.
- [x] **AC-07.8** Reloading mid-session restores exact progress (durability).
- [x] **AC-07.9** An optional user-started stopwatch captures a duration item's actual (counting up, and may exceed the planned time); logging without it also works.
- [x] **AC-07.10** Finishing writes a `sessionLog` (`completed`/`partial`) for the chosen date and clears the active session.
- [x] **AC-07.11** A previous-day active session is expired at midnight (auto-saved as partial if it had progress, else discarded) and never resumed.
- [x] **AC-07.12** Discarding (confirmed) clears the active session without writing a log; empty states link to the Configurator; a mid-session routine edit/archive doesn't change the snapshot.

---

## 9. Open questions
_All resolved for v1._
- **OQ-07.1** ✅ Resolved — no rest timer; provide an **optional, user-started stopwatch for duration
  items** (counts up so the user can exceed the plan and record actual time spent; real-time logging convenience).
- **OQ-07.2** ✅ Resolved — yes, the user can start **any** routine / another weekday's plan; skipping a
  day needs no record (just don't log it), and you can perform that plan on a later day.
- **OQ-07.3** ✅ Resolved — **no carry-forward**; active sessions **expire at midnight** (FR-07.21), and
  real-time logging is not required.
- **OQ-07.4** ✅ Resolved — **force entry**: actuals start empty (plan is only a hint); the recorder
  shows actuals vs. plan.
