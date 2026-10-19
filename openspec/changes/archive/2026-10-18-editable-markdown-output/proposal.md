# Proposal: editable-markdown-output

## Intent

After a conversion the Markdown result is display-only — `#mdOutput` is a `<div>` (`index.html:110`), and all
six accesses to it go through `.textContent`. A user who wants to fix one stray line, drop residual
navigation text or trim front matter must download the file first, edit it in an external editor, and then
re-import it. The pipeline produces a good **draft**, not a finished file, and today the app offers no way
to act on that.

This change makes the Markdown result editable in place as a plain-text control, and makes the save and copy
paths read the text the user actually sees — so edits reach the `.md` file instead of being silently
discarded.

## Scope

### In Scope

Phases are cut so that **no file is edited twice**, and ordered so the app is correct after every commit.

**Phase A — Editable surface + edit-aware access paths (test-first, headless)**
- `index.html`: `#mdOutput` `div` → `textarea`, with the native `placeholder` (replacing the CSS hint),
  `spellcheck="false"`, and a `for`/`id` association for the existing "Markdown resultante" label
  (`index.html:105`), which currently points at nothing.
- `js/download-modal.js:30`: the save path reads `.value`, not `.textContent`.
- `js/convert-panel.js`: the remaining five `.textContent` sites (`:44`, `:116`, `:134`, `:221`, `:236`) →
  `.value`; plus an `input` listener so the character counter follows manual edits.
- `tests/editable-output.test.js`: new suite; a genuine RED exists on the save path.

**Phase B — Presentation for a form control (CSS only, browser-checked)**
- `styles.css`: an explicit height for the textarea, so it keeps the previous capped-and-scrolling box (a
  textarea does not grow with content the way the div did); remove the now-dead `.output-box:empty::before`
  rule (`styles.css:286`).

**Phase C — Verification and docs**
- Full suite, browser checklist, docs sync if the pipeline or limitations table is affected.
- Confirm `old/v1`, `old/v2`, the mdream loader and the existing specs are untouched.

### Out of Scope

- **`contenteditable` on the existing div.** Rejected: it reinterprets input — rich-text paste, and each
  line break becoming a `<div>`/`<br>` with blank lines collapsed — which corrupts Markdown. This is the
  wrong control for raw text.
- **An "Editar" toggle** swapping the box between display and edit modes. Extra state and UI for no benefit
  once the surface is editable in place.
- **An unsaved-edits warning on re-conversion.** Re-conversion is an explicit action that replaces the
  result. Revisit only if it is requested.
- **Edit history, autosave, a diff view, a side-by-side preview pane.**
- **The engine, extraction and charset layers.** This feature lives entirely after `mdream.convert`.
- **`updateCounter` (`js/core/utils.js:76-86`).** It already reads `.value` before `.textContent`, so it
  needs no change. Recorded here so the absence of an edit is a decision, not an oversight.
- Any change to `old/v1/`, `old/v2/` (frozen samples).
- The `design` phase: **skipped deliberately.** The one real design decision — a native editable control vs
  `contenteditable` vs a mode toggle — is already made and justified in `exploration.md`. No architectural
  decision remains, and the repo contract (one IIFE, one `Vitale.*` key, no new files, no build) dictates
  the rest; a `design.md` would only restate this proposal.

## Capabilities

### New Capabilities
- `editable-markdown-output`: the Markdown result as an editable plain-text surface, and the guarantee that
  every reader of that text — the download path, Copiar, and the character counter — observes the text the
  user sees.

### Modified Capabilities
- None. `core-utilities` is untouched: this change depends on `updateCounter`'s existing dual support
  without modifying it. `conversion-engine-loading`, `html-extraction`, `assist-guide` and
  `modal-accessibility` are unaffected.

## Approach

One change, three phases (A, B, C), each an independent, revertible work-unit commit:

- **A → B → C.** Phase A is the behaviour and lands test-first: the failing save-path test first, then the
  element swap and the access-site switch. Phase B is CSS only, so a reviewer can reject the presentation
  without touching behaviour. Phase C closes the change.
- **Phase A must be atomic.** Switching the readers to `.value` while the element is still a `<div>` would
  make the save path read `undefined` and refuse every download — so the element and its readers move in one
  commit, not two phases.
- **The suite is not sufficient for B.** Box geometry and the empty-state hint are only observable in a
  browser, so the browser checklist is part of the deliverable, not a formality.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `index.html` | Modified | `#mdOutput` `div` → `textarea`; native `placeholder`, `spellcheck`, label association |
| `js/convert-panel.js` | Modified | Five `.textContent` sites → `.value`; `input` listener for the counter |
| `js/download-modal.js` | Modified | The save-path read → `.value` |
| `styles.css` | Modified | Explicit textarea height; remove the dead `:empty::before` rule |
| `tests/editable-output.test.js` | New | Save-path regression suite (RED first) |
| `openspec/specs/editable-markdown-output/spec.md` | New | The new capability's spec |
| `docs/*`, `README.md` | Optional | Sync only if a description of the pipeline is affected |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A missed `.textContent` site silently saves the original — the exact bug | Med | Grep the whole tree for `mdOutput`; the save path is guarded by a test |
| Readers switched to `.value` while the element is still a div → every download refused | High if split | Element and readers change in the same commit (Phase A) |
| The element-type change regresses the just-verified `.output-box` look | Med | Browser check of computed styles; `.output-box` keeps specificity precedence over `textarea` |
| The empty-state hint silently disappears (form controls do not render `::before`) | High (certain) | Move it to the native `placeholder` attribute in the same commit as the element swap |
| A textarea does not grow with content → the box looks smaller than before | High | Explicit height in Phase B, verified against the previous cap |
| The counter goes stale after an edit — a defect this change would introduce | High without the fix | The `input` listener in Phase A |
| `convert-panel.js` has no headless coverage, so the copy path and the counter are browser-only | High (known) | Documented as the chosen verification, mirroring the previous change's badge-debounce task |

## Rollback Plan

Each phase is its own commit on the feature branch. Reverting B restores the previous CSS with the behaviour
intact; reverting A restores the display-only div (the pre-change behaviour). No data, schema or storage
change. The `Vitale.utils` surface is unchanged, and `mdream`, `extractors` and the panel APIs keep their
existing shape.

## Dependencies

- None external. No new runtime dependency, no build step, no new local file beyond the test suite and this
  change's artifacts. Node is available for the suite (already in use).

## Success Criteria

- [ ] The Markdown result is editable after a conversion.
- [ ] A `.md` downloaded after editing contains the edit, not the original conversion.
- [ ] Copiar copies the edit.
- [ ] The character counter follows manual typing.
- [ ] An empty or errored result is still refused with the existing warning, and no file is produced.
- [ ] No `.textContent` access remains on `#mdOutput`.
- [ ] The empty-state hint is still visible before the first conversion.
- [ ] Full suite green (baseline 6 suites / 63 assertions) plus the new suite; no assertion removed.
- [ ] `old/v1`, `old/v2`, `js/mdream-loader.js` and the existing specs are untouched.
