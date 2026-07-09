# F-09 · Health Tracker (InBody) (Module 4)

| | |
| --- | --- |
| **Spec ID** | F-09 |
| **Module** | Module 4 |
| **Status** | Implemented |
| **Depends on** | F-00, F-02, F-03 |
| **Depended on by** | — |

---

## 1. Summary

A form-driven module to **record, view, and edit InBody body-composition reports**. It mirrors the
fields in `InBody Reports.html`, grouped into logical sections. Each report is a **dated snapshot**: a
dedicated **New report** action adds measurements over time, while any existing report can be **edited
in place** to correct data-entry mistakes. The chronological list of reports is the history used for
referential tracking, and key metrics can be compared against the InBody normal ranges and targets.

---

## 2. Goals / Non-goals

### Goals
- Capture every InBody field, grouped and labeled with units, in one clean form.
- Add reports over time via a dedicated **New report** action, and **edit any report in place** to
  correct mistakes.
- List reports over time and show trends of key metrics (weight, PBF, SMM, visceral fat).
- Show normal-range / target context from the InBody sheet where relevant.

### Non-goals
- Calculating InBody-derived metrics from raw impedance (values are entered as measured).
- Medical interpretation, diagnosis, or advice.
- Nutrition/calorie tracking (the diet plan in `research.md` is reference only).

---

## 3. User stories
- As a user, I can add a new InBody report (via a dedicated **New report** button) with all fields
  grouped like the machine's printout.
- As a user, I can edit an existing report in place to correct a data-entry mistake.
- As a user, I can delete a report I added by mistake.
- As a user, I can see a list of my reports by date and open any one.
- As a user, I can see my most recent metrics against the recommended ranges/targets.
- As a user, I can see whether weight / body fat % / muscle are trending the right way.

---

## 4. Functional requirements

### 4.1 Global profile (read from settings)
- **FR-09.1** Identity/anthropometrics come from the **global User Profile** (`meta.profile`: `name`,
  `birthday`, `heightCm`, `gender`; **age** derived from `birthday`) — F-00 FR-00.18 — not entered per
  report. The report screens **display** these read-only, with a link to edit them in Settings.
- **FR-09.2** When the user creates their **first** report and required profile fields
  (`birthday`, `heightCm`, `gender`) are missing, show a non-blocking **info prompt** explaining these
  are one-time global settings, with a link to Settings. The report can still be saved.

### 4.2 Field groups (form)
- **FR-09.3** The form captures all measurement fields from `InBody Reports.html`, grouped:
  1. **Report meta** — Report Date (required), InBody Score. *(Profile shown read-only from settings.)*
  2. **Composition (kg)** — Body Water, Protein, Mineral, Body Fat Mass, Total Weight.
  3. **Muscle–Fat Analysis** — Skeletal Muscle Mass (kg), Body Fat Mass (kg).
  4. **Obesity Analysis** — BMI (kg/m²), PBF (%).
  5. **Targets** — Target Weight, Weight Control, Fat Control, Muscle Control (kg).
  6. **Ratios & Visceral** — Waist–Hip Ratio, Visceral Fat Level.
  7. **Segmental Lean (kg)** — Left Arm, Right Arm, Left Leg, Right Leg, Torso — each with an optional
     rating (`under | normal | over`).
  8. **Segmental Fat (kg)** — Left Arm, Right Arm, Left Leg, Right Leg, Torso — each with an optional rating.
  9. **Research Parameters** — Fat Free Mass (kg), BMR (kcal), Obesity Degree (%), SMI (kg/m²),
     Recommended Calorie Intake (kcal).
  10. **Notes** — free text.
- **FR-09.4** All numeric fields are optional except **Report Date**, so a partial report can be saved.
- **FR-09.5** Validate numeric ranges/types (non-negative), except `weightControl`/`fatControl`/
  `muscleControl`, which **may be negative** to indicate reduction (per the sheet, e.g. `-13.6`).
- **FR-09.6** Show reference hints inline where the sheet defines them: WHR normal `0.8–0.9`, Visceral
  Fat `< 9`, InBody Score band, and the SMM/BFM normal ranges — as non-blocking guidance.
- **FR-09.7** **Auto-fill with override:** derivable fields (e.g. **BMI** from height+weight, **PBF**
  from Body Fat Mass ÷ Total Weight) are **auto-calculated as suggestions** but remain editable; the
  user can **overwrite** them with the exact value from their InBody printout. Whatever is on screen at
  save time is what is stored ("save the final state").

### 4.3 Creating, editing & deleting
- **FR-09.8** A dedicated **New report** action opens an empty form and saves a new `HealthReport`
  with its own `id`, `createdAt`, and `updatedAt` (F-00 §5.6).
- **FR-09.9** Editing an existing report **updates it in place** (same `id`), correcting any fields and
  bumping `updatedAt`. No new record is created, so incorrect data entry can be fixed directly.
- **FR-09.10** A report can be **deleted** with confirmation; this removes only that report and affects
  nothing else. Deletion is the only way to remove a report.

### 4.4 List, detail & trends
- **FR-09.11** `/health` lists **all** reports (`healthReportsRepo.list()`) sorted by `reportDate`
  descending, each row summarizing date, weight, PBF, SMM, and InBody score, with a prominent
  **New report** button.
- **FR-09.12** `/health/new` opens an empty form; `/health/:id` shows the report's grouped read view
  with **Edit** (in-place) and **Delete** actions.
- **FR-09.13** Show simple trends across reports for **four** key metrics — Total Weight, PBF, Skeletal
  Muscle Mass, Visceral Fat Level — as compact sparklines and the delta vs. the previous report.

### 4.5 Consistency
- **FR-09.14** All reads/writes go through `healthReportsRepo` (F-03); create, edit, and delete each
  run as a single atomic operation. Profile is read from `meta.profile` (managed in Settings, F-02).

---

## 5. Data model
- **Writes/Reads:** `healthReports` (F-00 §5.6) via `healthReportsRepo`
  (`list`, `get`, `create`, `update`, `remove`).
- **Reads** `meta.profile` (global User Profile; F-00 §5.7) for name/age/height/gender display and the
  first-report prompt. Profile is **edited in Settings** (F-02), not here. No other stores.

---

## 6. UI / UX notes
- Grouped form using collapsible sections/cards matching FR-09.3; medium density with compact numeric
  inputs and unit suffixes. Sensible input modes (`inputmode="decimal"`) for fast mobile entry.
- A read-only **Profile** header (Name · Age from birthday · Height · Gender) sourced from Settings,
  with an "Edit in Settings" link; a first-report info prompt appears if those globals are missing.
- Auto-filled derived fields (BMI, PBF) show a subtle "auto" affordance and stay editable so the user
  can paste the exact InBody value; the final on-screen value is saved.
- Segmental lean/fat shown as a small **5-cell body map** (arms, legs, torso) with value + rating color
  (green normal / red over) echoing the InBody sheet palette.
- The most recent report highlights key metrics vs. targets (e.g. Total Weight 72.19 → Target 61.4)
  with the required control deltas.
- A prominent **New report** button adds a measurement; **Edit** opens the same grouped form for
  in-place correction. Deleting a report uses `ConfirmDialog`.

---

## 7. Dependencies
- **F-00** HealthReport shape, editable-report model, global User Profile (FR-00.18), units.
- **F-02** shell, routing (`/health`, `/health/new`, `/health/:id`), Settings-owned User Profile, UI kit, toasts.
- **F-03** `healthReportsRepo`, `meta.profile`, transactions, reactive reads.

---

## 8. Acceptance criteria
- [x] **AC-09.1** The form captures every measurement field in `InBody Reports.html`, grouped per FR-09.3 with units.
- [x] **AC-09.2** Profile (name/age/height/gender) is read from global settings, shown read-only, with an edit link.
- [x] **AC-09.3** Creating the first report with missing global profile fields shows a non-blocking prompt linking to Settings; the report still saves.
- [x] **AC-09.4** Only Report Date is required; partial reports save; control fields accept negatives.
- [x] **AC-09.5** Derived fields (BMI, PBF) auto-fill as suggestions, remain editable, and the final on-screen value is saved.
- [x] **AC-09.6** The **New report** action creates a new dated report; editing updates in place (same `id`, bumps `updatedAt`); delete needs confirmation.
- [x] **AC-09.7** `/health` lists all reports, newest first, with summary metrics and a New report button.
- [x] **AC-09.8** Reference hints (WHR, visceral fat, score, SMM/BFM ranges) display as guidance.
- [x] **AC-09.9** Four key-metric trends (weight, PBF, SMM, visceral fat) and deltas vs. the previous report are shown.
- [x] **AC-09.10** Segmental lean/fat render as a body map with values and ratings.

---

## 9. Open questions
_All resolved for v1._
- **OQ-09.1** ✅ Resolved — **auto-fill derived fields (BMI, PBF) but allow overwrite** from the actual
  printout; save the final state (FR-09.7).
- **OQ-09.2** ✅ Resolved — no dedicated CSV export; the full JSON backup (F-05) already includes reports.
- **OQ-09.3** ✅ Resolved — trend view shows **4 key metrics** as sparklines; no full charts screen in v1.
- **OQ-09.4** ✅ Resolved — profile is a **global setting** (name, birthday→age, height, gender); the app
  prompts for missing globals at first report (FR-09.1/09.2, F-00 FR-00.18).
