# Verify report: theme-toggle

**Change**: `2026-10-20-theme-toggle` — three modes (auto / light / dark) with persistence.
**Date**: 2026-10-20
**Verdict**: **PASS**

## Suite

8 suites / **80 assertions / 0 failures** (baseline before apply: 75; +5 new guards from A.1).

| Suite | Result |
|---|---|
| editable-output | 8 ok |
| extractor-reachability | 5 ok |
| generic-semantic | 8 ok |
| mhtml-charset | 11 ok |
| prototype-safety | 15 ok |
| **theme** | **9 ok** (4 pre-existing light-theme guards + 5 new toggle guards) |
| url-scheme-safety | 11 ok |
| utils-hardening | 13 ok |

## E.1 Six combinations (real browser, Playwright + system Chrome)

Each combination asserts the `data-theme` attribute on `<html>` plus body background/text and all
colour tokens against the expected palette (dark from `:root`, light from `:root[data-theme="light"]`).

| Mode | OS | Attribute | body background | Result |
|---|---|---|---|---|
| auto | light | absent | `rgb(248, 250, 252)` (light) | ok |
| auto | dark | absent | `rgb(10, 14, 26)` (dark) | ok |
| light | light | `light` | `rgb(248, 250, 252)` (light) | ok |
| light | **dark** | `light` | `rgb(248, 250, 252)` (light — pins over OS) | ok |
| dark | **light** | `dark` | `rgb(10, 14, 26)` (dark — pins over OS) | ok |
| dark | dark | `dark` | `rgb(10, 14, 26)` (dark) | ok |

All 14 probed tokens (`--bg`, `--surface`, `--text`, `--text-dim`, `--accent-ink`, `--success-ink`,
`--border`, `--accent`, `--accent-2`, `--success`, `--error`, `--warn`, …) matched the expected
palette in every combination — zero token diffs.

## E.2 Golden diff (dark-theme inertness)

Against the archived `openspec/changes/archive/2026-10-19-light-theme/dark-golden.json`:

| Capture | Result |
|---|---|
| Explicit dark (`data-theme="dark"`) | **clean diff** |
| auto + OS dark | **clean diff** |

The dark path is byte-identical in behaviour; the two documented dead-token removals
(`--accent-2-glow`, `--shadow`) remain absent as established by the archived change.

## E.3 Persistence and fallback

| Check | Result |
|---|---|
| Click auto→light, reload → first sampled frame is already `light` | ok |
| Click light→dark, reload → first sampled frame is `dark` | ok |
| Seed `localStorage.vitale.theme = 'banana'`, reload → attribute absent (auto) + app rendered | ok |
| Glyph = **stored** mode (auto = half-circle, light = sun, dark = moon) at each state | ok |
| `aria-label` follows the mode: `Tema: Oscuro. Cambiar a Automático.` | ok |

The pre-paint inline script in `<head>` (before the stylesheet link) restores the attribute before
the first paint — the reload checks sample the very first computed style and never observe the
wrong scheme.

## Spec coverage

- `theme-support` / The light theme is complete — both paths agree: suite drift test + E.1.
- Explicit dark over light OS: E.1 (`dark + OS light`).
- Explicit light over dark OS: E.1 (`light + OS dark`).
- Selectable among auto, light, dark: E.1 + E.3 glyphs/aria.
- Mode survives a reload: E.3.
- Unusable stored value falls back to auto: E.3.
- Dark theme unchanged: E.2 golden.
- Control reachable and labelled: native `<button>` + `aria-label` (E.3), focus ring in `.theme-toggle:focus-visible`.

## Limitations (honest)

1. **Hairline border contrast**: `--border-soft` on `--bg` in the light scheme remains **below 3:1**
   in some pairs — a deliberate, documented non-conformance inherited from `light-theme` (decorative
   hairlines on cards, not text). Unchanged by this toggle.
2. **No animation**: the scheme switch is instant by design (`design.md` §7); the stylesheet's global
   `prefers-reduced-motion` support is untouched.
3. **The probe script** (`theme-probe.js`) lives in the session temp dir, not the repo — it is a
   one-shot verification harness, not a maintained test. The maintained guards are in
   `tests/theme.test.js`.
4. `playwright-cli` could not launch in this environment (the known `ChildProcess.kill` shell bug);
   the probe used Playwright's Node API with system Chrome instead. Same engine, different entry.
