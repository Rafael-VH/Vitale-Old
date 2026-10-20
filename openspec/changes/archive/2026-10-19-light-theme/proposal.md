# Proposal: light-theme

> Source: exploration for `openspec/changes/2026-10-19-light-theme` (`exploration.md`).
> Persistence: hybrid (OpenSpec file + Engram `sdd/light-theme/explore`). Planning only — no source is edited by this document.

## Intent

The app is dark-only by accident, not by choice: every surface, text, border and shadow colour in `styles.css`
is a single fixed palette tuned against a near-black page, and there is no `prefers-color-scheme`,
`color-scheme`, `data-theme` or persistence hook anywhere in the tree. A user whose OS is in light mode gets
the dark UI anyway — and the dark UI is not merely "uncomfortably dark" on a light page: the brand title at
`styles.css:106` (`linear-gradient(#fff,#cbd5e1)`) and the four alert foregrounds at `:418-421` become
**invisible**, because they were tuned as light-on-dark and are never re-evaluated.

This change makes the app follow the operating system's colour scheme. The mechanism is CSS only — one
`@media (prefers-color-scheme: light)` block — with no toggle, no JavaScript, no stored preference. The dark
theme keeps its exact current appearance.

## Scope

### In Scope

Phases are cut so **no file is edited twice** and the app is correct after every commit.

**Phase A — Guard (test-first, honest RED)**
- `tests/theme.test.js`: new static suite over `styles.css`. RED today, because 0 occurrences of
  `prefers-color-scheme` exist. Invariants asserted:
  1. exactly one `@media (prefers-color-scheme: light)` block exists;
  2. it appears **after** `:root`, so it wins by cascade order at equal specificity `(0,1,0)`;
  3. every custom property declared in `:root` with a colour value is re-declared inside that block
     (the light theme is complete by construction — no half-theming);
  4. every `var(--x)` used anywhere in the file is declared in `:root` (no undefined token).
  - Assertions 1-3 are the RED; assertion 4 passes today and is kept as a permanent integrity guard, not
    claimed as RED evidence.

**Phase B — Theme (`styles.css` only)**
- `:root`: add `--accent-ink` and `--success-ink` (dark values equal today's `--accent`/`--success`, so the
  dark output is byte-for-byte inert); delete the two dead tokens `--accent-2-glow` (`:41`) and `--shadow`
  (`:51`), both verified unused.
- **Role split** — 12 property swaps, each a one-word change whose computed dark value does not move:
  `var(--accent)` → `var(--accent-ink)` at `:157, :210, :332, :340, :348, :359, :382, :464, :502, :518`;
  `var(--success)` → `var(--success-ink)` at `:394, :405`. `--accent`/`--success` stay as-is at `:98, :233,
  :369, :449` and `:137, :245, :397` (fills, gradients, dots).
- Append **one** `@media (prefers-color-scheme: light){:root{…}}` block at the end of the file: the light
  values for all 18 existing colour tokens plus the two new ink tokens, then seven short rule overrides for
  the values that are not tokens (see Approach).
- Suite green; dark appearance unchanged (proved in Phase C, not assumed).

**Phase C — Docs sync and verification**
- Five doc statements that currently assert "solo oscuro / tema oscuro completo" become false the moment the
  media block lands and must be rewritten **in the same commit**: `README.md:30`, `README.md:78`,
  `docs/arquitectura.md:38`, `docs/arquitectura.md:169`, `docs/limitaciones.md:22` (rewrite the limitation
  row, do not delete it: light is available via the OS only, with no manual switch).
- Browser verification (Puppeteer MCP): computed-style golden captured **before** Phase B and re-checked
  after; the light palette probed by relaunching with `--force-dark-mode`; contrast measured, not eyeballed;
  screenshots taken as human evidence. Report in `verify-report.md`.

### Out of Scope

- **A manual light/dark toggle, a three-way auto/light/dark cycle, and any persistence.** Rejected: the OS is
  the single source of truth; a toggle adds UI and a state to keep in sync for no user benefit.
- **`color-scheme: light dark` / `:only` declarations.** They would flip the native scrollbar and form-control
  rendering inside the *dark* theme — a visible change nobody asked for. Left as a follow-up.
- **Redesigning the dark theme.** The dark palette, glow and shadow values stay exactly as they are.
- **The three "breakages" that are cosmetic, not legibility failures**, all verified as harmless in the
  exploration: the `rgba(255,255,255,.06)` inset at `:101` (invisible on light = no-op), the `rgba(0,0,0,.78)`
  modal scrim at `:469` (a dark scrim over a light page still isolates the modal correctly), and the `body`
  corner glows at `:70-71` (a `rgba(...,.08)` accent wash over near-white is a normal light-theme look).
- **Any JavaScript.** Zero colour literals exist in `js/**` and `index.html`, so no JS file needs to change.
- Any change to `old/v1/`, `old/v2/` (frozen), or to `docs/mhtml-y-charsets.md:87` (its exception, D.5, is
  recorded in the exploration and still holds).
- The **design** phase is **not** skipped here: the light palette — every token value with its contrast
  ratio against the surface it is read on — is a real design decision the user should approve before
  apply. That content goes in `design.md`; this proposal only fixes the approach.

## Capabilities

### New Capabilities
- `theme-support`: the app renders in the colour scheme the operating system requests, with the dark theme
  unchanged when the OS prefers dark.

### Modified Capabilities
- None. `editable-markdown-output`, `modal-accessibility`, `conversion-engine-loading`, `html-extraction`,
  `assist-guide` and `core-utilities` are unaffected: this change does not touch a single line of HTML or JS,
  and the CSS properties it touches are colour-only (`color`, `background`, `border-color`, `box-shadow`,
  `background-image`), never geometry, order or focus semantics.

## Approach

**The finding that shapes everything:** `styles.css` is the only place colour exists (62 lines / 84 literals
in the whole app, 43 of those lines outside `:root`), and almost every one of those 43 lines is an alpha
variant of a hue that already has a `:root` token — `rgba(94,234,212,.35)` is `--accent` at 35%, `#c4b5fd`
is the light end of `--accent-2`. So the light theme does not need a second stylesheet, a selector rewrite or
a class on `<html>`: it needs a palette.

Two constraints turn that into the design:

1. **`--accent` and `--success` each serve two roles.** They are gradient *fills* (`.brand-mark`, `.btn-primary`,
   `.step-num`, `.upload-title .hl`, `.btn-success`) that need a **vivid** value with dark ink on top, and they
   are *text/border* colour (links in `code`, `.pill-accent`, `.file-name`, focus rings, `.modal-preview b`)
   that need a **dark** value on a light surface. One token cannot serve both. So the roles are split with
   `--accent-ink` / `--success-ink`, the 12 text-side properties read the ink token, and the 5 fill-side
   properties keep the vivid one. In dark, ink === vivid, so nothing moves; in light, only the ink tokens
   darken and the gradients survive untouched. This is the whole reason the change stays small.
2. **A handful of display colours have no token and should not get one.** The four alert foregrounds
   (`#fde68a`, `#fecaca`, `#a7f3d0`, `#a5f3ec`), `.pill-site`'s `#c4b5fd`, and the brand title's
   `linear-gradient(#fff,#cbd5e1)` are one-off presentation values. Tokenising them would add vocabulary for
   a single reader each. They are re-declared inside the media block instead — seven short rules, each
   changing exactly the one property that must change.

This is the exploration's Approach 2, **narrowed**: tokenise the roles that already exist (`--accent`,
`--success`, plus the already-tokenised `--shadow-sm`/`--shadow-lg` and `--accent-glow`, whose values are
re-declared in the light block), and re-declare the seven one-off rules rather than tokenise them. The
exploration estimated 120-150 authored lines on the assumption that all 43 lines would be tokenised; the
narrowed design is roughly **95 authored source lines**. Approach 1 (duplicate 43 selectors) and Approach 3
(override `:root` only and leave the 43 literals) stay rejected for the reasons in the exploration; Approach
3 remains the fallback if the user prefers zero structural change over a complete-by-construction theme.

Nothing in the dark theme's computed values changes: every edit is either a value-preserving token swap, a
deletion of an unused declaration, or a rule inside a media block that does not match under `prefers-color-scheme: dark`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `styles.css` | Modified | 2 tokens added, 2 dead tokens deleted, 12 one-word role swaps, one appended `@media` block |
| `tests/theme.test.js` | New | Static invariant suite; RED on the absent media block |
| `README.md` `:30`, `:78` | Modified | "tema oscuro" → follows the OS preference |
| `docs/arquitectura.md` `:38`, `:169` | Modified | Same correction in the file-tree comment and in `## Sistema visual` |
| `docs/limitaciones.md` `:22` | Modified | The "tema único" limitation is rewritten, not deleted |
| `openspec/specs/theme-support/spec.md` | New | The new capability's spec |
| `js/**`, `index.html` | Untouched | No colour literal exists outside `styles.css` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| The token swap silently changes the **dark** theme | Low | Every swapped token's dark value equals the value it replaces; a computed-style golden is captured before Phase B and compared after — this is the safety net the CSS previously lacked |
| The light block is incomplete — a token is forgotten and a dark value leaks into the light theme | Med | Test assertion 3 refuses a light theme that is not a total re-declaration of `:root` |
| A new colour literal is added later and nobody notices it is theme-dependent | Med | The 43 lines that stay literal are exactly the theme-neutral ones (fills, glows, washes); the litmus rule goes in `design.md` and in the spec ("a literal is allowed only when it is composited against a brand fill, never against a surface") |
| Contrast targets are wrong because they were reasoned about, not measured | Med | Every token carries a stated ratio in `design.md`; Phase C measures `getComputedStyle` on the real rendered page, not on the source |
| The OS scheme cannot be forced from the MCP surface, so the light branch is unprovable | Med | Plan: relaunch Chromium with `--force-dark-mode` and read `matchMedia('(prefers-color-scheme: light)').matches`; if the runtime cannot, the verify report says so explicitly instead of implying proof |
| `styles.css` has no automated coverage, so the only guard is this new suite | High (known) | The suite plus the golden; this change is the point at which that gap starts to close |
| `--text-mute` is the tightest token (it is read on both `--surface` and `--surface-2`) | Med | Its light value is picked against the *worse* of the two surfaces, not against white |

## Rollback Plan

Each phase is its own commit on the feature branch. Reverting Phase B removes the media block and the role
swaps, restoring the current dark-only file with the suite red again; reverting Phase A removes only the
guard. No HTML, JS, data, schema or storage change; no public API, export or `Vitale.*` surface changes; no
dependency or build change. `docs/mhtml-y-charsets.md` and `old/**` are never touched.

## Dependencies

- None external. No new runtime dependency, no build step, no JS file, no new local file beyond the test
  suite and this change's artifacts. Node is available for the suite (already in use). The browser check
  reuses the existing MCP session and the documented `file://` URL.

## Success Criteria

- [ ] The app renders a light UI when the OS prefers light, with no manual action.
- [ ] The app renders the **current** dark UI, byte-identical in computed values, when the OS prefers dark.
- [ ] The brand title, the four alerts, `.pill-accent`, `.pill-warn`, `.pill-site`, `.file-name`, `code`,
      the focus rings and `.modal-preview b` are all legible on their light surfaces (measured, not eyeballed).
- [ ] Every token declared in `:root` is re-declared in the light block (test-enforced).
- [ ] No `var(--x)` in `styles.css` is undeclared (test-enforced).
- [ ] `--accent-2-glow` and `--shadow` no longer exist.
- [ ] Full suite green (baseline 7 suites / 71 assertions) plus the new suite; no assertion removed.
- [ ] The five outdated doc statements are corrected in the same commit as the behaviour.
- [ ] `js/**`, `index.html`, `old/v1`, `old/v2`, `docs/mhtml-y-charsets.md` and the six existing specs are untouched.
- [ ] Delivery: single PR (forecast is well under the 1600-line budget; no chaining).
