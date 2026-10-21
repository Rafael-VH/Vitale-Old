# Proposal: theme-toggle

## Intent

Make the colour scheme selectable without discarding the light theme that was just shipped.

The published capability makes the operating system the only source of truth and forbids a control outright:
"no toggle, cycle or selector for the colour scheme MUST exist" and "the scheme MUST NOT depend on anything
the app stores". That contract is wrong for this product. A user on a light OS may still want the dark UI —
it is the identity the app was designed around — and a user who wants light should not have to change their
operating system to get it.

Three modes: `auto` (default, follows the OS — exactly today's behaviour), `light`, `dark`. One icon button
cycles them and the choice survives a reload.

## Scope

In scope:

- A `data-theme` override model layered on top of the existing `prefers-color-scheme` blocks.
- An icon-only toggle in `.status-bar`, keyboard reachable and labelled.
- Persistence in `localStorage` under `vitale.theme`.
- A pre-paint inline script so a pinned mode does not flash the OS default on reload.
- Tests, docs, and the capability spec rewrite.
- Reuse of the archived `dark-golden.json` as the inertness baseline — no re-capture needed.

Out of scope:

- Re-authoring any colour. The light palette, the ink tokens and the eight rule overrides keep their exact
  values.
- `color-scheme` and `light-dark()` (design §3 explains why, twice).
- A settings panel, per-site preferences, or a keyboard shortcut for the mode.
- Any change to the dark palette. It stays byte-identical, and that is a requirement.

## Capabilities

`theme-support` — MODIFIED. The requirement "The scheme follows the operating system" is replaced by "The
scheme is selectable among auto, light and dark". "The dark theme is unchanged" is retained and extended to
cover both paths into dark (auto on a dark OS, and explicit dark on a light OS). The remaining five
requirements keep their text; only their `GIVEN` clauses change from "the operating system prefers a light
scheme" to "the light scheme is active", because light is no longer reachable only through the OS.

## Approach

Keep both existing light blocks where they are, with their values untouched, and add a second way to reach
them:

- the `@media (prefers-color-scheme: light)` selectors gain a `:not([data-theme="dark"])` guard, so an
  explicit dark wins on a light OS;
- new `:root[data-theme="light"]` blocks mirror the same declarations, so an explicit light wins on a dark OS.

`auto` is the absence of the attribute, not a value of it — one less state to keep in sync. `js/theme.js` owns
read/apply/cycle/persist; a small inline script in `<head>` applies a stored choice before first paint.

The duplication is the price of keeping the pure-CSS auto path. A test asserts both light blocks are
declaration-identical, so they cannot drift.

## Affected Areas

- `styles.css` — two media selectors gain a guard; one light token block and one light rule block are
  duplicated under `:root[data-theme="light"]`; new `.theme-toggle` styles.
- `index.html` — pre-paint script in `<head>`, toggle button in `.status-bar`, `js/theme.js` before `js/main.js`.
- `js/theme.js` — new module under `window.Vitale`.
- `tests/theme.test.js` — extended with the attribute-block and drift guards.
- `openspec/specs/theme-support/spec.md` — replaced on archive.
- `README.md`, `docs/arquitectura.md`, `docs/limitaciones.md` — the "follows the OS, no toggle" statements.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The duplicated light block drifts from the media block | Medium | Light mode differs depending on how it was reached | Test asserts both blocks are declaration-identical |
| A pinned mode flashes the OS default before paint | Medium | Visible glitch on every reload | Inline pre-paint script placed before the stylesheet link |
| Explicit dark leaks light overrides on a light OS | Medium | Broken contrast in one of six combinations | Media guard; the browser probe covers all six |
| `localStorage` unavailable (private mode, `file://`) | Low | Preference not remembered | `try/catch` on read and write; session still works, falls back to auto |
| The toggle silently regresses the dark palette | Low | Visual regression nobody notices | Golden diff under explicit dark and auto+dark OS |

## Rollback Plan

Revert the change commit. No colour value moves, so the revert removes the control and the attribute model
without touching the palette. If only the control misbehaves, removing the button from `index.html` restores
OS-following immediately, because `auto` is the absence of the attribute and every explicit state is
reachable only through the button.

## Dependencies

None. No new files beyond `js/theme.js`, no build step, no dependency. `localStorage` and `matchMedia` are
platform APIs the app already depends on for nothing else.

## Success Criteria

- All three modes produce their documented computed values.
- A stored choice survives a reload with no flash of the other scheme.
- `auto` is indistinguishable from today's behaviour, on both a light and a dark OS.
- The dark palette is unchanged under explicit dark and under auto+dark OS.
- The full suite is green, and the published spec no longer contradicts the UI.
