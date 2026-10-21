# Tasks: two-column-layout

## Review Workload Forecast

| | |
|---|---|
| **Estimated authored changed lines** | ~165 (additions + deletions) |
| **Files touched** | 8 |
| **Chained PRs recommended** | No |
| **400-line budget risk** | Low |
| **Decision needed before apply** | No |

Breakdown: `index.html` ~40 (move block + delete button + 2 labels), `styles.css` ~75 (scoped card geometry +
narrow variant + breakpoint), `js/convert-panel.js` ~25 (delete handler), `js/platform.js` ~10 (3 step
strings), `tests/editable-output.test.js` ~5 (delete stub), `assist-guide/spec.md` ~0 (already written in
Phase 2), `docs/arquitectura.md` ~8, `openspec/config.yaml` ~4.

At ~165 lines the change sits well inside the configured 1600-line review budget. No split needed.

## Task Size

**Large** — fails the resume test: the browser verification matrix, the docs/config correction, and the
archive are separate deliverables that cannot be finished from the request and `git diff` alone in one
sitting.

## Branch

`feat/two-column-layout`, branched from `main` at `3cfdee6`.

## Tasks

### T1 — Observe RED: paste control removal

- **Spec:** `entry-layout` — "The entry surface exposes no paste control"
- **Route:** inline
- **Depends on:** —
- **Commit:** `test(layout): red on paste-control removal`

`tests/editable-output.test.js:97` registers a `btnPaste` stub. Before touching source, assert that the paste
control must not exist and watch the suite fail:

1. Add an assertion that `document.getElementById('btnPaste')` resolves to `null` after loading the module —
   it will fail against the stub, which is the point.
2. Record the observed failure verbatim in `## Log`.

The RED here is not decoration. Without it, deleting the markup leaves a green suite that proves nothing,
because the stub answers `getElementById` for a button the page no longer has.

### T2 — Remove the paste control and its handler

- **Spec:** `entry-layout` — "The entry surface exposes no paste control"; "Clearing the entry resets the surface"
- **Route:** inline
- **Depends on:** T1
- **Commit:** `refactor(entry): remove redundant paste control`

Two edits in one step, because either alone is a defect:

1. `js/convert-panel.js:202-222` — delete the `#btnPaste` click handler.
2. `index.html:100` — delete the `#btnPaste` button.
3. `tests/editable-output.test.js:97` — delete the `btnPaste` stub entry.
4. Verify `#btnClear`'s handler (`convert-panel.js:225`) still resets entry, result, and card.

Suite MUST go green for the right reason: `getElementById('btnPaste')` returns `null` because nothing looks
for it any more — not because a stub answers.

### T3 — Move the upload card into the entry column

- **Spec:** `entry-layout` — "The entry and result surfaces share one row"; "Moving the upload affordance preserves its behaviour"
- **Route:** inline
- **Depends on:** T2
- **Commit:** `refactor(layout): move upload affordance into the entry column`

Pure move — geometry and containment only, no style or copy change in this task:

1. `index.html:60-89` — cut the `.upload-card` label, the `#fileNameDisplay` chip, and the `#btnAssist`
   button.
2. Paste them as the first children of the left column `<div>` (`index.html:96`), above the existing
   `.field-head`.
3. Element ids do not change. Confirm the four `#htmlInput` consumers still resolve:
   `convert-panel.js:62`, `convert-panel.js:95`, `site-detector.js:141`, `assist-panel.js:121`.

Keep the move separate from the restyle so that if something breaks, the cause is unambiguous.

### T4 — Retune the upload card for column width

- **Spec:** `entry-layout` — "The entry and result surfaces share one row"; "Moving the upload affordance preserves its behaviour"
- **Route:** inline
- **Depends on:** T3
- **Commit:** `style(upload): fit the card to a column`

Scoped geometry only. §9 holds ~36 rules; touch just what the narrower column breaks:

1. `.upload-card` padding `32px 24px` → `20px 16px` (`styles.css:387`).
2. `.upload-icon` `64px` → `48px` (`:429`); `.upload-icon svg` `30px` → `24px` (`:437`).
3. Leave the gradient, the `2px dashed` border, the hover lift, and `.drag` / `.loaded` untouched.
4. Re-read `styles.css:384-495` after the edit and confirm each state rule is still coherent.

### T5 — Collapse the grid at 700px instead of 820px

- **Spec:** `entry-layout` — "Narrow viewports stack without losing the entry path"
- **Route:** inline
- **Depends on:** T4
- **Commit:** `style(layout): stack the surfaces at 700px`

1. `styles.css:622` — change the `.grid-2` single-column media query from `820px` to `700px`.
2. In that same query, add the compact-variant rules: hide `.upload-arrow` (drag-only affordance), reduce
   card padding further, centre the format chips.
3. Do NOT add a second copy string — `js/platform.js:22-33` already returns the mobile wording and
   `renderUploadCard()` already writes it.
4. Check `styles.css:622` is not shared with other selectors; if it is, narrow the query to `.grid-2` only.

### T6 — Shorten the action labels

- **Spec:** `entry-layout` — "The action labels name the action"
- **Route:** inline
- **Depends on:** —
- **Commit:** `feat(actions): name the action in button labels`

1. `index.html:128` — `"⚡ Convertir a Markdown"` → `"Convertir"`.
2. `index.html:129` — `"💾 Descargar .md"` → `"Descargar"`.
3. Grep the repo for both old strings and update any other occurrence.

### T7 — Rewrite the assist steps that name the removed control

- **Spec:** `assist-guide` — "Single definition of platform instructions" (scenario: instructions name controls that exist)
- **Route:** inline
- **Depends on:** T2, T6
- **Commit:** `fix(assist): stop naming the removed paste control`

`js/platform.js:61,68,75` all say *"pulsa «Ir a pegar HTML»"* and *"usa el panel de carga"*. After T2 and T6
those names are wrong.

1. Desktop branch (`:75`): instruct pasting directly into the entry field, then "Convertir" and "Descargar".
2. Android (`:61`) and iOS (`:68`): point at the upload affordance, then "Convertir" and "Descargar".
3. No step may name a control that does not exist. Cross-check every named control against `index.html`.

### T8 — Correct the stale baseline in the SDD config

- **Spec:** none — housekeeping confirmed in the proposal
- **Route:** inline
- **Depends on:** T2-T7 (the count must reflect the final suite)
- **Commit:** `docs(sdd): correct suite and assertion baseline`

`openspec/config.yaml` declares `suite_count: 7` / `baseline_passing: 71`. The real state is 8 suites /
80 assertions. Update both after the suite is green, so the recorded baseline matches what was observed.

### T9 — Document the layout and breakpoints

- **Spec:** `entry-layout` — all layout requirements
- **Route:** inline
- **Depends on:** T5
- **Commit:** `docs(arch): record the two-column layout and 700px breakpoint`

`docs/arquitectura.md:174-186` describes the current layout and breakpoints. Update it to match the shipped
page: the entry column holding the upload affordance, the resized card, and the `700px` collapse.

### T10 — Browser verification

- **Spec:** all `entry-layout` requirements; `assist-guide` delta
- **Route:** inline
- **Depends on:** T3-T9
- **Commit:** none (verification only)
- **Evidence:** results in `## Log`

Headless suite covers logic only; `openspec/config.yaml` states DOM, focus, and drag behaviour are not
verifiable headlessly. This pass carries the layout claims.

Matrix:

| View | Width | Expectation |
|---|---|---|
| Laptop | 1366×768 | Two columns; action buttons reachable with no vertical page scroll |
| Tablet landscape | 1024×768 | Two columns |
| Phone landscape | 844×390 | Two columns (inside the new breakpoint) |
| Phone portrait | 390×844 | Stacked; card is a compact tap target |

States: drag-over, dropped/loaded (with file name), hover, focus on the card. Verify both schemes
(auto, light, dark) on the moved card. Then activate "go to convert" in the assist modal and confirm
`assist-panel.js:123` still focuses `#htmlInput` and lands the card sensibly in view.

Playwright CLI is broken on this machine (`ChildProcess.kill ...powershell.EXE`). Workaround: drive the
Playwright Node API directly with `chromium.launch({channel:'chrome'})`.

### T11 — Verify against specs

- **Spec:** all
- **Route:** inline
- **Depends on:** T10
- **Commit:** `docs(openspec): verify two-column-layout`
- **Evidence:** a per-requirement verdict in `## Log`

Verdict for every `S#` in `## Specs`: pass, fail, or not-verified, with the observation that supports it.
Report CRITICAL / WARNING / SUGGESTION. A requirement proven only by reasoning, not by an observation, is
not verified — mark it plainly.

### T12 — Archive and promote the delta

- **Spec:** none
- **Route:** inline
- **Depends on:** T11
- **Commit:** `docs(openspec): archive two-column-layout and promote specs`
- **Evidence:** archive path in `## Log`

1. Promote `specs/assist-guide/spec.md` delta into `openspec/specs/assist-guide/spec.md`.
2. Add `openspec/specs/entry-layout/spec.md` as a new capability.
3. Move the change folder to `openspec/changes/archive/2026-10-21-two-column-layout/`.
4. Re-run the suite and confirm the promoted specs match the implementation.

## Dependency graph

```
T1 → T2 ─┬→ T3 → T4 → T5 ─┬→ T9 ─┐
         │                 │      │
         ├→ T7 ────────────┼──────┼→ T10 → T11 → T12
         │                 │      │
T6 ──────┘                 │      │
                           │      │
         T2..T7 ──────→ T8 ─┘      │
```

T6 is independent of T1-T5 and may run in any order. T8 must follow the last source change so the recorded
count matches the final suite.

## Commit strategy

One work-unit commit per task, in dependency order, on `feat/two-column-layout`. Tests, code, and docs stay
together per commit. T10 and part of T11 produce evidence, not commits.
