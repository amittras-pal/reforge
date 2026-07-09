# Copilot instructions

Full context lives in [`AGENTS.md`](../AGENTS.md) at the repo root — read it first. Highlights:

- **All application code is in [`app/`](../app).** Run every npm command from inside `app/`
  (`cd app && npm run dev`, etc.) — there is no root `package.json`.
- Implementation is spec-driven: [`features/`](../features) holds numbered specs `F-00`…`F-09`
  (see `features/README.md`), built in order. Read the relevant spec (and always
  `features/00-foundation-architecture.md`) before implementing a module.
- The canonical data model and conventions (IDs, dates, units, weekdays) are implemented under
  `app/src/lib/domain/` and `app/src/lib/utils/`, and design tokens under
  `app/src/styles/tokens.css`. Reuse them; don't redefine.
- Files at the repo root outside `app/`/`features/` (the `.html` sheets, `resources/`,
  `notes.md`, `research.md`) are reference material only — not application code.
