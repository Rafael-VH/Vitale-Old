# Design: Collapse the entry surface into a real two-column layout

## Context

The page renders three full-width bands in sequence: the upload card (`index.html:60-87`), the `.grid-2` field
pair (`:94`), and the action row (`:127`). The pair already forms two columns
(`styles.css:267` — `.grid-2{display:grid;grid-template-columns:1fr 1fr}`), but the upload card sits **above**
it at full width. The three bands add up to more than a laptop viewport can show, so the action buttons fall
below the fold. `.grid-2` collapses to one column below `820px` (`styles.css:622`) — a width threshold that
ignores orientation, so a tablet held horizontally (≥1024px) keeps its columns but a landscape phone
(~844px) does not, even though it has the vertical room the stacked layout consumes.

## Decision 1: Where the upload card lives

**Chosen:** move the upload card, the file-name chip, and the assist button inside the **left column** of
`.grid-2`, as the first children above the `#htmlInput` field head.

**Alternative rejected:** keep the upload card as its own band and only lower the breakpoint. Rejected because
the band is the thing that pushes the buttons down — the field pair is not what overflows. Moving the card
into the column is what recovers the vertical space; lowering the breakpoint alone would fix landscape phones
and leave laptops still scrolling.

**Consequence:** the left column becomes "everything you put content in" — upload affordance, then the text
field — and the right column stays "everything that comes out" — the result field, then its actions. That
split matches what the user asked for and gives the page a readable meaning: in on the left, out on the right.

## Decision 2: The breakpoint value

**Chosen:** `820px` → **`700px`** for the `.grid-2` collapse.

Reasoning from the two surfaces the row must hold:

- Each column carries a `textarea` with `min-height:240px` (`styles.css:299`) plus the panel's `26px` padding
  on both sides and a `22px` gap (`styles.css:267`). Two usable columns therefore need roughly
  `2 × 240px` + padding + gap, with enough left over for the mono text to wrap instead of scrolling
  horizontally.
- At `700px`, each column is about `(700 − 52 − 22) / 2 ≈ 313px` — comfortable for the entry textarea and
  enough for the upload card's icon, title, and format chips.
- A landscape phone (~844px) then keeps two columns; a portrait phone (~390-430px) still stacks. The cutoff
  sits below the narrowest landscape phone and above the widest portrait phone, which is exactly the gap the
  old `820px` value failed to find.

**Alternative rejected:** `orientation: landscape` alone. Rejected because orientation says nothing about
width: a small landscape phone can be 640px wide, and two 300px columns of monospace text would be tighter
than a stacked layout. A width threshold is the honest condition; orientation was the symptom, not the rule.

## Decision 3: The upload card at column width

**Chosen:** reduce the card's vertical footprint with a scoped rule rather than rewriting the card.

- Drop `padding` from `32px 24px` (`styles.css:387`) to about `20px 16px`.
- Reduce `.upload-icon` from `64px` (`:429`) to about `48px`, and the icon `svg` from `30px` (`:437`).
- Keep the `2px dashed` border, the gradient background, the hover lift, and the `.drag` / `.loaded` states
  untouched — they are colour and motion, not geometry, and the theme tokens already cover them.

**Why scoped:** §9 holds ~36 rules (`styles.css:384-495`). Only padding and icon size are geometry that the
narrower column actually breaks; everything else is colour, motion, or content. Rewriting the block would
churn CSS the change does not need.

## Decision 4: The card as a tap target on narrow screens

**Chosen:** in the narrow media query, the card keeps its markup but drops the drag-only affordances.

- Hide the `.upload-arrow` bob indicator (`:439`, already hidden in `.loaded`) — it signals dragging, which a
  touch pointer cannot do.
- Reduce padding further and centre the format chips.
- The **copy already adapts**: `js/platform.js:22-33` (`uploadCopy()`) returns "Suelta tu archivo aquí o haz
  clic para elegirlo" on desktop and "Toca para seleccionar un archivo" on mobile, and `renderUploadCard()`
  writes it. No new copy logic is introduced; the existing one is already correct for both shapes.

**Not chosen:** rendering a different element (a real `<button>`) on mobile. Rejected because the drop target
and the file chooser are the same `<label for="fileInput">`; swapping the element would fork the markup, the
CSS, and the tests for a visual difference the current copy already handles.

## Decision 5: Removing the paste control

**Chosen:** delete `#btnPaste` from `index.html:100` **and** its click handler from
`js/convert-panel.js:202-222`, together, in one task.

**Why both together:** `tests/editable-output.test.js:97` registers a `btnPaste` stub in its DOM shim, so
`convert-panel.js:202`'s `document.getElementById('btnPaste').addEventListener(...)` resolves against the stub
even after the real button is gone. Deleting only the markup leaves the suite green while the page has no such
button — a false green. Deleting only the handler leaves dead markup. The pair must go in one step, and the
suite must be observed failing before the handler is removed (strict TDD, `openspec/config.yaml`).

**Preserved:** `js/assist-panel.js:119-123` focuses `#htmlInput` and scrolls `#uploadCard` into view when the
user activates "go to convert". Both elements survive the move, so the navigation keeps working; only the
scroll landing point needs a browser check now that the card sits inside a column.

## Decision 6: The action labels

**Chosen:** `"⚡ Convertir a Markdown"` → `"Convertir"` and `"💾 Descargar .md"` → `"Descargar"`.
The emoji and the format suffix are removed with the words; the label names the action.

**Also required:** `js/platform.js:61,68,75` — the three assist-step branches say *"pulsa «Ir a pegar
HTML»"* and *"usa el panel de carga"*. Those steps name a control that will not exist. They are rewritten in
the same change so the guidance does not point at a missing button, satisfying the `assist-guide` delta.

## Affected Areas

| Area | Impact | Detail |
|------|--------|--------|
| `index.html` | Modified | Upload card + `.file-name` + assist button become the left column's first children; `#btnPaste` removed; labels shortened |
| `styles.css` | Modified | Scoped `.upload-card` geometry; narrow-screen variant; `.grid-2` collapse `820px` → `700px` |
| `js/convert-panel.js` | Modified | Pegar handler removed; no other change |
| `js/platform.js` | Modified | Assist steps no longer name "Ir a pegar HTML" |
| `tests/editable-output.test.js` | Modified | `btnPaste` stub removed with the handler |
| `openspec/specs/assist-guide/spec.md` | Modified | Delta promoted at archive |
| `docs/arquitectura.md` | Modified | Layout and breakpoint section |
| `openspec/config.yaml` | Modified | Baseline corrected: 8 suites / 80 assertions |

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `.upload-card` states (`.drag`, `.loaded`, hover) break at column width | Med | Re-read §9 after the change and verify every state in a real browser at wide and narrow widths |
| `assist-panel.js:123` `scrollIntoView({block:'center'})` lands off-centre on a taller left column | Med | Browser check; adjust `block` if the target is mispositioned |
| `platform.js:61,68,75` step copy drifts from the real controls again | Low | The `assist-guide` delta adds a scenario requiring every named control to exist |
| Two ~313px columns crowd monospace text at exactly `700px` | Low | Verify at `700px` and `1024px`; the textareas scroll rather than break |

## Verification plan

Headless suite covers logic only — `openspec/config.yaml` states DOM and focus behaviour are not verifiable
headlessly. The browser pass therefore carries the layout claims:

1. **1366×768 laptop** — two columns, action buttons reachable with no vertical scroll.
2. **1024×768 tablet landscape** — two columns.
3. **390×844 phone portrait** — stacked, card is a compact chooser button.
4. **844×390 phone landscape** — two columns at the new breakpoint.
5. **Drag, loaded, hover, focus** on the moved card — all states intact.
6. **Assist navigation** — "go to convert" focuses `#htmlInput` and scrolls the card into view sensibly.
7. **Both schemes** — the moved card keeps correct colour under auto, light, and dark.

## Rollback

Two commits, both revertible with `git revert <sha>`. No stored data, no persistence, no engine behaviour is
touched, so rollback has no data risk.
