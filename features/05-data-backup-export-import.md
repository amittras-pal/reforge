# F-05 · Data Backup: Export & Import

| | |
| --- | --- |
| **Spec ID** | F-05 |
| **Module** | Cross-cutting |
| **Status** | Implemented |
| **Depends on** | F-00, F-03 |
| **Depended on by** | — |

---

## 1. Summary

Because all data lives only on-device (F-03), the user needs a way to **back up and restore** it —
to guard against cleared browser storage, and to move between devices/browsers. This spec defines a
single self-contained **JSON export** of the entire database and a validated **import** with merge or
replace modes.

---

## 2. Goals / Non-goals

### Goals
- One-tap export of all data to a portable, human-readable JSON file.
- Reliable import that validates the file and its schema version before applying.
- Two import modes: **merge** (add/update) and **replace** (wipe then load).
- Never lose data silently; destructive actions are confirmed.

### Non-goals
- Cloud storage, automatic scheduled backups, or cross-device sync (v1).
- Partial/selective export (all-or-nothing in v1).

---

## 3. User stories
- As a user, I can export all my data to a file I control and store safely.
- As a user, I can import a backup on a new device and continue where I left off.
- As a user, I'm warned before an import overwrites my current data.
- As a user, I'm periodically reminded to back up if I haven't in a while.

---

## 4. Functional requirements

### 4.1 Export
- **FR-05.1** Export produces a single JSON document with this envelope:

```json
{
  "app": "recomp-tracker",
  "schemaVersion": 1,
  "exportedAt": "2026-07-08T05:30:00.000Z",
  "integrity": { "algo": "SHA-256", "hash": "<hex checksum of data>", "hmac": "<optional passphrase HMAC>" },
  "data": {
    "exercises": [],
    "routines": [],
    "schedule": [],
    "sessionLogs": [],
    "activeSession": [],
    "healthReports": [],
    "meta": []
  }
}
```

- **FR-05.2** `data` contains every record from every store (F-00 §5), read within a single
  transaction for a consistent snapshot.
- **FR-05.3** Trigger a file download named `recomp-tracker-backup-YYYY-MM-DD.json`.
- **FR-05.4** On successful export, update `meta.lastBackupAt` (used by the F-04 backup nudge).
- **FR-05.5** `meta` entries that are device-local and non-portable (e.g. `activeSessionId` pointer)
  are exported but treated as advisory on import (see FR-05.11).

### 4.2 Import — validation
- **FR-05.6** Accept a user-selected `.json` file (file picker; drag-and-drop optional).
- **FR-05.7** Validate the envelope: correct `app` identifier, present `schemaVersion`, and a
  well-formed `data` object with known store keys. Reject with a clear message otherwise.
- **FR-05.8** Validate each record against the F-00 shapes (required keys/types). Collect and report
  the count of invalid records; abort the import if any hard-invalid records are found (no partial import).
- **FR-05.9** If `schemaVersion` is **older** than current, run forward migration on the imported data
  before applying. If it is **newer** than the app supports, refuse and advise updating the app.

### 4.3 Import — apply
- **FR-05.10** Offer two modes:
  - **Merge:** upsert imported records by primary key; existing records with the same key are
    updated, others are added. Health reports merge by `id` (in-place upsert).
  - **Replace:** confirm, then `resetAll()` (F-03 FR-03.13) and load the imported data wholesale.
- **FR-05.11** After import, re-derive device-local state: clear a dangling `activeSession` if its
  routine no longer exists, and reconcile `meta.activeSessionId`.
- **FR-05.12** The entire apply step runs in one transaction; failure rolls back to the pre-import state.
- **FR-05.13** Show a post-import summary (records added/updated per store) and a success toast.

### 4.4 Backup reminders
- **FR-05.14** If `meta.lastBackupAt` is null or older than **15 days** (fixed, not configurable in v1)
  **and** the user has data, show a dismissible reminder in Settings/at app start to export a backup.

### 4.5 Safety
- **FR-05.15** All processing is local (FileReader / Blob download); no data leaves the device.
- **FR-05.16** Guard against malformed/oversized files (size cap + JSON parse error handling) so a bad
  file cannot crash the app or corrupt the DB.

### 4.6 Integrity & tamper-evidence (optional)
- **FR-05.17** On export, compute a **SHA-256 checksum** over a **canonical** serialization of
  `{ schemaVersion, exportedAt, data }` (stable key ordering, no insignificant whitespace) using the
  Web Crypto API (`crypto.subtle.digest`, fully offline). Store it as `integrity.hash`.
- **FR-05.18** On import, recompute the checksum and compare. On mismatch, warn that the file is
  **corrupted or was modified** and require an explicit override to continue. A missing `integrity`
  block is allowed (older/hand-made backups) but surfaced as "unverified".
- **FR-05.19** *(Optional, opt-in)* If the user sets a **backup passphrase**, additionally compute an
  **HMAC-SHA-256** (`crypto.subtle.sign`) over the same canonical bytes with a key derived from the
  passphrase, stored as `integrity.hmac`. On import, verifying requires re-entering the passphrase; a
  valid HMAC proves the file was produced by someone who knows the passphrase (authenticity /
  tamper-proofing).
- **FR-05.20** Integrity is **tamper-evidence, not encryption** — the JSON stays human-readable. File
  confidentiality (encryption at rest) is out of scope for v1.

---

## 5. Data model
- Reads and writes **all** stores (F-00 §5) through the F-03 repositories / `resetAll()`.
- Reads/writes `meta.lastBackupAt`.

---

## 6. UI / UX notes
- Lives in **Settings** (F-02): an **Export** button and an **Import** flow with a mode chooser
  (Merge / Replace) and an explicit confirm dialog for Replace.
- Import shows validation **and integrity** results before applying (Verified ✓ / Unverified / Modified);
  success shows the per-store summary.
- An optional **backup passphrase** field (off by default) enables the HMAC signature (FR-05.19).
- Copy emphasizes safety ("Replace will erase current data and cannot be undone").

---

## 7. Dependencies
- **F-00** entity shapes and `schemaVersion` semantics.
- **F-03** repositories, transactions, `resetAll()`, migration hooks.

---

## 8. Acceptance criteria
- [x] **AC-05.1** Export downloads a JSON file containing all records from all stores.
- [x] **AC-05.2** The export envelope matches FR-05.1 and updates `meta.lastBackupAt`.
- [x] **AC-05.3** Import rejects files with wrong `app`, missing `schemaVersion`, or malformed structure.
- [x] **AC-05.4** Import validates records and aborts (no partial write) when hard-invalid records exist.
- [x] **AC-05.5** Merge mode upserts by primary key; existing data is preserved/updated correctly.
- [x] **AC-05.6** Replace mode wipes then loads, only after explicit confirmation, transactionally.
- [x] **AC-05.7** Importing an older-schema backup migrates it; a newer-schema backup is refused.
- [x] **AC-05.8** A dangling `activeSession` is cleared after import.
- [x] **AC-05.9** A round-trip (export → replace-import) reproduces identical data.
- [x] **AC-05.10** The backup reminder appears when `lastBackupAt` is older than 15 days and data exists.
- [x] **AC-05.11** Export embeds a SHA-256 `integrity.hash`; import verifies it and flags modified/corrupted files.
- [x] **AC-05.12** With a passphrase set, export adds an HMAC and import can verify authenticity by re-entering it.

---

## 9. Open questions
_All resolved for v1._
- **OQ-05.1** ✅ Resolved — no CSV export in v1; the JSON backup already contains everything.
- **OQ-05.2** ✅ Resolved — reminder threshold is a **fixed 15 days**, not configurable.
- **OQ-05.3** ✅ Resolved — add **tamper-evidence** (SHA-256 checksum + optional passphrase HMAC) per §4.6;
  full file encryption remains out of scope. Mechanics explained in the delivery notes.
