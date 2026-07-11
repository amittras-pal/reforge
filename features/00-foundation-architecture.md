# F-00 · Foundation & Architecture

| | |
| --- | --- |
| **Spec ID** | F-00 |
| **Module** | Cross-cutting |
| **Status** | Implemented |
| **Depends on** | — |
| **Depended on by** | F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08, F-09 |

---

## 1. Summary

This spec defines the cross-cutting architecture, conventions, and the **canonical data model** for
the Recomp Tracker application. It is the single source of truth for entity shapes, IndexedDB store
definitions, ID/versioning strategy, units, and non-functional requirements. Feature specs F-01…F-09
reference this document rather than re-defining shared types.

The application is a **fully client-side, offline-first SPA**. It runs during gym sessions on a phone,
persists all data locally in IndexedDB, and requires no network at runtime.

---

## 2. Goals / Non-goals

### Goals
- Establish one consistent domain model reused by every module.
- Make the app usable offline and resilient to mid-session reloads.
- Keep the data model export/import-friendly (plain, serializable JSON).
- Medium information density with a clean, mobile-first layout.

### Non-goals
- No backend, sync, or auth (see README §6).
- No feature-level behaviour here — that belongs in F-06…F-09.

---

## 3. User stories (architectural)

- As a developer, I want a single typed domain model so all modules stay consistent.
- As a user, I want my data to survive app reloads, updates, and being offline.
- As a user, I want confidence my on-device data can be backed up and restored (see F-05).

---

## 4. Functional requirements

### 4.1 Architecture
- **FR-00.1** The app is a single-page application with **hash-based routing** so it works from any
  static host or the file system without server rewrites.
- **FR-00.2** All persistence goes through a single Dexie database instance (F-03). UI components
  never call the IndexedDB API directly; they use repository/service modules.
- **FR-00.3** Business/domain logic is framework-agnostic (plain TS modules) so it is unit-testable
  without mounting Svelte components.
- **FR-00.4** The app is organized by feature (feature-first folder layout, see F-01).

### 4.2 Identity & time
- **FR-00.5** All entity IDs are UUID v4 strings generated with `crypto.randomUUID()`.
- **FR-00.6** Calendar dates are stored as `YYYY-MM-DD` **local** date strings. Timestamps
  (`createdAt`, `updatedAt`, `startedAt`, `completedAt`) are ISO‑8601 UTC strings.
- **FR-00.7** Weekday keys use JavaScript `Date.getDay()` semantics: `0=Sunday … 6=Saturday`.
  Calendar/first-day-of-week display is controlled by a user-configurable `weekStartsOn` setting
  (default **Sunday**); the Calendar view (F-08) must respect this choice.

### 4.3 Units
- **FR-00.8** Canonical units: mass in **kg**, height in **cm**, durations in **seconds**
  (displayed `m:ss` or `h:mm`), distance in **meters**, heart rate in **bpm** or **% of max**.
  Units are fixed in v1 (no unit switching).

### 4.4 Editing & retention strategy
- **FR-00.9** Health reports are **editable, dated records** (see §5.6). Each report is an independent
  point-in-time snapshot with its own `id`; the chronological list of reports is the history used for
  referential tracking. Creating a report is an explicit action (a dedicated "New report" button in
  F-09), while editing an existing report **corrects it in place** (bumping `updatedAt`) so data-entry
  mistakes can be fixed. There is no per-edit revision log.
- **FR-00.10** Session logs are immutable once completed except for a `notes` field (editable in F-08).
- **FR-00.11** Exercises and routines are **soft-deleted** (`isArchived`) so historical session logs
  that reference them remain readable.

### 4.5 Non-functional requirements
- **FR-00.12 Offline:** After first load the app functions with zero network (F-04).
- **FR-00.13 Performance:** Initial interactive load < 2.5s on a mid-range phone; route transitions
  feel instant (< 100ms perceived). Session checklist interactions must not block the main thread.
- **FR-00.14 Accessibility:** WCAG 2.1 AA targets — semantic HTML, focus management, ≥44px touch
  targets, visible focus, `prefers-reduced-motion` and `prefers-color-scheme` respected.
- **FR-00.15 Browser support:** Latest 2 versions of Chrome, Safari (incl. iOS Safari), Firefox, Edge.
- **FR-00.16 Privacy:** No telemetry, analytics, or third-party network calls. All data stays local.
- **FR-00.17 Resilience:** All writes are transactional; a failed write must not leave partial state.

### 4.6 User profile (global)
- **FR-00.18** A single global **User Profile** (`name`, `birthday`, `heightCm`, `gender`) is stored in
  `meta` under key `profile` (§5.7). **Age** is derived from `birthday` at display time and never stored.
  Modules (notably the Health Tracker, F-09) read identity/anthropometrics from this global profile
  rather than duplicating them. When a required profile field is missing at the point it is first needed
  (e.g. creating the first health report), the app informs the user and links to Settings to complete it.

---

## 5. Data model (canonical)

TypeScript-style interfaces below are the contract. All objects are plain and JSON-serializable.

### 5.1 Enumerations & shared types

```ts
type ExerciseType = 'sets_reps' | 'duration';

type ExerciseCategory =
  | 'lower' | 'upper' | 'core' | 'cardio' | 'pfmt' | 'mobility' | 'class' | 'other';

type SegmentRating = 'under' | 'normal' | 'over';

type ISODateTime = string; // e.g. "2026-07-08T05:30:00.000Z"
type LocalDate = string;   // e.g. "2026-07-08"
type UUID = string;

interface SetsRepsPrescription {
  sets: number;
  repsMin: number;
  repsMax?: number;      // omit for a fixed rep target
  weight?: number;       // kg, optional (bodyweight if omitted)
  restSec?: number;      // rest between sets
  toFailure?: boolean;
}

interface DurationPrescription {
  durationSec: number;
  intensity?: string;    // free text, e.g. "Zone 2"
  targetHrPctMin?: number; // e.g. 60
  targetHrPctMax?: number; // e.g. 70
  distanceMeters?: number;
}

type Prescription =
  | ({ kind: 'sets_reps' } & SetsRepsPrescription)
  | ({ kind: 'duration' } & DurationPrescription);
```

### 5.2 `exercises` — exercise library

```ts
interface Exercise {
  id: UUID;
  name: string;
  category: ExerciseCategory;
  type: ExerciseType;
  defaultPrescription: Prescription; // seeds new routine items
  instructions?: string;             // cues / notes
  isArchived: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```
Indexes: `id` (PK), `name`, `category`, `type`, `isArchived`, `updatedAt`.

### 5.3 `routines` — workout-day templates

```ts
interface RoutineItem {
  itemId: UUID;
  exerciseId: UUID;         // references Exercise
  order: number;            // 0-based position in the routine
  prescription: Prescription; // may override the exercise default
  supersetGroup?: string;   // items sharing a label are performed as a superset
  notes?: string;
}

interface Routine {
  id: UUID;
  name: string;             // e.g. "Lower Body A"
  focus?: string;           // e.g. "Lower Body Hypertrophy & Pelvic Stability"
  items: RoutineItem[];
  estimatedDurationMin?: number;
  notes?: string;
  isArchived: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```
Indexes: `id` (PK), `name`, `isArchived`, `updatedAt`.

### 5.4 `schedule` — weekly microcycle

```ts
interface ScheduleDay {
  weekday: number;          // 0=Sun … 6=Sat (PK)
  routineIds: UUID[];       // 0..n routines; empty = rest day
  label?: string;           // optional day label, e.g. "Rest"
}
```
Indexes: `weekday` (PK). Exactly 7 records (one per weekday) maintained by F-06.

### 5.5 `sessionLogs` & `activeSession` — performed sessions

```ts
interface LoggedSet { setNo: number; reps?: number; weight?: number; done: boolean; }

interface LoggedItem {
  exerciseId: UUID;
  nameSnapshot: string;     // captured at session time (survives archival/rename)
  type: ExerciseType;
  planned: Prescription;    // snapshot of the prescription
  // actuals:
  setResults?: LoggedSet[]; // for sets_reps
  actualDurationSec?: number; // for duration
  actualDistanceMeters?: number;
  actualAvgHr?: number;
  // duration stopwatch (FR-07.10), persisted so it survives reload/backgrounding:
  stopwatchStartedAtMs?: number; // wall-clock epoch anchor; present only while running
  stopwatchElapsedSec?: number;  // last-known elapsed; authoritative while stopped
  completed: boolean;
  skipped: boolean;
  notes?: string;
}

interface SessionLog {
  id: UUID;
  date: LocalDate;          // day the session was performed
  weekday: number;          // 0..6
  routineId: UUID;
  routineNameSnapshot: string;
  status: 'completed' | 'partial';
  startedAt: ISODateTime;
  completedAt: ISODateTime;
  items: LoggedItem[];
  rpe?: number;             // 1..10 session rating of perceived exertion
  notes?: string;
  createdAt: ISODateTime;
}

// In-progress session (at most one). Convention: id = "current".
interface ActiveSession {
  id: UUID;                 // "current"
  date: LocalDate;
  weekday: number;
  routineId: UUID;
  routineNameSnapshot: string;
  startedAt: ISODateTime;
  updatedAt: ISODateTime;
  items: LoggedItem[];      // same shape, mutated as the user progresses
}
```
`sessionLogs` indexes: `id` (PK), `date`, `routineId`, `completedAt`, `status`.
`activeSession` indexes: `id` (PK).

### 5.6 `healthReports` — versioned InBody snapshots

```ts
interface Segment { mass: number; rating?: SegmentRating; }   // kg
interface Segmental { leftArm: Segment; rightArm: Segment; leftLeg: Segment; rightLeg: Segment; torso: Segment; }

interface HealthReport {
  id: UUID;                 // PK
  reportDate: LocalDate;    // measurement date (from InBody sheet "Report Date")
  measuredAt?: ISODateTime;

  // Age / height / gender live in the global User Profile (§5.7), not per report.
  score?:     number;                                   // InBody Score (0..100)
  composition:{ bodyWaterKg?: number; proteinKg?: number; mineralKg?: number; bodyFatMassKg?: number; totalWeightKg?: number };
  muscleFat:  { skeletalMuscleMassKg?: number; bodyFatMassKg?: number };
  obesity:    { bmi?: number; pbf?: number };           // pbf = percent body fat
  targets:    { targetWeightKg?: number; weightControlKg?: number; fatControlKg?: number; muscleControlKg?: number };
  whr?:       number;                                   // waist-hip ratio
  visceralFatLevel?: number;
  segmentalLean?: Segmental;
  segmentalFat?:  Segmental;
  research:   { fatFreeMassKg?: number; bmr?: number; obesityDegreePct?: number; smi?: number; recommendedCalorieIntake?: number };

  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;   // bumped on each in-place edit
}
```
Indexes: `id` (PK), `reportDate`, `createdAt`, `updatedAt`.

### 5.7 `meta` — settings, profile & app metadata

```ts
interface MetaEntry { key: string; value: unknown; }

// Stored under meta key `profile`. Age is derived from `birthday` at display time.
interface UserProfile {
  name?: string;
  birthday?: LocalDate;   // used to derive current age
  heightCm?: number;
  gender?: 'male' | 'female' | 'other';
}
```
Well-known keys: `schemaVersion` (number), `profile` (`UserProfile`),
`theme` (`'light'|'dark'|'system'`),
`density` (`'comfortable'|'medium'|'compact'`, default `'medium'`),
`weekStartsOn` (`0..6`, default `0` = Sunday), `activeSessionId` (`UUID | null`),
`lastBackupAt` (`ISODateTime | null`). Indexes: `key` (PK).

---

## 6. UI / UX notes

### 6.1 Design tokens (CSS custom properties)
- **Spacing scale (medium density):** `--sp-1:4px --sp-2:8px --sp-3:12px --sp-4:16px --sp-5:24px --sp-6:32px`.
- **Type scale:** `--fs-xs:12px --fs-sm:13px --fs-md:14px --fs-lg:16px --fs-xl:20px --fs-2xl:28px`.
  Base body text 14px (medium density).
- **Radius:** `--radius-sm:6px --radius-md:10px --radius-lg:16px`.
- **Color:** a small semantic palette (`--bg`, `--surface`, `--text`, `--muted`, `--primary`,
  `--success`, `--warning`, `--danger`) defined for light and dark themes; category colors map to
  the InBody sheet's palette for familiarity.
- **Touch targets:** interactive rows/controls ≥ 44px tall even at medium density.

### 6.2 Density
Three density modes toggle spacing/row-height tokens. Default **medium**: compact enough to show a
full routine on one mobile screen, still comfortably tappable.

### 6.3 Responsive & navigation
Mobile-first. Primary navigation is a **bottom tab bar** on phones with **five** entries (Today,
Calendar, Configure, Health, Settings); a **left sidebar** on ≥ 900px. Detailed in F-02.

### 6.4 Theming
Light/dark/system. `prefers-color-scheme` honored when theme = `system`. Theme persisted in `meta`.

---

## 7. Dependencies
- None. This is the base spec everything else builds on.

---

## 8. Acceptance criteria
- [x] **AC-00.1** A single documented domain model exists and every module spec references it.
- [x] **AC-00.2** All entity shapes are JSON-serializable (no class instances, Dates, or Maps stored).
- [x] **AC-00.3** ID, date, timestamp, unit, and weekday conventions are defined and unambiguous.
- [x] **AC-00.4** Health-report editing and soft-delete (exercise/routine) strategies are defined.
- [x] **AC-00.5** Non-functional targets (offline, performance, a11y, privacy, browsers) are stated.
- [x] **AC-00.6** Design tokens and density model are defined and reused by F-02.
- [x] **AC-00.7** A global User Profile (name, birthday, height, gender; age derived) is defined and stored in `meta`.

---

## 9. Open questions
_All resolved for v1._
- **OQ-00.1** ✅ Resolved — a single `durationSec` per item is sufficient; no split/interval structure in v1.
- **OQ-00.2** ✅ Resolved — the week starts on **Sunday** by default and is user-configurable; the Calendar (F-08) respects it.
- **OQ-00.3** ✅ Resolved — no units-agnostic layer; metric only (kg, cm) in v1.
