# F-10 · Inline Exercise Creation During Routine Building (Module 3)

| | |
| --- | --- |
| **Spec ID** | F-10 |
| **Module** | Module 3 |
| **Status** | Implemented |
| **Depends on** | F-00, F-06 |
| **Depended on by** | — |

---

## 1. Summary

A workflow enhancement to the Workout Configurator (F-06). Today, adding an exercise to a routine
requires the exercise to already exist in the library: the user must leave the routine editor, go to
`/configure/exercises`, create it there, then come back and pick it. This spec lets the user **create
a brand-new exercise inline**, directly from the routine item picker, so they can think and build
**routine-first** without a context switch. The exercise is saved to the shared library exactly as if
created from the Exercises screen — it is not a routine-local definition — and is immediately added as
an item to the routine being edited.

---

## 2. Goals / Non-goals

### Goals
- Let a user add a routine item for an exercise that doesn't exist yet, without leaving the routine editor.
- The inline-created exercise is a first-class library entry: reusable in other routines, visible on
  `/configure/exercises`, subject to the same archive/hard-delete rules as any other exercise.
- Reuse F-06's existing exercise creation validation and defaults exactly — no parallel/duplicate rules.

### Non-goals
- Editing an **existing** exercise's library-level fields from within the routine editor — that
  remains `/configure/exercises`' job.
- Any change to the `Exercise` or `RoutineItem` data model — this is a UI/workflow change only.
- Bulk-creating multiple new exercises in one action.
- Inline exercise creation from anywhere other than the routine editor's exercise picker (see OQ-10.1).

---

## 3. User stories
- As a user building "Lower Body A", when I don't find "Bulgarian Split Squat" in the picker, I can
  create it right there and it's immediately added to my routine.
- As a user, an exercise I create inline is available later when building other routines — it behaves
  exactly like one created from the Exercises screen.
- As a user, if I change my mind while creating the exercise inline, canceling leaves my routine and
  the library untouched.

---

## 4. Functional requirements
- **FR-10.1** The exercise picker (`ExercisePickerSheet.svelte`, FR-06.7) gains a persistent
  **"Create new exercise"** entry, shown alongside the searchable library list — visible whether or
  not the search box has a query, and also shown (as the primary action) when a search matches nothing.
- **FR-10.2** Selecting "Create new exercise" opens the **same** exercise editor already used by
  `/configure/exercises` (`ExerciseEditorSheet.svelte`, FR-06.2) — identical fields, identical
  validation (FR-06.2, FR-06.3) — reused as-is, not reimplemented, stacked over the picker.
- **FR-10.3** On save, the exercise is created via the existing `exercisesRepo.create()` path exactly
  as from the Exercises screen, and the created exercise is then used to add a new routine item the
  same way picking an existing exercise already works (FR-06.7): the item's prescription is pre-filled
  from the new exercise's default and appended to the routine being edited.
- **FR-10.4** Canceling the inline exercise editor returns to the picker with no side effects: no
  exercise created, no item added.
- **FR-10.5** The picker's search box still filters the existing library list as today; "Create new
  exercise" remains available regardless of the current search text, and may pre-fill the new
  exercise's name field from the current search text as a convenience.
- **FR-10.6** This flow is available from every place that already opens `ExercisePickerSheet`
  (creating a new routine or editing an existing one).

---

## 5. Data model
No changes. Reuses `exercises` (F-00 §5.2) via the existing `exercisesRepo.create()` (F-03), and
`RoutineItem` (F-00 §5.3) exactly as FR-06.7 already defines. No new stores, fields, or indexes.

---

## 6. UI / UX notes
- "Create new exercise" renders as a distinct, prominent row (e.g. an accent-colored `ListRow` with a
  leading "+" icon) above the search results, always visible even with an active filter — not just a
  fallback shown only on zero matches.
- Opening the exercise editor over the picker follows the existing stacked-`BottomSheet` pattern
  already used elsewhere in the Configurator (e.g. `RoutineItemSheet` opened from the routine editor)
  — the picker sheet stays mounted underneath and reappears (briefly) if the editor is canceled.
- After saving the new exercise, both sheets close and the routine editor shows the new item appended,
  confirmed with a toast (e.g. "Exercise created and added").

---

## 7. Dependencies
- **F-00** `Exercise`, `RoutineItem` shapes.
- **F-06** `ExercisePickerSheet.svelte`, `ExerciseEditorSheet.svelte`, `RoutineEditorScreen.svelte`,
  `exercisesRepo`, and FR-06.2/06.3/06.7's existing validation and defaulting rules.

---

## 8. Acceptance criteria
- [x] **AC-10.1** From the routine editor's "Add exercise" picker, a user can create a brand-new
  exercise without navigating away from the routine editor.
- [x] **AC-10.2** The newly created exercise appears on `/configure/exercises` afterward (a real
  library entry, not routine-local).
- [x] **AC-10.3** The new exercise is immediately added as an item to the routine being edited, with
  its default prescription pre-filled.
- [x] **AC-10.4** Canceling the inline editor creates nothing and adds nothing.
- [x] **AC-10.5** Existing exercise validation rules (FR-06.2/FR-06.3) apply identically whether the
  exercise is created inline or from the Exercises screen.

---

## 9. Open questions
- **OQ-10.1** Should inline creation also be offered from F-07's `StartSessionSheet` "pick a routine
  directly" ad-hoc flow? Proposed default: **no for v1** — that flow picks whole routines, not
  individual exercises, so inline exercise creation doesn't naturally fit there; scope this spec to
  the Configurator's routine editor only.
