# Exploration: light-theme

> SDD explore artifact. Source: read-only reading of the visual system in the live code
> (`styles.css`, `index.html`, `docs/*`, `README.md`).
> `old/v1` and `old/v2` are frozen samples and were excluded.
> Persistence: hybrid (this file + Engram `sdd/light-theme/explore`).
>
> **Planning only.** No source file was modified in this phase.

## Current State

The request: the UI should **follow the operating system's colour scheme** — render light when the OS
asks for light.

The mechanism is already decided (user decision, this session): **CSS only**, via
`@media (prefers-color-scheme: light)`. No toggle, no JavaScript, no persistence. The switch belongs to
the OS, so the app never has to store a preference — which also sidesteps the fact that `localStorage` is
unreliable under `file://`.

Today the app is **dark-only by construction**. "Dark" is not a theme that something selects; it is a
single hardcoded palette. There is no media query, no `color-scheme` declaration, and no theme scaffold
anywhere in the project.

## Verified Facts

Every claim below was confirmed by reading the file and, where it could be ambiguous, by grep.

### 1. All colour lives in exactly one file

- `index.html:3-8` — the `<head>` holds charset, viewport, title and `styles.css`. There is no
  `theme-color` meta and no web-app manifest, so nothing outside `styles.css` advertises a colour.
- **Zero colour literals in `js/**` and in `index.html`.** Every colour decision is in `styles.css`.
- `styles.css` is **577 lines**. Measured with `#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)`:
  **43 lines / 65 literals outside `:root`** (17 of those lines carry a 6-digit hex).

This is the single most important fact for the change: **one file to edit, one place to get right.**

### 2. There is no theming scaffold to extend

A repo-wide grep returns **0 occurrences** of `prefers-color-scheme`, `color-scheme`, `data-theme`,
`theme-color` and `localStorage`. Nothing in the project knows the concept of a theme. The light theme
introduces it from scratch — and cannot collide with an existing mechanism.

### 3. What the palette actually is

`:root` (`styles.css:25-53`) declares 21 values:

| Group | Tokens |
|-------|--------|
| Surfaces | `--bg:#0a0e1a`, `--bg-soft:#0f1524`, `--surface:#131a2c`, `--surface-2:#1a2337` |
| Borders | `--border:#243049`, `--border-soft:#1c263c` |
| Text | `--text:#eef2f9`, `--text-dim:#8b98b4`, `--text-mute:#5c6884` |
| Accents | `--accent:#5eead4`, `--accent-2:#818cf8`, `--accent-glow:rgba(94,234,212,.18)`, `--accent-2-glow:rgba(129,140,248,.18)` |
| Status | `--success:#34d399`, `--error:#f87171`, `--warn:#fbbf24` |
| Geometry (**theme-independent**) | `--radius:14px`, `--radius-sm:9px` |
| Shadows | `--shadow-sm:0 1px 2px rgba(0,0,0,.3)`, `--shadow:0 8px 24px rgba(0,0,0,.35)`, `--shadow-lg:0 20px 60px rgba(0,0,0,.5)` |

Only **18 of the 21 are colour**; `--radius`/`--radius-sm` are geometry and must not be touched.

### 4. The 65 literals are alpha/gradient variants of the same five hues

| Family | Channel | Occurrences outside `:root` |
|--------|---------|------------------------------|
| accent (teal) | `94,234,212` = `--accent` | ~20 |
| accent-2 (indigo) | `129,140,248` = `--accent-2` | 4 |
| success (green) | `52,211,153` = `--success` | ~11 |
| warn (amber) | `251,191,36` = `--warn` | 5 |
| error (red) | `248,113,113` = `--error` | 2 |
| Light neutral | `#fff`, `#cbd5e1`, `rgba(255,255,255,.06)` | 4 |
| Dark neutral | `#0a0e1a`, `#062018`, `#052e20`, `#22304a`, `#2f3f5c`, `rgba(0,0,0,.35)`, `rgba(5,8,16,.78)`, `rgba(6,32,24,.25)` | 8 |
| One-off brand / hover shades | `#3fd6bf` `#4ee0c7` `#2fcdb2` `#10b981` `#2fc48a` `#0ea371` `#a78bfa` `#c4b5fd` `#fde68a` `#fecaca` `#a7f3d0` `#a5f3ec` | 12 |

The dominant pattern is `rgba(<an existing token's channels>, <alpha>)` — e.g. `rgba(94,234,212,.35)`
(`:101`) is literally `--accent` at 35 % opacity. This is what makes a small token set able to govern
most of the 65 literals.

### 5. What actually breaks on a light background

Read from the rules themselves, ordered by how visible the breakage is:

| Rule | Literal | Why it breaks on light |
|------|---------|------------------------|
| `.brand-text h1` `:106` | `linear-gradient(135deg,#fff,#cbd5e1)` | The "Vitale" wordmark is **white→grey**. On a light surface it disappears. **Highest-visibility break.** |
| `.alert-*` `:418-421` | `#fde68a` `#fecaca` `#a7f3d0` `#a5f3ec` | Alert foregrounds are pastels chosen for a dark surface. |
| `.brand-mark` `:101` | `rgba(255,255,255,.06) inset` | White inset highlight — invisible on light. |
| `--shadow*` `:50-52` | `rgba(0,0,0,.3/.35/.5)` | Dark-mode black weight reads as grime on light. |
| `body` `:70-71` | `rgba(94,234,212,.08)`, `rgba(129,140,248,.09)` | Radial glows tinted for a navy canvas; on white they go muddy. |
| `.pill-warn` `.pill-site` `.fmt-special` `:157,163,382` | tint + border pairs | Tuned against a dark surface. |
| `.upload-card` washes `:308,335,346` | translucent gradients | Same. |
| `.btn:hover` `:228` | `#22304a` / `#2f3f5c` | A lighter *navy*; on light it is a dark blob. |

### 6. What does NOT need to change

These literals are drawn **on a brand fill**, not composited against the page surface, so they stay legible
in both themes. They must stay literal — tokenizing a value that never changes is pure vocabulary cost:

- `.brand-mark` `:96-101` — teal→indigo gradient with `#0a0e1a` lettering.
- `.btn-primary` `:232-242` — teal gradient with `#062018` text.
- `.btn-success` `:244-251` — green gradient with `#052e20` text.
- `.step-num` `:447-452` — teal→indigo gradient with `#0a0e1a` numbering.
- `.spinner` `:427-432` — `#062018` on the primary fill; only its `rgba(6,32,24,.25)` ring is fill-relative.

### 7. Two dead tokens (deletion wins)

Verified by grep across the whole repo:

- **`--accent-2-glow` (`:41`)** — declared, never referenced. (`--accent-glow` is; this one is not.)
- **`--shadow` (`:51`)** — declared, never referenced. The only shadow tokens in use are
  `--shadow-sm` (`:130`) and `--shadow-lg` (`:487`).

Both are dead today and would otherwise have to be defined twice (once per theme) for nothing.

### 8. Nothing tests the CSS

The 7 suites (71 assertions) exercise JavaScript only; no test reads `styles.css`. A colour regression is
caught by **nothing** — the risk already recorded as `Risk: item 6` in the previous change, and confirmed
here: the geometry from that change (`height:240px`, `:not(:placeholder-shown)`) has no guard either.

Consequence for this change: **the check must be shipped by this change**, or the light theme will be the
next unguarded layer.

### 9. Five places in the docs assert "dark only"

The repo ties a behaviour change to its docs in the same commit, so these are in scope now:

| Location | Text |
|----------|------|
| `README.md:30` | "…variables CSS, grid, flexbox y media queries; **tema oscuro**." |
| `README.md:78` | "`styles.css  # Tema oscuro completo …`" |
| `docs/arquitectura.md:38` | "`styles.css  # Tema oscuro completo …`" |
| `docs/arquitectura.md:169` | "Es un tema **oscuro** único; no hay conmutador claro/oscuro." |
| `docs/limitaciones.md:22` | "\| **Tema único** \| Solo existe el tema oscuro; no hay conmutador claro/oscuro \|" |

The `limitaciones.md` row becomes **false** the moment the light theme lands: it must be rewritten, not
deleted — the honest replacement is "light theme driven by the OS preference only; there is still no manual
switcher".

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `styles.css` | Modified | Tokenize the surface-composited literals; add a `@media (prefers-color-scheme: light)` block that redefines those tokens; remove 2 dead tokens |
| `tests/theme.test.js` | New | Static guard: the light block exists, sits after `:root`, and redefines every colour token of `:root` |
| `openspec/specs/theme-support/spec.md` | New | New capability (complete spec, not a delta) |
| `README.md`, `docs/arquitectura.md`, `docs/limitaciones.md` | Modified | 5 assertions that the app is dark-only |
| `index.html`, `js/**` | **Untouched** | No colour lives there; the OS switch needs no code |

## Approaches

1. **A light block that re-declares each of the ~43 affected rules with light values.** Self-contained, but
   it creates a **second source of truth** for the same surface: every future rule must be written twice or
   the theme silently breaks, and specificity fights are inevitable. Rejected.
2. **Tokenize the literals, then override only tokens.** Move each surface-composited literal onto a named
   token (RGB-channel tokens let one token govern all its alpha variants), keep the dark values in `:root`,
   and let the light block redefine the tokens. Dark's rendered output stays **provably identical**, and the
   light theme becomes one block with one entry per colour. **RECOMMENDED.**
3. **Override the 18 tokens and hand-patch only the ~8 visible breakages.** Smallest diff, but it leaves
   ~35 literals tuned for dark that will break the light theme the next time a rule is added — the small
   change in the wrong place. Rejected as the primary approach; kept as the fallback if the refactor turns
   out to endanger the verified dark look.

### Indicative token shape (names fixed by the design phase)

```css
:root{
  --accent-rgb:94,234,212;        /* the channels behind --accent */
  --success-rgb:52,211,153;
  /* … one channel token per hue that has alpha variants … */
  --on-accent:#0a0e1a;            /* text drawn on a brand fill */
}
.pill-accent{ border-color:rgba(var(--accent-rgb),.3) }
```

`rgba(var(--x),.35)` with a comma-separated channel token is plain textual substitution — it needs no
modern colour syntax and works wherever custom properties do.

## Recommendation

**Adopt Approach 2, scoped by Approach 6's distinction.** Tokenize only what is reused or must differ per
theme; leave the brand-fill literals (§6) exactly as they are.

Shape of the change:

- Keep `:root` as the dark palette and add channel tokens for the hues that have alpha variants.
- Replace the surface-composited literals (`§5`) with token references — a mechanical rewrite whose dark
  output must be **byte-identical** when rendered.
- Append **one** block at the end of `styles.css`:
  `@media (prefers-color-scheme: light){ :root{ … } }`. It must come **after** `:root` so that equal
  specificity `(0,1,0)` resolves by document order.
- Delete `--accent-2-glow` and `--shadow`.
- Sync the five doc assertions.

Light-palette design constraints (to be pinned as spec requirements):

- Text tokens must reach **WCAG AA (4.5:1)** against the surface they sit on — notably `#5eead4` on white is
  ~1.6:1 and **cannot** stay the accent for text; the light accent needs a darker teal.
- `--text-dim` (~3.1:1 on white) and `--text-mute` must be darkened for light.
- The brand wordmark (`:106`) must go from white→grey to a dark gradient.
- Alert foregrounds must become dark-on-tint equivalents.

Deliberate non-goals (stated, so they are decisions rather than omissions):

- **No manual switcher, no auto/light/dark cycle, no persistence.** OS-driven only (user decision).
- **No `color-scheme: light dark` declaration.** It is the native primitive for UA-rendered widgets
  (scrollbars, autofill, form-control defaults), but adopting it would *also* change the current dark
  theme's scrollbars — an unrequested visual change. Noted as a follow-up, not done here.
- **No dark-theme redesign.** Every dark value stays as it is; the refactor must be visually inert.

## Minimal Change Set / Blast Radius

- **`styles.css`:** ~25-30 rewritten declarations (literals → tokens), ~8 new channel tokens, one light
  block of ~20 tokens, 2 dead tokens removed. **~90-110 authored lines**, incl. comments.
- **`tests/theme.test.js`:** new, static, one suite.
- **Docs:** 5 assertions across 3 files.
- **`index.html` / `js/**`:** zero.

Total estimated authored change: **~120-150 lines** — far inside the 1600-line budget.
**Review Workload Forecast: single PR. Chained PRs recommended: No. Decision needed before apply: No.**

## Verification

- Runner: Node (no `package.json`). Suite command:
  `Get-ChildItem tests\*.test.js | ForEach-Object { node $_.FullName }`.
- Current baseline: **7 suites, 71 assertions, 0 failing**.
- **Test-first is possible and the RED is honest.** A static test reading `styles.css` asserts that a
  `@media (prefers-color-scheme: light)` block exists and redefines every colour token declared in `:root`.
  That test **fails today** (0 occurrences of the query) and passes after the block lands.
- **The refactor's safety net (dark must not move):** capture the computed styles of a fixed element list in
  the browser **before** the refactor and compare after. Identical values prove the tokenization was inert —
  this is a real regression check for a change that no unit test can see.
- **Light state:** read `matchMedia('(prefers-color-scheme: light)').matches` to learn which scheme the
  headless browser is in, and flip it by relaunching with different launch arguments
  (`--force-dark-mode`) since the MCP surface exposes launch options rather than page-level media
  emulation. *To be confirmed in the apply phase; if it cannot be flipped, the limitation is reported
  instead of papered over.*
- **Contrast is computed, not eyeballed:** relative-luminance contrast for `--text`, `--text-dim`,
  `--text-mute`, the accents and the four alert foregrounds, against their real background, ≥ 4.5:1.
- **Screenshots in both states are produced for the human eye.** The model cannot read images, so this is
  evidence for the user, not for me — and it is labelled as such.
- Full suite green; no assertion removed.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| The tokenization refactor shifts the verified dark look | Low-Med | Computed-style golden vs the pre-change baseline; dark values unchanged by construction |
| A token is forgotten in the light block, leaving a dark value on a light page | Med | The static test asserts token parity between `:root` and the light block; plus a browser sweep of the element list |
| The light palette fails WCAG AA | Med | Explicit contrast computation in the probe; accent/text tokens chosen by ratio, not by eye |
| `prefers-color-scheme` cannot be forced from the MCP tool surface | Med | Probe `matchMedia`; try launch arguments; if impossible, report the limitation and lean on the static test + user-facing screenshots |
| The light block loses the cascade to a later rule | Low | Append after `:root`; the static test asserts the order |
| Docs keep asserting "dark only" | High if forgotten | Same-commit sync of the 5 locations (repo rule) |
| Re-touching `styles.css` collides with the just-verified CSS state | Med | Minimal, additive diff; dark computed-style golden |

## Open Decision Carried Into the Proposal

The capability boundary is: **the UI follows the OS colour scheme**. Everything a manual switcher would
need (state, persistence, a control, an ARIA story) is explicitly out of scope, and the palette's
accessibility bar (AA, computed) is the one acceptance criterion worth pinning as a hard requirement.

## Ready for Proposal

**Yes.** The single source of colour, the 65 literals and their families, the 8 visible breakages, the
2 dead tokens, the 5 stale doc assertions and the absence of any CSS coverage are all pinned with
file:line evidence.

**Design is recommended for this change** (unlike the previous one): the token map and the light palette
are concrete design content — a table of values and their contrast ratios — that the spec cannot hold and
that must be settled before `apply`.
