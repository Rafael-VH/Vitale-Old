# Verification Report: editable-markdown-output

**Change**: `editable-markdown-output`
**Mode**: Strict TDD (`strict_tdd: true`) — the Node suite is the RED/GREEN gate for the access paths; a browser covers the DOM behaviour and the computed styles
**Date**: 2026-10-18
**Verifier**: SDD verify (inline — delegation tool unavailable this session)

## Completeness

| Phase | Tasks | Complete |
|-------|-------|----------|
| Phase A — Editable surface + edit-aware access paths | 4 | 4/4 |
| Phase B — Presentation for a form control (CSS only) | 2 | 2/2 |
| Phase C — Verification and docs | 4 | 4/4 |
| Phase D — Follow-up (post-verification adjustment) | 1 | 1/1 |
| **Total** | **11** | **11/11** |

## Build / Tests / Coverage Evidence

| Item | Command | Result |
|------|---------|--------|
| Test suite | `Get-ChildItem tests\*.test.js \| ForEach-Object { node $_.FullName }` | 7 suites, **71 assertions, 0 failures** |
| Syntax | `node --check <file>` on every modified JS file | exit 0 (`js/convert-panel.js`, `js/download-modal.js`, `tests/editable-output.test.js`) |
| Build | — | N/A: zero-build static app |
| Runtime | Puppeteer against `file:///C:/Users/rafae/Documents/GitHub/Vitale-Old/index.html` | PASS — 11/11 scenarios in a single pass, with a **real** conversion (`Vitale.mdream.isLoaded() === true`, no stubbed engine) |
| CSS geometry | `getComputedStyle` probes on the live page | PASS (matrix under Correctness Checks) |

Per-suite assertions (baseline 63 → 71; the +8 are all the new suite):

| Suite | Assertions | Status |
|-------|-----------|--------|
| `editable-output.test.js` (new, Phase A) | 8 | PASS |
| `prototype-safety.test.js` | 15 | PASS |
| `utils-hardening.test.js` | 13 | PASS |
| `mhtml-charset.test.js` | 11 | PASS |
| `url-scheme-safety.test.js` | 11 | PASS |
| `generic-semantic.test.js` | 8 | PASS |
| `extractor-reachability.test.js` | 5 | PASS |

No pre-existing assertion was removed or skipped.

## Behavioral Compliance Matrix

### editable-markdown-output (6 requirements / 11 scenarios)

| Requirement | Scenario | Evidence | Status |
|-------------|----------|----------|--------|
| Editable result surface | Result is editable after a conversion | `#mdOutput` is now `<textarea class="output-box">`; after a real conversion a probe wrote `## Nueva seccion` and `value` changed | PASS |
| Editable result surface | Text is preserved verbatim | Converted output keeps its newlines and 4-space indentation exactly; no markup reinterpretation (`textContent` stayed `""`, i.e. the control never parsed the text) | PASS |
| Editable result surface | Empty result shows the hint | The hint is supplied by `::placeholder`, i.e. a mechanism that renders on the control; the dead `::before` rule was removed and computes `none` | PASS |
| Accessible name for the result control | Label points at the control | `<label for="mdOutput">Markdown resultante</label>`; `md.labels` resolves to that element, so activation targets the control | PASS |
| Save uses the current text | Editing before download changes the saved file | The payload passed to `downloadFile` was exactly the edited text (`## Nueva seccion`), not the conversion | PASS |
| Save uses the current text | Downloading without editing saves the conversion unchanged | With no edit, the payload compared **byte-identical** to the converted output (`IGUAL_EXACTO: true`) | PASS |
| Copy uses the current text | Editing before copying copies the edit | The payload passed to `copyToClipboard` was exactly the edited text, not the conversion | PASS |
| Empty and error guards preserved | Empty result is refused | Empty box → `⚠️ No hay Markdown que descargar.` and **0 downloads**; the guard runs before the modal opens | PASS |
| Empty and error guards preserved | Errored result is refused | A result beginning with `❌` → same warning, 0 downloads | PASS |
| Counter reflects the current text | Typing updates the counter | An `input` listener on `#mdOutput` updates the counter while typing (58 characters) | PASS |
| Counter reflects the current text | Converting updates the counter | After a conversion the counter shows the converted length (48 characters) | PASS |

**All 11 spec scenarios PASS.**

## Correctness Checks

| Check | Result |
|-------|--------|
| The `.value` vs `.textContent` trap | Probe on the real control: setting `value` leaves `textContent === ""`. A `.textContent` read would silently return the default and ignore every edit — this is the exact failure the change removes, and all six read sites now use `.value` |
| A weak check was caught and redone | The first "download without editing" probe compared only string length, so it returned `true` without proving anything. It was re-run as an exact comparison → `IGUAL_EXACTO: true` |
| Guard ordering | `downloadModal.open()` already calls `markdownOrWarn`, so an empty or errored result never opens the modal and never reaches `downloadFile` (0 downloads observed) |
| Dead CSS rule actually removed | `.output-box:empty::before` deleted (Phase B.2); `getComputedStyle(el, '::before').content` computes `none`. A form control cannot render a pseudo-element box, so the rule was unreachable |
| Box geometry, empty vs filled (Phase D) | empty **240px** (`:placeholder-shown` true) → after a real conversion **372px** (`:placeholder-shown` false) → after Limpiar back to **240px** |
| Box geometry, long content | 699 characters / 60 extra lines: height stays capped at **372px** and scrolls for real (`scrollHeight: 1527 > clientHeight: 370`) |
| Box geometry, resize | Manual `500px` honoured; `180px` clamps to the global `textarea` floor of **240px**; clearing the inline style returns to the rule-driven height |
| Geometry stayed scoped | `#htmlInput` untouched at **240px** (it does not carry `.output-box`) |
| Compute cost of the fix | Two declarations and one selector, no JS, no `field-sizing` (Chromium-only). The default empty height equals the pre-change `240px` |
| Frozen areas untouched (Phase C.4) | `git diff --stat 8173543..HEAD` is empty for `js/mdream-loader.js`, `openspec/specs/` and `old/` |
| Helper not modified | `Vitale.utils.updateCounter` needed no change — it already branches on `typeof el.value === 'string'` before `textContent`; `js/core/utils.js` is untouched |

## Design Coherence

| Decision | Implementation | Coherent |
|----------|----------------|----------|
| Spec says a native plain-text control, not rich text | `<textarea>`; no rich-text editor, no `<div>`, no per-line `<br>` | Yes |
| One source of truth for the surface text | All six consumers read `.value`; nothing reads `.textContent` | Yes |
| No helper change required | `updateCounter` already preferred `.value`; the only new wiring is one `input` listener | Yes |
| `design` artifact deliberately omitted | Justified in `exploration.md`: a CSS-plus-one-control change with no architectural surface | Yes |
| Hint must come from a mechanism that renders on the control | `::placeholder` instead of `::before` | Yes |
| The empty box keeps its pre-change height | Phase D restored 240px empty, 62vh filled — the same shape as the old `<div>` | Yes |
| Docs follow the behaviour | `docs/arquitectura.md:148` corrected from `textContent` to `value`; `docs/guia-de-uso.md` states the box is editable and that saving copies what you see | Yes |
| Documented-only content excluded from scope | `docs/mhtml-y-charsets.md:87` left as-is (documents the encoding algorithm, not a public API) | Yes |
| Frozen copies left alone | `old/v1/`, `old/v2/` keep their own `.output-box` and `:empty::before` | Yes |

## Issues

### CRITICAL

- None.

### WARNING

- **The review was fully inline.** No independent verifier ran; the same actor implemented and verified every phase. This weakens the independence of the verdict.
- **`styles.css` has no automated coverage.** The box behaviour from Phases B and D (height, cap, resize, hint) is verified only in the browser, so it has no regression guard. An accidental removal of the `:not(:placeholder-shown)` rule would not fail any test.
- **Browser evidence is non-visual.** The model cannot read image input, so verification rests on computed styles and DOM assertions rather than inspecting screenshots.

### SUGGESTION

- Add a DOM-level test harness for `convert-panel.js` (carried from `harden-conversion-flow`) to guard the clear/edit paths and the new counter listener.
- A Markdown shorter than the box still occupies the full `min(540px, 62vh)`: a textarea does not size to its content. The resize handle covers it; `field-sizing: content` would fix it but is not cross-browser yet.
- Sweep the remaining line references in `docs/limitaciones.md` (carried; out of scope for this change).

## Verdict

**PASS WITH WARNINGS**

All 11 tasks are complete and all 11 spec scenarios pass with real runtime evidence, including a genuine engine conversion and an exact (not length-only) comparison on the unedited download path. The Phase D adjustment additionally resolves the "High" risk recorded in `proposal.md:103` by restoring the pre-change empty height. The warnings are the absence of an independent verifier and the lack of automated coverage for the CSS surface and `convert-panel.js`; neither invalidates the change nor blocks archiving.
