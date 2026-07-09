# F-11 · App Icon & Brand Identity Refresh (Cross-cutting)

| | |
| --- | --- |
| **Spec ID** | F-11 |
| **Module** | Cross-cutting |
| **Status** | Draft |
| **Depends on** | F-04 |
| **Depended on by** | — |

---

## 1. Summary

Replace the app's current icon set with a **purpose-built brand icon** for Reforge. F-04
(Offline & PWA) shipped a functional PWA icon set (`any`/`maskable`, 192/512px) so the app is
installable, but the artwork itself is a generic stand-in (an abstract lightning-bolt mark) rather
than something that reads as a body-recomposition / workout-and-health-tracking app. This spec covers
designing (or sourcing) a real mark and regenerating every derived icon asset from it — it does not
change the manifest/service-worker/install mechanics F-04 already built.

---

## 2. Goals / Non-goals

### Goals
- Establish a simple, recognizable icon that reflects the app's purpose (training + body-composition
  tracking) rather than a generic abstract shape.
- Regenerate the **full existing asset set** from the new mark: `any` (192/512), `maskable` (192/512,
  respecting the ~80%-diameter safe zone), and the iOS `apple-touch-icon.png` (180×180) — same sizes
  and `purpose` values F-04 already defined, just new artwork.
- Keep (or deliberately update, per OQ-11.1) `theme_color`/`background_color` in
  `manifest.webmanifest` and the icon's own background so they stay visually coherent with each other
  and with the app's light-theme `--primary`/`--bg` tokens (F-00 §6.1), matching F-04's original intent.

### Non-goals
- Any change to PWA registration, install-prompt logic, or service-worker caching strategy — all
  already correct in F-04 and untouched here.
- A full visual re-brand (typography, in-app color palette, marketing assets) — scope is the icon
  asset set and its manifest/HTML wiring only.
- Runtime, user-facing theming (e.g. an icon picker) — this is a one-time static asset replacement.

---

## 3. User stories
- As a user, when I install the app to my home screen, I see an icon that clearly signals "workout /
  fitness tracking", not an unrelated abstract shape.
- As a user browsing my phone's app grid, Reforge's icon is visually distinct from other apps.

---

## 4. Functional requirements
- **FR-11.1** Produce one master icon design (source SVG or equivalent) representing the app's
  purpose (e.g. a motif built from a dumbbell/figure/progress-chart element — final concept is a
  design decision, not mandated by this spec).
- **FR-11.2** Regenerate all four PNGs currently referenced by `manifest.webmanifest`'s `icons` array
  (`icon-any-192.png`, `icon-any-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`) from the
  new master design, preserving each file's existing `purpose` semantics (F-04): `any` icons keep
  reasonable padding for square display contexts; `maskable` icons keep the mark within the safe
  circular zone so it survives any OS mask shape.
- **FR-11.3** Regenerate `apple-touch-icon.png` (180×180, full-bleed square, no maskable concept on
  iOS) from the same master design.
- **FR-11.4** Update `theme_color`/`background_color` in `manifest.webmanifest` and the corresponding
  `<meta name="theme-color">` handling in `index.html` only if the new design's palette requires it;
  otherwise leave F-04's existing values as-is.
- **FR-11.5** No other manifest field (`name`, `short_name`, `start_url`, `scope`, `display`,
  `orientation`) changes.
- **FR-11.6** All existing installability/offline acceptance criteria from F-04 (AC-04.1 and friends)
  continue to pass unchanged — this is an asset swap, not a mechanism change.

---

## 5. Data model
None. This spec touches only static assets (`public/icons/*.png`, `public/apple-touch-icon.png`) and
`public/manifest.webmanifest` field values — no application data, stores, or types are involved.

---

## 6. UI / UX notes
- Follow the same generation approach F-04 documented (a source SVG rendered at each target size,
  respecting maskable's safe-zone convention) so the new assets are consistent with how F-04's
  tooling/process already works — no new asset pipeline is introduced.
- The new icon should read clearly at the smallest rendered size (a ~24–40px favicon/tab context), not
  just at 512px — verify legibility at small sizes before finalizing.
- Keep the icon's dominant color(s) harmonious with `--primary` (F-00 §6.1) so the installed icon
  doesn't visually clash with the in-app theme, unless a deliberate departure is chosen (OQ-11.1).

---

## 7. Dependencies
- **F-04** owns `manifest.webmanifest`, `public/icons/`, `apple-touch-icon.png`, and the
  `<link rel="manifest">`/`apple-mobile-web-app-*`/theme-color wiring in `index.html` this spec builds on.

---

## 8. Acceptance criteria
- [ ] **AC-11.1** A new master icon design exists and clearly reflects the app's fitness/health-tracking purpose.
- [ ] **AC-11.2** All four manifest icon PNGs (`any`/`maskable` × 192/512) are regenerated from the new design at their existing sizes and `purpose` values.
- [ ] **AC-11.3** `apple-touch-icon.png` is regenerated from the same design.
- [ ] **AC-11.4** The installed/home-screen icon (mobile and desktop) shows the new design, verified visually after install.
- [ ] **AC-11.5** The icon is legible at small sizes (browser tab / task switcher scale), not just at 512px.
- [ ] **AC-11.6** F-04's PWA acceptance criteria (install, offline reload, manifest validity) still pass unchanged.

---

## 9. Open questions
- **OQ-11.1** Keep the current purple/blue gradient palette (already coordinated with `--primary`) for
  the new mark, or pick an entirely new palette as part of the refresh? Proposed default: **keep the
  existing palette** and change only the mark/shape, to minimize re-coordination work with the
  in-app theme tokens (F-00 §6.1) — revisit if the chosen concept doesn't suit those colors.
- **OQ-11.2** Is a hand-drawn/custom SVG mark required, or is an appropriately-licensed icon from an
  existing icon set (e.g. the same icon package chosen for the in-app icon refresh, if any) acceptable
  for the app icon too? Proposed default: **custom mark** — app icons are a stronger brand signal than
  in-app UI icons and warrant a purpose-built design rather than a generic library glyph.
