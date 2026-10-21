# Proposal: Collapse the entry surface into a real two-column layout

## Intent

The page stacks three full-width bands vertically: the upload card (`index.html:60-87`), then the `.grid-2`
field pair (`:94`), then the main action row (`:127`). The `.grid-2` already splits the two textareas into
two columns, but the upload card sits **above** the grid at full width, so every band pushes the main buttons
further down. The user must scroll to reach **Convertir** and **Descargar** on a laptop or on a tablet held
horizontally — the very screens that have the vertical room to spare, because `.grid-2` collapses to one
column below `820px` (`styles.css:622`) regardless of orientation.

The goal is a layout where drag-and-drop and the `#htmlInput` field share the **left** column, the Markdown
result keeps the **right** column, and both action buttons remain visible without scrolling. This also removes
the **Pegar** button, which is redundant with native paste and fails on browsers that block
`navigator.clipboard.readText()` (`js/convert-panel.js:202-222`).

## Scope

### In Scope
- Move the upload card and the "¿Cómo obtengo el archivo?" button **inside the left column** of `.grid-2`.
- Remove the **Pegar** button (`#btnPaste`) and its click handler.
- Compress the upload card to a **tap-to-choose button** on narrow (portrait mobile) screens; keep the
  full drop-zone affordance on wide screens.
- Shrink the upload card's footprint when it lives inside a column.
- Lower the `.grid-2` collapse breakpoint from `820px` to `~600px` for the field pair.
- Shorten the action labels to **"Convertir"** and **"Descargar"**.
- Update the spec that documents the removed button; refresh the layout section of `docs/arquitectura.md`.
- Correct the stale `openspec/config.yaml` baseline (declares 7 suites / 71; the repo has 8 / 80).

### Out of Scope
- Splitting `styles.css` into modules — the file stays a single stylesheet (user decision).
- Any change to conversion logic, the mdream engine, extractors, or the charset/mhtml parsers.
- Repositioning or redesigning the status bar, brand header, alert surfaces, or the download modal.
- Removing the `#htmlInput` field itself — it remains the entry surface and the flow's source of truth.

## Capabilities

### New Capabilities
- None. The layout is presentation; no new spec-level capability is introduced.

### Modified Capabilities
- `assist-guide`: the requirement *"Upload-card copy from one source"* and the assist panel's "go to convert"
  navigation must reflect that the upload card now lives inside the entry column, and the **Pegar** button is
  no longer part of the entry surface. The single-definition rule for upload-card copy MUST survive the move.

## Approach

Restructure `index.html` so the upload card and its assist button become the first children of the **left**
column inside `.grid-2`, above the `#htmlInput` field. Delete `#btnPaste` from the markup and its listener
from `convert-panel.js`. Retune `.upload-card` in `styles.css` for column width, and add a narrow-screen rule
that reduces the card to a compact button. Lower the grid collapse breakpoint. No JavaScript module contract
changes: every element kept keeps its `id`, so `convert-panel`, `site-detector`, `platform`, and `assist-panel`
continue to resolve their targets.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `index.html` | Modified | Upload card + assist button moved into the left column; `#btnPaste` removed; action labels shortened |
| `styles.css` | Modified | `.upload-card` retuned for column width; narrow-screen compact variant; grid collapse breakpoint lowered |
| `js/convert-panel.js` | Modified | Pegar click handler and `#btnPaste` reference removed |
| `tests/editable-output.test.js` | Modified | The `#btnPaste` stub element is no longer required |
| `openspec/specs/assist-guide/spec.md` | Modified | Entry-surface requirement reflects the removal and the move |
| `docs/arquitectura.md` | Modified | Layout and breakpoint section |
| `openspec/config.yaml` | Modified | Stale baseline corrected to 8 suites / 80 assertions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `js/assist-panel.js:119-123` centres `#uploadCard` via `scrollIntoView({block:'center'})`; the card now sits inside a column | Med | Verify the scroll target in a real browser and adjust the block if it lands off-centre |
| Many `.upload-card` rules (`styles.css:384-482`) assume full width, including `.drag`/`.loaded` | Med | Re-read the whole §9 block and verify drag, loaded, and hover states in the browser |
| Removing `#btnPaste` leaves `tests/editable-output.test.js` green while the DOM stub hides the break | Med | Delete the stub **and** the handler together; observe the suite RED first (strict TDD) |
| Lowering the breakpoint squeezes 240px textareas in a narrow landscape phone | Low | Verify both columns at 600-700px width; keep vertical stacking below the new cutoff |

## Rollback Plan

Two revertible commits (`feat(layout): ...` and `docs(openspec): ...`); `git revert <sha>` restores the
previous stacked layout in full. The change touches no stored data, no persistence, and no engine behaviour,
so rollback carries no data risk.

## Dependencies

- None. No new dependency, no build step, no framework.

## Success Criteria

- [ ] On a 1366×768 laptop, the Convertir and Descargar buttons are reachable without vertical scrolling.
- [ ] On a screen ≥ the new breakpoint, the entry column and the result column render side by side.
- [ ] On a portrait phone, panels stack vertically and the upload card presents as a compact chooser button.
- [ ] Drag-and-drop, the loaded state, and the format/site badges keep working in a real browser.
- [ ] The full suite passes with no assertion removed; the `#btnPaste` stub is gone.
