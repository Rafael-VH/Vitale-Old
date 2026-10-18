# Exploration: editable-markdown-output

> SDD explore artifact. Source: read-only reading of the conversion → save pipeline in the live code
> (`js/convert-panel.js`, `js/download-modal.js`, `js/core/utils.js`, `index.html`, `styles.css`).
> `old/v1` and `old/v2` are frozen samples and were excluded.
> Persistence: hybrid (this file + Engram `sdd/editable-markdown-output/explore`).
>
> **Planning only.** No source file was modified in this phase.

## Current State

The request: after uploading an MHTML (or HTML) file and converting it, the resulting Markdown should be
**editable before saving it as `.md`**.

Today the result is display-only. The verified pipeline is:

`drop/select → charset.readFileSmart → site-detector.prepareHTML → extractorBase.extractMainContent → mdream.convert → #mdOutput → download-modal → utils.downloadFile`

`#mdOutput` is a `<div class="output-box">` (`index.html:110`) — a non-editable box. There is no edit
affordance anywhere: the codebase contains no `contenteditable`, no `readOnly`, and no second textarea on
the output side.

## Verified Facts

Every claim below was confirmed by reading the file and, where it could be ambiguous, by grep.

### The result surface is not editable

- `index.html:110`: `<div class="output-box" id="mdOutput"></div>`. A `div` renders text; it cannot be
  typed into.
- The only editable surface today is the **input** textarea `#htmlInput` (`index.html:96`).

### Every access to `#mdOutput` uses `.textContent`

| Site | Operation |
|------|-----------|
| `js/convert-panel.js:44` (`clearOutput`) | write `''` |
| `js/convert-panel.js:116` (`convert`) | write the converted markdown |
| `js/convert-panel.js:134` (error path) | write `'❌ Error: ' + err.message` |
| `js/convert-panel.js:221` (Limpiar) | write `''` |
| `js/convert-panel.js:236` (`btnCopyMd`) | **read** |
| `js/download-modal.js:30` (`markdownOrWarn`) | **read — the save path** |

There is no other consumer: a grep for `mdOutput` across `js/` returns only these two files, plus
`js/main.js:19` (`Vitale.downloadModal.setup()`).

### The save path

`downloadModal.confirm()` (`js/download-modal.js:70-86`) calls `markdownOrWarn()` (`:29-36`), which reads
`document.getElementById('mdOutput').textContent`, rejects empty content and content starting with `❌`,
and returns the text. That text is passed to `Vitale.utils.downloadFile(finalName, md)`
(`js/core/utils.js:124`), which prepends a UTF-8 BOM and downloads a `Blob`. `downloadFile` accepts a plain
string, so **it needs no change**.

### The copy path

`btnCopyMd` (`js/convert-panel.js:235-244`) reads the same element and calls
`Vitale.utils.copyToClipboard(md)` (`js/core/utils.js:92`). It shares the `❌`/empty guard.

### `updateCounter` already supports textareas (important)

`js/core/utils.js:76-86` reads the `.value` branch **first**:

```js
let len = 0;
if(typeof el.value === 'string') len = el.value.length;
else if(typeof el.textContent === 'string') len = el.textContent.length;
```

So if `#mdOutput` becomes a `<textarea>`, `updateCounter('mdOutput','outputCounter')` keeps working
unchanged. **No helper edit is needed** — the counter already handles both element kinds.

### Styling

- `.output-box` (`styles.css:275-284`) styles the div: `padding:16px`, `min-height:240px`, a monospace
  `.82rem` font, `white-space:pre-wrap`, `overflow-y:auto`, `max-height:min(540px,62vh)`.
- The shared `textarea` rule (`styles.css:199-214`) already supplies `width:100%`, `resize:vertical`,
  `min-height:240px`, a monospace font and a focus ring.
- Specificity: `.output-box` is a class `(0,1,0)` and `textarea` is a type selector `(0,0,1)`, so the box
  look wins wherever both set a property; textarea-only properties (`width`, `resize`) still apply.
- `.output-box:empty::before` (`styles.css:286`) renders the "El resultado aparecerá aquí…" hint.
  `::before`/`:empty` are **not reliable on a form control** such as `<textarea>`, so that hint would
  silently disappear.
- `.output-box` has exactly one consumer in the live code — `#mdOutput`. `old/v2/styles.css` carries its own
  frozen copy and must not be touched.

### The trap that defines this change

`<textarea>` is a form control: its **text is `.value`**. Its `.textContent` reflects the element's
*default* (raw) text, which is **not** updated by user edits — and also **not** updated by assigning
`.value`. Mixing the two breaks both ways:

- Write with `.value`, read with `.textContent` → the reader sees `''` (the untouched default) and the
  save guard refuses to download.
- Write with `.textContent`, let the user edit, read with `.textContent` → the reader sees the **original**
  conversion and the user's edits are silently discarded.

The second case is exactly the bug the request is about. Therefore every read **and** every write on
`#mdOutput` must move to `.value`.

### Explicitly NOT found (stated so the absence is evidence too)

- **No existing edit affordance to reuse** — neither `contenteditable` nor a second output control.
- **No `mdOutput` consumer outside the two known files.**
- **No engine or extraction change is needed** — this feature lives entirely after `mdream.convert`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `index.html` | Modified | `#mdOutput` `div` → `textarea`; native `placeholder`; `spellcheck="false"`; label ↔ control association |
| `styles.css` | Modified | Small `.output-box` adjustment for a form control; remove the now-dead `:empty::before` rule |
| `js/convert-panel.js` | Modified | 5 `.textContent` sites → `.value`; `input` listener to keep the counter honest |
| `js/download-modal.js` | Modified | 1 `.textContent` read (the save path) → `.value` |
| `tests/editable-output.test.js` | New | Regression suite — the save path RED first |
| `openspec/specs/editable-markdown-output/spec.md` | New | New capability (delta spec) |
| `docs/*`, `README.md` | Optional | Sync only if the pipeline or the limitations table is affected |

## Approaches

1. **Make `#mdOutput` a `<textarea>`.** The native editable multi-line plain-text control. Edits stay raw
   text, so Markdown keeps its whitespace and blank lines verbatim. Small diff: one element, one attribute
   set, and a mechanical `.textContent`→`.value` switch at 6 sites. **RECOMMENDED.**
2. **`contenteditable` on the existing div.** Fewer call-site edits, because `.textContent` still reads the
   content — but it is **wrong for this job**: `contenteditable` reinterprets input (pasted rich text, and
   each line break becomes a `<div>` or `<br>`, collapsing blank lines), which corrupts Markdown. Rejected.
3. **Keep the div and add an "Editar" toggle that swaps in a textarea.** Extra state, extra UI and extra
   code (two render modes to keep in sync) for no benefit over making the surface editable in the first
   place. Rejected (YAGNI).

## Recommendation

**Adopt Approach 1.** Turn `#mdOutput` into a `<textarea>` and switch every `.textContent` access on it to
`.value` — reads and writes alike, so the two can never disagree.

Small supporting items, each with a concrete reason (none speculative):

- **Keep the counter in sync on manual edits** (add an `input` listener on `#mdOutput`). Without it the
  visible counter lies from the first keystroke — a defect this change would otherwise *introduce*.
- **Use the native `placeholder` attribute** for the empty hint and delete the dead `:empty::before` rule.
- **`spellcheck="false"`** — spell-squiggles over Markdown are noise.
- **Associate the existing "Markdown resultante" label** (`index.html:105`) with the control via
  `for`/`id`, since it currently points at nothing.

Deliberate non-goals (stated, so they are decisions rather than omissions):

- **No "unsaved edits" warning when converting again.** Re-conversion is an explicit user action that
  replaces the result. Revisit only if it is requested.
- **No** edit history, autosave, diff view, or side-by-side preview pane.

## Minimal Change Set / Blast Radius

- **`index.html`:** 1 element (`div` → `textarea`) plus `placeholder`, `spellcheck`, and 1 label attribute.
- **`styles.css`:** a small `.output-box` adjustment for a form control; remove the dead `:empty::before`
  rule. ~4 lines.
- **`js/convert-panel.js`:** 5 `.textContent` → `.value`; 1 `input` listener. ~8 lines.
- **`js/download-modal.js`:** 1 `.textContent` → `.value`. ~1 line.
- **`tests/editable-output.test.js`:** new suite.
- **Docs:** optional sync only.

Total estimated authored change: **~40 lines** of code, plus tests and docs — far inside the 1600-line
review budget. **Single PR.**

## Verification

- Runner: Node (no `package.json`). Suite command:
  `Get-ChildItem tests\*.test.js | ForEach-Object { node $_.FullName }`.
- Current baseline: **6 suites, 63 assertions, 0 failing**.
- **Test-first is possible here.** `downloadModal` **exports** `setup/open/close/confirm`
  (`js/download-modal.js:110`), so the save path is reachable headlessly. RED: stub `#mdOutput` with a
  distinct `value` (the edit) and `textContent` (the original), stub `Vitale.utils.downloadFile`, and
  assert it receives the **edited** value. That fails today (the code reads `.textContent`) and passes
  after the switch — a falsable, honest RED.
- `convertPanel` exports only `setup()` (`js/convert-panel.js:250`), so the copy path and the counter
  listener need a DOM stub (the `makeEl` pattern the suites already use). Cover them there if the stub
  stays cheap; otherwise document them as browser checks. **Do not invent a RED** for a pure refactor.
- Browser checks (Puppeteer, `file://`): the result is typeable; the downloaded file contains the edit;
  Copiar contains the edit; the counter follows typing; the empty hint shows; computed styles match the
  previous box.
- Full suite green; no assertion removed.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A missed `.textContent` site silently saves the original — the exact bug | Med | Grep the whole `js/` tree for `mdOutput`; guard the save path with a test |
| The element-type change regresses the just-verified `.output-box` look | Med | Browser check of computed styles; `.output-box` keeps specificity precedence |
| The `:empty::before` hint silently disappears | High (certain on a textarea) | Move to the native `placeholder` attribute and verify it renders |
| `resize:vertical` fights `max-height:min(540px,62vh)` | Low | Verify in the browser; set an explicit `height` if the interaction is poor |
| The counter goes stale after an edit (a defect this change would introduce) | High without the fix | Add the `input` listener in the same phase |
| Re-touching `styles.css` collides with the previous change's verified CSS state | Low | Minimal, additive CSS; explicit browser check |

## Ready for Proposal

**Yes.** The surface, all six access sites, the save and copy paths, the counter helper and the styling are
pinned with file:line evidence, and the estimated diff is ~40 lines.

One product decision is proposed with a default — **no unsaved-edits warning when converting again** — and
can be challenged cheaply now, before it becomes a spec requirement.
