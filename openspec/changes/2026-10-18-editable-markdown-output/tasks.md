# Tasks: editable-markdown-output

> Phases are cut so **no file is edited twice**, and ordered so the app is correct after every commit.
> Flow: `proposal → specs → tasks` (`design` skipped deliberately — the one design decision is made and
> justified in `exploration.md`).
> Verification legend: **`suite`** = headless Node test (`tests/*.test.js`); **`browser`** = Puppeteer DOM /
> computed-style check over `file:///.../index.html`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 45–80 |
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
| A | Editable surface + `.value` access paths, test-first | PR 1 | Atomic: element and readers move together |
| B | Presentation for a form control (CSS only) | PR 1 | Independently rejectable; behaviour untouched |
| C | Verification sweep + docs | PR 1 | Closes the change |

---

## Phase A: Editable surface + edit-aware access paths (Strict TDD — RED first)

- [ ] A.1 **RED: the save path ignores edits.** Create `tests/editable-output.test.js` following the existing
      suite style (module loaded via `eval(fs.readFileSync(...))`, hand-rolled `makeEl` stubs, no framework).
      Stub `#mdOutput` as an element exposing a DISTINCT `value` (the edit) and `textContent` (the original),
      stub `Vitale.utils.downloadFile`, call `Vitale.downloadModal.confirm()` and assert `downloadFile`
      received the **edited** value. This MUST FAIL first: today the code reads `.textContent`. Also cover the
      refusal guard (empty result and a result starting with `❌` → `downloadFile` NOT called).
      (spec: `editable-markdown-output` / Save uses the current text — both scenarios; Empty and error guards
      preserved — both scenarios)
      Test: `suite` — the new suite runs and the save-path case is RED (exit=1).

- [ ] A.2 **The result surface becomes a plain-text control.** In `index.html`, replace the `#mdOutput`
      `<div class="output-box">` (`:110`) with a `<textarea class="output-box" id="mdOutput">` carrying the
      native `placeholder` with the text the CSS hint currently renders ("El resultado aparecerá aquí…") and
      `spellcheck="false"`; add `for="mdOutput"` to the "Markdown resultante" label (`:105`), which currently
      points at nothing. KEEP the `output-box` class — its specificity already carries the box look.
      Do NOT add a `rows` attribute larger than needed; the height is Phase B's job.
      (spec: Editable result surface — all three scenarios; Accessible name for the result control)
      Test: `browser` — the element accepts text input; the hint is visible while empty; the label resolves to
      the control.

- [ ] A.3 **GREEN: one property for every access.** Switch the six sites from `.textContent` to `.value`:
      `js/convert-panel.js:44` (clear), `:116` (markdown), `:134` (error), `:221` (Limpiar), `:236` (copy
      read), and `js/download-modal.js:30` (save read). Writes and reads MUST move together: mixing them
      reads `undefined` while the element is still a div and `''` on an untouched textarea. After this task,
      `grep -rn "mdOutput" js/` MUST show no `.textContent` access.
      (spec: Save uses the current text; Copy uses the current text)
      Test: `suite` — A.1 GREEN; every prior suite still green.

- [ ] A.4 **Keep the counter honest.** Add an `input` listener on `#mdOutput` calling
      `Vitale.utils.updateCounter('mdOutput','outputCounter')`, so manual typing updates the counter (today it
      only follows programmatic writes — a defect this change would otherwise introduce). Do NOT modify
      `updateCounter` (`js/core/utils.js:76-86`): it already reads `.value` before `.textContent`.
      (spec: Counter reflects the current text — both scenarios)
      Test: `browser` — type and delete; the counter follows. `suite` unchanged.

## Phase B: Presentation for a form control (CSS only)

- [ ] B.1 **Preserve the box geometry.** A textarea does not grow with its content, so with only the inherited
      `min-height:240px` it would sit at 240 px and scroll, where the div used to grow up to
      `min(540px,62vh)` (`.output-box`, `styles.css:275-284`). Give `#mdOutput` an explicit height matching
      the previous cap, and verify how it interacts with the inherited `resize:vertical`
      (`styles.css:204`).
      (spec: Editable result surface — text preserved verbatim / Empty result shows the hint)
      Test: `browser` — computed height and overflow behaviour match the previous box; `resize` still works.

- [ ] B.2 **Remove the dead hint rule.** Delete `.output-box:empty::before` (`styles.css:286`) — a form control
      does not render it, and the hint now comes from the `placeholder` attribute. Confirm first that
      `#mdOutput` is that rule's only consumer (`old/v2/styles.css` carries its own frozen copy — do not
      touch it).
      (spec: Editable result surface — Empty result shows the hint)
      Test: `browser` — the hint still renders (via `placeholder`); grep shows no `:empty::before` remains.

## Phase C: Verification and docs

- [ ] C.1 Full suite: `suite` — baseline 6 suites / 63 assertions, plus the new suite; none removed or skipped.
      Also `node --check` on every changed JS file (the repo has no linter, formatter or type-checker; this is
      the only static gate).
      Test: the suite command exits 0 with the expected counts.

- [ ] C.2 Browser checklist: every `editable-markdown-output` scenario, in one Puppeteer pass — edit then
      download contains the edit; edit then Copiar contains the edit; download without editing saves the
      conversion unchanged; the counter follows typing; the hint shows before the first conversion; the empty
      and `❌` paths still refuse; computed styles match the previous box.
      Note: screenshots cannot be reviewed (the model cannot read images) — equivalence rests on DOM
      assertions and computed styles, as in the previous change.
      Test: `browser`.

- [ ] C.3 Docs sync if a description of the pipeline or the limitations table is affected (`README.md`,
      `docs/*`). If `docs/limitaciones.md` already lists this as a known limitation, mark it resolved and
      note the change name; if it does not, add nothing (do not invent a backlog row for a feature that now
      works).
      Test: grep the touched docs for the change name.

- [ ] C.4 Confirm untouched: `old/v1/`, `old/v2/`, `js/mdream-loader.js`, and the existing specs
      (`core-utilities`, `modal-accessibility`, `assist-guide`, `html-extraction`,
      `conversion-engine-loading`).
      Test: `git diff --stat` shows none of them.
