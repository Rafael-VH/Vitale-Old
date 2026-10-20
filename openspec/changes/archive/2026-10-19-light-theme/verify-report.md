# Verify Report — 2026-10-19-light-theme

**Change**: Light theme via `prefers-color-scheme` (no toggle, no JS, no persistence)
**Verdict**: PASS — with one documented limitation and one disclosed process caveat
**Verifier**: inline (self-authored) — see Disclosure

## Method

Two independent measurement paths, both against the real artifacts:

1. **Suite** — 8 test files executed with `node`; the new `tests/theme.test.js` is the falsifiable
   guard written before the CSS (RED at 1 ok / 3 fallos, GREEN now).
2. **Browser** — `playwright-cli` (Chrome, headless) against a local static server
   (`http://127.0.0.1:8765`), scheme forced with `page.emulateMedia({ colorScheme })` and with
   `--force-dark-mode`-free Chromium; pseudo-states forced with CDP `CSS.forcePseudoState`.
   Alpha washes were composited **over the real ancestor background stack**, not over a guess.

## Suite result

```
editable-output.test.js          8 ok  0 fallos
extractor-reachability.test.js   5 ok  0 fallos
generic-semantic.test.js         8 ok  0 fallos
mhtml-charset.test.js           11 ok  0 fallos
prototype-safety.test.js        15 ok  0 fallos
theme.test.js                    4 ok  0 fallos
url-scheme-safety.test.js       11 ok  0 fallos
utils-hardening.test.js         13 ok  0 fallos
TOTAL 75 ok / 0 fallos   (baseline was 71; +4 new guard assertions)
```

`node --check` remains the only static gate; all 8 files parse and run.

## Spec coverage (`theme-support`, 7 requirements / 14 scenarios)

| Requirement | Evidence | Status |
|---|---|---|
| The scheme follows the operating system | `matchMedia` reports `light` under the forced light scheme; `<html>` has no class/attr and there is no `localStorage` read anywhere | PASS |
| The light theme is complete | All 16 re-declared tokens resolve in light with the `design.md` §3.2 values; 0 tokens left at dark values | PASS |
| The dark theme is unchanged | Dark golden re-captured and diffed: only the 2 intentionally-deleted dead tokens differ (see below) | PASS |
| An accent hue serves text and fill as separate roles | 12 foreground sites use `--accent-ink` / `--success-ink`; the 5 fill sites keep the vivid tokens; fills measured vivid in both schemes | PASS |
| Text remains legible in both schemes | Measured table below, real computed values, all pairs above their threshold | PASS |
| The system honours the user's reduced-motion preference | Unchanged `@media (prefers-reduced-motion)` block still last in the file (now before the light-override block; no interaction) | PASS |
| No manual toggle controls the theme | No button, no `data-theme`, no listener; `grep` for `theme` in `js/**` returns only unrelated identifiers | PASS |

## Measured contrast (light scheme, browser-computed)

| Pair | Ratio | Min | Result |
|---|---|---|---|
| `--text` on `--bg` | 17.06 | 4.5 | PASS |
| `--text-dim` on `.pill` (composited) | 6.92 | 4.5 | PASS |
| `--text-mute` on `.upload-card` | 6.18 | 4.5 | PASS |
| `--accent-ink` on `.pill-accent` wash | 5.65 | 4.5 | PASS |
| `.alert-warn` ink on its tint | 6.80 | 4.5 | PASS |
| `.alert-err` ink on its tint | 5.99 | 4.5 | PASS |
| `.alert-ok` ink on its tint | 5.19 | 4.5 | PASS |
| `.alert-info` ink on its tint | 7.32 | 4.5 | PASS |
| `.pill-site` ink on its wash | 6.39 | 4.5 | PASS |
| `.brand-text h1` worst gradient stop on `--bg` | 5.26 | 3.0 | PASS |
| `--accent-ink` focus border on input surface | 6.92 | 3.0 | PASS |
| status dot `--success-ink` on `--bg` | 5.30 | 3.0 | PASS |
| `.btn:hover` text on hover bg | 15.31 | 4.5 | PASS |

`design.md` documented 5.48:1 for the status dot; the measured value is 5.30:1 — same conclusion,
the doc figure was computed against a slightly different base. Not a defect; noted for accuracy.

## Dark inertness (golden diff, A.2 → C.1)

Re-captured `dark-after.json` against `dark-golden.json` (30 selectors × 7 properties + 21 tokens).

**Differences found: 3 — all accounted for:**

1. `--accent-2-glow`: value → `""` — **intentional** (dead token deleted in B.1; 0 usages).
2. `--shadow`: value → `""` — **intentional** (dead token deleted in B.1; 0 usages).
3. `body.backgroundImage` — **golden artifact, not a change**: A.2's capture truncated the second
   radial-gradient stop. `git diff styles.css` shows the `body` rule is untouched; the live dark
   value matches A.2's first stop exactly.

No selector property changed. Dark is byte-equivalent apart from the two deliberate deletions.

## Deviations recorded

1. **B.3 placement** — the eight rule overrides live in a *second* `@media` block at the end of the
   file, not inside the first one. Reason: at the top they lost the cascade to base rules of equal
   specificity (measured: `#statusDot` stayed `rgb(52,211,153)` in light). Tokens (`:root`) work in
   either position because they resolve at use; selectors do not. Verified fixed after the move.
2. **`design.md` §6** — the `.brand-text h1` dark value was written as `#eef2f9,#8b98b4`; the real
   computed stops are `#fff,#cbd5e1`. Corrected during Phase B. The light value is unaffected.

## Non-conformance accepted (documented in `design.md` §5, §8)

The border hairlines (`.status-bar`, `.upload-arrow`, `.output-box`) do not meet 3:1 against their
surfaces in either scheme (dark 1.46/1.19, light 1.33/1.82). WCAG 1.4.11's 3:1 floor applies to
*meaningful* boundaries; these are decorative and the meaningful boundaries (focus ring, status
dots) were probed and pass. This is a deliberate, pre-existing property of the design, unchanged by
this work.

## Limitations

- **Visual inspection was performed post-archive, not before it.** This report was written while the
  authoring model could not read images, so every visual claim rested on computed style values. After
  archiving, the same code was rendered in headless Chromium with `prefers-color-scheme: light`
  emulated and the screenshots were inspected directly. Findings: no inverted text anywhere, no
  invisible control, no broken boundary; the visual hierarchy of the dark theme (h1 → tagline →
  subtitle → uppercase labels) is preserved, and the brand mint survives in the CTA, the selected
  segment, the `.MHTML` badge and the upload icon. Three polish observations, none a defect: the
  light-mode hover (`#e8eef7` on white) is perceptually subtler than its dark counterpart (`#22304a`);
  the disabled `Descargar .md` (`opacity:.38` on an already-light ghost) is nearly invisible; and the
  mint CTA sits on near-white with a low luminance-contrast silhouette, relying on saturation and
  shadow — a direct consequence of the documented decision to keep fills vivid. Screenshots were not
  committed.
- **No independent verifier.** The repo has no test-runner harness beyond `node`, and this runtime
  exposes no sub-agent tool. Verification was performed inline by the same agent that wrote the
  code. All claims above are backed by re-runnable commands and stored JSON evidence
  (`dark-golden.json`, `dark-after.json`, `light-probe.json`), but they were not adversarially
  reviewed by a second party.
- **`@media` behaviour depends on the OS.** The light scheme was verified by emulating it in the
  browser; a human eye-check on a light-mode OS was still not performed.

## Files

- `styles.css` — tokens `:25-56`, light tokens `:61-85`, light overrides `:610-625`
- `tests/theme.test.js` — new guard (4 assertions)
- `README.md`, `docs/arquitectura.md`, `docs/limitaciones.md` — 5 false statements corrected
- `openspec/changes/2026-10-19-light-theme/*.json` — measurement evidence
