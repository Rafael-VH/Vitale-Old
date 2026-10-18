# Exploration: harden-conversion-flow

> SDD explore artifact. Source: a full-tree code review of the live code (~2,000 LOC; `old/v1` and
> `old/v2` are frozen samples and were excluded).
> Persistence: hybrid (this file + Engram `sdd/harden-conversion-flow/explore`).
>
> **Correction to prior SDD state:** the `sdd-init` recorded on 2026-10-14 (Engram `sdd-init/vitale-old`,
> obs 877; `sdd/vitale-old/testing-capabilities`, obs 875) states "no test runner, no test files,
> `strict_tdd: false`". That is **stale**. The repo now ships 5 Node test suites under `tests/` and a
> runnable suite command. See "Verification" below.
>
> **Superseded below — read `proposal.md` for the authoritative scope.** The phase cut in
> "Recommendation" and the "open question" in "Ready for Proposal" were both revised after this snapshot:
> phases are now cut by **testability** (0 tooling → A pure logic → B modal behaviour + accessibility →
> C performance → D cleanup), the `design` phase is **skipped**, and the `alert()` → inline-message swap
> is **in scope for phase B** (not deferred): a native blocking dialog cannot be styled, blocks the thread,
> and renders on top of the already-open modal that ships an inline message surface. The three
> `tests/url-scheme-safety.test.js` assertions are updated to assert the inline surface — a deliberate
> behaviour change, not an incidental one. This file is left as-is because it is a snapshot of what was
> known during exploration, not a plan.

## Current State

`Vitale` is a 100% client-side converter: `index.html` + `styles.css` + a set of IIFEs, each assigning
exactly one `window.Vitale.*` key. Dependency injection is the `<script>` order in `index.html`. There
is no build step and no local package manifest.

The pipeline is:
`drop/select → charset.readFileSmart → site-detector.prepareHTML → extractorBase.extractMainContent → mdream.convert → #mdOutput → download-modal → utils.downloadFile`.

Two flows reach extraction: the **Convert** flow (file drop / paste, `js/convert-panel.js`) and the
**URL assist** flow (a modal guide panel, `js/assist-panel.js`, introduced by commit `c262e92` when the
old tabs were replaced by a modal).

The review surfaced defects across four concerns in **existing, live code**. None of them are new to
`c262e92` except two accessibility gaps in the newly-introduced modal and one stale documentation index.

## Verified Facts (evidence gathered this phase)

Every claim below was confirmed by reading the file and, where it could be ambiguous, by grep.

### Correctness

- **Esc does not close the assist modal that was just opened.** `js/assist-panel.js:60` attaches the
  `keydown` listener to the **`modal` element**, but the modal is opened from a button
  (`js/assist-panel.js:56`) so the focus stays on `#btnAssist`, which is **outside** the modal. Keyboard
  events therefore never reach the listener until the user clicks inside. Only the button and the
  backdrop reliably close it. Contrast: `js/download-modal.js:55` calls `input.focus()` on open and that
  modal **does** close with Esc. No test covers the assist panel's keyboard path.
- **The Fanfiction `custom` extractor step is unreachable dead code, and the cleanup it claims to do
  never runs.** `js/extractors/base.js:82-85` tries `selectors` **first** and returns as soon as one
  yields content. `#storycontent` exists on every FFN page and its length exceeds
  `MIN_CONTENT_LENGTH` (`js/extractors/base.js:12`, value 200), so the `selectors` branch always wins
  and the `custom` branch at `js/extractors/fanfiction.js:13` never executes. The comment at
  `js/extractors/fanfiction.js:12-13` asserts the custom step strips residue the selector cannot — that
  assertion is false in practice. The regex it guards is also fragile: a lazy `([\s\S]*?)</div>` stops
  at the first closing `</div>` whose following sibling matches the anchor, truncating on nested divs.
- **`alertMsg` has no null guard, unlike its sibling.** `js/core/utils.js:33-35` dereferences `a.className`
  directly and throws `TypeError` if the target id is absent. `clearAlert` (`js/core/utils.js:60`) **does**
  guard with `if (!a) return;`. The asymmetry is accidental. `tests/utils-hardening.test.js:172` covers
  the `clearAlert` guard but not `alertMsg`.
- **`_alertTimer` is a single shared timer for all alerts** (`js/core/utils.js:26`). Grep confirms
  **every** current call site of `alertMsg` uses the `'convertAlert'` box, so this is **latent, not a live
  bug**: it only breaks when a second alert box shows a different message kind. Flagged, not scheduled.
- **`if (boundary)` is always true in the MHTML parser.** `js/core/mhtml-parser.js:124` is unreachable
  as a false branch because the function returns early at `js/core/mhtml-parser.js:85-89` when there is
  no boundary. Harmless, but dead.

### Performance

- **The format badge re-scans the whole document on every keystroke.** `js/site-detector.js:159`
  (`updateFormatBadge`) is wired to the textarea `input` event at `js/convert-panel.js:154-157`, and it
  calls `extractOriginUrl` (`js/site-detector.js:148`), which runs **four regexes over the raw string**.
  The widest is `mhtml.match(/Content-Location:\s*(\S+)/gi)` — a **global** match, so it materializes an
  array of every occurrence in the entire document on each event. The textarea accepts up to 3 MB
  (`js/convert-panel.js:106`). Fix is a debounce, not an algorithm change.
- **`allDomains()` re-allocates per call.** `js/extractors/registry.js:44` builds a fresh object each
  time `detectSiteFromUrl` asks. With 9 extractors this is noise. Explicitly **not** worth changing.

### Accessibility

- **No dialog semantics anywhere.** Grep for `role=`, `aria-`, `tabindex` across the HTML returns **zero**
  matches. `#downloadModal` (`index.html:130`) and `#assistModal` (`index.html:154`) have no
  `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`.
- **No focus management.** Nothing moves focus into a modal on open, and nothing returns it to the
  trigger on close; `Tab` walks the page behind the modal.
- **`#convertAlert` has no live region.** `index.html:95` — conversion success/error text is not
  announced to screen readers.

### Duplication and over-engineering

- **Platform instructions exist twice, with different wording.** `js/platform.js:32-58`
  (`renderAssistSteps`, 5 steps × 3 platforms) and `js/assist-panel.js:75-90` (3 steps × 3 platforms,
  separately reworded) describe the same procedure. Shotgun surgery: a copy edit must be made twice.
- **Upload-card copy is duplicated literally.** `js/platform.js:25` and `js/convert-panel.js:33` both
  contain the same string.
- **`prepareHTML` has two near-identical branches** (MHTML vs non-MHTML) computing the same fields:
  `js/site-detector.js:85-135`.
- **`wasFiltered` is computed twice** with the same predicate: `js/extractors/base.js:115-116` and
  `js/site-detector.js:96`.
- **`decodeBase64` and `MIN_CONTENT_LENGTH` are exported without any external consumer**
  (`js/core/mhtml-parser.js:59,131`; `js/extractors/base.js:12,119`). `decodeQuotedPrintable`, by
  contrast, **is** tested (`tests/mhtml-charset.test.js:181`).
- **The gradient-text CSS recipe is repeated three times** (`styles.css:93-100`, `:357-362`, `:390-395`),
  and `.modal input[type="text"], .modal input[type="url"]` (`styles.css:496-500`) restates base rules.
- **The stylesheet index is wrong.** `styles.css:9` labels section 5 as "Pestañas", but section 5
  (`styles.css:161`) is "PANEL PRINCIPAL". Residue from the tab→modal refactor.

### Explicitly NOT found (stated so the absence is evidence too)

- **No XSS.** Every dynamic `innerHTML` path goes through `Vitale.utils.esc()` or `textContent`;
  `DOMParser` documents are inert; `assist-panel` message strings are static.
- **No dead JS modules.** All 9 extractors register and are read through the registry; every `<script>`
  in `index.html` is reachable.
- **No O(n²) in any hot path.**
- **The engine dependency is correct**: `@mdream/js` is pinned to `2.0.3` with a CDN fallback.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `js/assist-panel.js` | Modified | Esc/focus bug; duplicated instructions; 4 native `alert()` calls |
| `js/core/utils.js` | Modified | `alertMsg` null guard; latent shared-timer note |
| `js/core/mhtml-parser.js` | Modified | Dead `if (boundary)`; unused `decodeBase64` export |
| `js/extractors/base.js` | Modified | Duplicate `wasFiltered`; unused `MIN_CONTENT_LENGTH` export |
| `js/extractors/fanfiction.js` | Modified | Unreachable dead `custom` branch |
| `js/site-detector.js` | Modified | Badge debounce; duplicated branches; duplicate `wasFiltered` |
| `js/convert-panel.js` | Modified | Duplicated upload copy; `input` wiring for the debounce |
| `js/platform.js` | Modified | Single source for platform instructions and upload copy |
| `js/download-modal.js` | Modified | Modal focus/role wiring |
| `index.html` | Modified | Dialog roles, `aria-modal`, `aria-labelledby`, live region |
| `styles.css` | Modified | Dedupe gradient recipe; fix stale index label |
| `tests/*.test.js` | Modified/New | Regression tests per fix; extend the `alert` harness |
| `openspec/config.yaml` | Modified | Refresh stale testing capabilities; `strict_tdd` → true |
| `docs/*`, `README.md` | Optional | Sync if behaviour described there changes |

## Approaches

1. **Fix only the correctness bugs (A-block), defer the rest.** Smallest diff, lowest risk. Leaves the
   accessibility gaps and the duplication in place.
2. **Single phased change covering all four concerns (RECOMMENDED).** One OpenSpec change, tasks grouped
   into independent phases so each phase is its own reviewable work-unit commit. Each phase is
   self-contained and revertible on its own.
3. **Split into two changes**: one for correctness+accessibility, one for the cleanup/duplication pass.
   Cleaner separation of "fix" from "refactor", but adds OpenSpec overhead for a change whose total
   authored diff is well under the 1600-line review budget.

## Recommendation

**Adopt Approach 2.** One change, four phases, ordered by risk:

1. **Correctness** — Esc/focus fix, fanfiction dead branch, `alertMsg` guard, dead `if (boundary)`.
2. **Accessibility** — dialog roles, focus management, live region.
3. **Performance** — badge debounce.
4. **Cleanup** — deduplicate platform instructions and copy, collapse duplicated branches, prune unused
   exports, dedupe CSS, fix the stale index label.

Rationale:

- Every correctness fix is a small, verifiable edit that already has a home in an existing test suite —
  the change can be **test-first** for the first time in this repo's history (see Verification).
- The accessibility work touches the same modal code as the correctness phase; doing them together avoids
  editing `assist-panel.js` twice.
- The cleanup phase is the largest by line count but the lowest by risk; isolating it in its own phase
  means a reviewer can accept the fixes and reject the refactor independently.
- A **separate** decision is required for the fourth `alert()` replacement candidate
  (`js/assist-panel.js:65,89,96,101`): the existing test suite asserts on `global.alert`
  (`tests/url-scheme-safety.test.js:24` stub; assertions at `:122`, `:149`, `:160`), so swapping those
  four calls for the styled `showMessage()` path **breaks three assertions** and requires harness changes.
  It is listed as an open question rather than folded in silently.

The `_alertTimer` sharing bug (`js/core/utils.js:26`) is **explicitly out of scope**: with a single call
site it cannot manifest. Revisit only when a second alert box appears.

## Minimal Change Set / Blast Radius

- **Correctness:** 4 files, ~15 authored lines (`js/assist-panel.js`, `js/extractors/fanfiction.js`,
  `js/core/utils.js`, `js/core/mhtml-parser.js`).
- **Accessibility:** `index.html` + 2 modal scripts, ~10 lines of attributes/JS.
- **Performance:** 1 small function in `js/site-detector.js` + wiring, ~5 lines.
- **Cleanup:** ~75 lines removed across `js/platform.js`, `js/assist-panel.js`, `js/convert-panel.js`,
  `js/site-detector.js`, `js/extractors/base.js`, `js/core/mhtml-parser.js`, `styles.css`.
- **Infrastructure:** `openspec/config.yaml` refreshed (testing capabilities + `strict_tdd`).

Total estimated authored change: **~105 lines**, comfortably inside the 1600-line review budget.

## Verification

**This repo now HAS an automated runner** — correcting the stale `sdd-init` record.

- Runner: Node (no package.json). Suite command (documented at `docs/desarrollo.md:79`):
  `Get-ChildItem tests\*.test.js | ForEach-Object { node $_.FullName }`.
- Current baseline: **5 suites, 57 passing, 0 failing.**
  (`tests/mhtml-charset.test.js`, `tests/utils-hardening.test.js`, `tests/url-scheme-safety.test.js`,
  `tests/prototype-safety.test.js`, `tests/generic-semantic.test.js`.)
- The suites stub browser globals (e.g. `global.alert`, DOM shims), so pure-logic fixes are testable
  headlessly. DOM/focus behaviour (Esc, focus return) still needs a browser check.
- Consequence: **Strict TDD is available and SHOULD be enabled** (`strict_tdd: true`). Each correctness
  fix gets a failing test first (RED), then the fix (GREEN). This is exactly what the stale config
  prevented.

Manual/browser checks still required for: modal focus movement, screen-reader announcements, badge
debounce feel, and the render of the deduplicated platform instructions.

## Risks

- **The `alert()` → `showMessage()` swap breaks existing assertions.** Mitigated by keeping it an open
  question, not a silent task.
- **Deduplicating platform instructions risks losing a platform-specific step.** Mitigated by diffing the
  two current variants before collapsing them and covering the rendered output with a test.
- **Touching `assist-panel.js` (the newest code) can regress `c262e92`.** Mitigated by running the full
  suite plus the browser checklist after each phase.
- **The stale `openspec/config.yaml` currently claims verification is manual-only.** If not refreshed
  first, later phases would plan against a false capability baseline.

## Ready for Proposal

**Yes.** Scope is bounded, every finding has file:line evidence, the estimated diff is ~105 lines, and —
unlike the 2026-10-14 change — this one can be driven test-first because a real runner exists.
One open question to carry into design: whether to replace the four native `alert()` calls in the assist
panel (requires test-harness changes).
