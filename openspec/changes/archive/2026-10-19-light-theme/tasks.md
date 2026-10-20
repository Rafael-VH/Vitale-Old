# Tasks: light-theme

> Phases are cut so **no file is edited twice**, and ordered so the app is correct after every commit.
> Flow: `proposal → specs → design → tasks` (design was NOT skipped: the light palette is a product
> decision the human approved in `design.md` §10).
> Verification legend: **`suite`** = headless Node test (`tests/*.test.js`); **`browser`** = Puppeteer
> DOM / computed-style check over `file:///.../index.html`; **`probe`** = the WCAG harness from
> `design.md`, re-run against browser-computed values rather than this document's numbers.
> Baseline before Apply: **7 suites / 71 assertions / 0 failures**. It must hold at every commit.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120–170 (`styles.css` ~55–70, `tests/theme.test.js` ~60–80, 5 doc lines) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (not needed) |
| Delivery strategy | auto-forecast |
| Chain strategy | n/a |

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Low
Review budget (session): 1600 lines — single PR comfortably inside it.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| A | Static guard + dark golden, before any edit | PR 1 | Golden must be captured before `styles.css` is touched |
| B | `styles.css` only: tokens, swaps, overrides | PR 1 | One file; no HTML, no JS |
| C | Browser verification + docs sync | PR 1 | Closes the change |

---

## Phase A: Guard and golden (Strict TDD — RED first)

- [x] A.1 **RED: the stylesheet has no light scheme.** Create `tests/theme.test.js` in the existing suite
      style (plain `fs.readFileSync` + regex/string analysis of `styles.css`, hand-counted
      `ok`/`fallos`, `process.exit(1)` on failure — no framework, no CSS parser). Four assertions:
      (1) a `@media (prefers-color-scheme: light)` block exists — **fails today**; (2) every colour
      token declared in `:root` has a re-declaration inside that block, except `--accent`,
      `--accent-2` and `--success`, which `design.md` §3.1 pins as shared — **fails today** (block
      absent); (3) `--accent-2-glow` and `--shadow` appear nowhere — **fails today** (both exist);
      (4) every `var(--x)` used in the file is declared in `:root` — **passes today**, so it is
      labelled a permanent guard, NOT a RED. Do not invent extra cases.
      (spec: `theme-support` / The scheme follows the operating system; The light theme is complete;
      The token layer stays coherent)
      Test: `suite` — the new suite runs and reports exactly 3 fallos / 1 ok, exit=1, while the other
      7 suites stay at 71 ok / 0 fallos.
      Done: RED observed 2026-10-19 — `theme.test.js` 1 ok / 3 fallos / exit=1 (assertions 1–3 fail,
      assertion 4 guard passes); the other 7 suites unchanged at 71 ok / 0 fallos.

- [x] A.2 **Dark golden, captured before the first edit.** With the app loaded in the dark scheme,
      capture `getComputedStyle` for ~20 representative elements (body, `.card`, `.btn`,
      `.btn-primary`, `.btn-success`, `#mdOutput`, `.pill-accent`, `.pill-warn`, `.pill-site`,
      `.alert-warn`, `.alert-ok`, `.alert-err`, `.alert-info`, `.status-dot.ready`, `.upload-arrow`,
      `.brand-text h1`, `.step-num`, `.fmt.fmt-special`, `.file-name`, `.kbd`) into a fixture file.
      This is the ONLY honest proof that the dark scheme is unchanged; a code read is not.
      (spec: `theme-support` / The dark theme is unchanged)
      Test: `browser` — fixture written; the app renders in dark with the values recorded.
      Done: fixture `openspec/changes/2026-10-19-light-theme/dark-golden.json` (8 284 bytes,
      2026-10-19T05:36:16Z, `dark:true`); 30 selectors + 21 token values. Deviations from the
      sketch: `.card`/`.kbd` do not exist in this DOM (`.upload-card` captured instead);
      `.pill-warn`/`.alert-warn|err|ok` are runtime-only and recorded as `__absent__` (they cannot
      be captured without a conversion — out of scope for the golden).

---

## Phase B: `styles.css` only

- [x] B.1 **Token layer.** In `:root` delete `--accent-2-glow` and `--shadow` (0 usages each) and add
      `--accent-ink: #5eead4` and `--success-ink: #34d399`. Immediately after the existing
      `:root` block, add the `@media (prefers-color-scheme: light)` block re-declaring the 15 values
      from `design.md` §3.2 (`--bg`, `--bg-soft`, `--surface`, `--surface-2`, `--border`,
      `--border-soft`, `--text`, `--text-dim`, `--text-mute`, `--accent-glow`, `--accent-ink`,
      `--success-ink`, `--error`, `--warn`, `--shadow-sm`, `--shadow-lg`) and leaving `--accent`,
      `--accent-2`, `--success` alone. Do NOT set `color-scheme`.
      (spec: `theme-support` / The light theme is complete; The scheme follows the operating system)
      Test: `suite` — assertion 2 goes green; assertion 3 goes green; assertion 4 still green.
      Done: `:root` now :25-56; ink tokens added (dark == vivid by design); light token block :61-85
      (no `color-scheme`); dead tokens removed. `theme.test.js` 4 ok / 0 fallos.

- [x] B.2 **Role split: 12 foreground sites.** Replace the vivid token with its ink token at the 12
      measured foreground sites — `--accent` → `--accent-ink` at `styles.css:157, :210, :332, :340,
      :348, :359, :382, :464, :502, :518`; `--success` → `--success-ink` at `:394, :405`. Touch
      nothing else: the fill sites (`:98, :233, :369, :397, :449`) keep the vivid tokens.
      (spec: `theme-support` / An accent hue serves text and fill as separate roles)
      Test: `browser` — in dark, `getComputedStyle` returns EQUAL values for `--accent` and
      `--accent-ink` (and for `--success` / `--success-ink`); that equality is the inertness
      requirement, not a coincidence.
      Done: 12/12 swapped (10 accent-ink, 2 success-ink; fills untouched). Browser dark:
      accent == accent-ink (#5eead4), success == success-ink (#34d399); light: ink #115e59 / #047857.

- [x] B.3 **Eight rule overrides.** Inside the media block, re-declare the eight one-off rules from
      `design.md` §6: `.brand-text h1` (gradient `#0f172a` → `#5b6a80`), `.btn:hover:not(:disabled)`
      (`#e8eef7` / `#aebdd2`), `.alert-warn` `#92400e`, `.alert-err` `#b91c1c`, `.alert-ok` `#047857`,
      `.alert-info` `#115e59`, `.pill-site` `#6d28d9`, `.status-dot.ready` → `var(--success-ink)`.
      Add the `ponytail:` comment from `design.md` §8 over the washes that stay literal, naming the
      ceiling (promote to tokens only if they ever need re-tinting per scheme).
      (spec: `theme-support` / Text remains legible in both schemes)
      Test: `suite` — full suite green (7 suites / 71 + the new guard assertions / 0 fallos).
      Done: 8 overrides in a second media block at END of file (:610-625) — deviation from "inside
      the first media block": at the top they lost the cascade to base rules of equal specificity
      (measured `#statusDot` stayed rgb(52,211,153) in light). After the move: light dot
      rgb(4,120,87), h1 #0f172a→#5b6a80. `ponytail:` comment present. Suite 8/75 green.
      `design.md` §6 h1 dark value corrected to `#fff,#cbd5e1` (real computed stops).

---

## Phase C: Verification and docs

- [x] C.1 **Probe, not trust.** Force the light scheme and re-measure the tight pairs from
      `design.md` §3.2/§4 against browser-computed values (alpha washes composited over their real
      base, worst-case base). Then load dark and diff the golden from A.2 — it must be identical.
      If the light scheme cannot be forced with the available tooling, say so in the verify report;
      do not report a green check for an unmeasured scheme.
      (spec: `theme-support` / Text remains legible in both schemes; The dark theme is unchanged)
      Test: `probe` + `browser`.
      Done: light forced via `page.emulateMedia({colorScheme})`; 13 pairs measured with washes
      composited over the real ancestor stack — all PASS (min 4.5 text / 3.0 UI). Hover probed with
      CDP `CSS.forcePseudoState` on a visible ghost button: bg `#e8eef7`, text 15.31:1. Dark golden
      diff: 3 diffs, all expected (2 deliberate dead-token deletions + 1 golden-capture artifact in
      `body.backgroundImage`; the `body` rule is untouched per `git diff`). Evidence:
      `light-probe.json`, `dark-after.json`.

- [x] C.2 **Docs sync.** Correct the five false statements in the same commit: `README.md:30`,
      `README.md:78`, `docs/arquitectura.md:38`, `docs/arquitectura.md:169`, `docs/limitaciones.md:22`
      (rewrite the row, do not delete it). `docs/mhtml-y-charsets.md:87` stays untouched (D.5
      exception, unrelated to theming).
      (spec: `theme-support` / The scheme follows the operating system)
      Test: `suite` (unchanged) + manual read of the five lines.
      Done: all 5 rewritten (rows kept, not deleted). `arquitectura.md` §Sistema visual also lost the
      dead `--shadow` mention and gained the two ink tokens. `mhtml-y-charsets.md` untouched. UTF-8
      verified (0 U+FFFD in all three files).

- [x] C.3 **Close.** Full suite at baseline, `git status` clean except the intended files, and the
      verify report written before any archive step.
      Test: `suite` + `git status --short`.
      Done: 8 suites / 75 ok / 0 fallos (71 baseline + 4 new). `git status --short`: 4 modified
      (`styles.css`, `README.md`, `docs/arquitectura.md`, `docs/limitaciones.md`) + the change dir
      and `tests/theme.test.js` as new. `.playwright-cli/` is tool scratch and is not part of the
      change. `verify-report.md` written.
