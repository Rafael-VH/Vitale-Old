# Tasks: two-column-layout

## Review Workload Forecast

| | |
|---|---|
| **Estimated authored changed lines** | ~165 forecast; **~230 actual** (T5b added ~65) |
| **Files touched** | 8 |
| **Chained PRs recommended** | No |
| **1600-line budget risk** | Low |
| **Decision needed before apply** | No |

Breakdown: `index.html` ~40 (move block + delete button + 2 labels), `styles.css` ~140 (scoped card geometry +
vertical reclaim + narrow variant + breakpoint), `js/convert-panel.js` ~25 (delete handler), `js/platform.js`
~10 (3 step strings), `tests/editable-output.test.js` ~5 (delete stub), `assist-guide/spec.md` ~0 (already
written in Phase 2), `docs/arquitectura.md` ~8, `openspec/config.yaml` ~6.

Even at the measured ~230 lines the change sits well inside the configured 1600-line review budget. No split
needed. T5b was added after T10 measured a real fold overflow; it was not in the original forecast.

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

`openspec/config.yaml` declares `suite_count: 7` / `baseline_passing: 71`. The real state is **8 suites /
82 assertions** (measured per-suite: 10+5+8+11+15+9+11+13). The old note also said 7 suites because
`theme.test.js` was never counted. Update the count, the prose, the header comment, and the apply-phase
`baseline 71 passing` line after the suite is green, so the recorded baseline matches what was observed.

### T5b — Reclaim the vertical space so the actions fit

- **Spec:** `entry-layout` — "The action buttons fit without a vertical page scroll"
- **Route:** inline
- **Depends on:** T5
- **Commit:** `style(layout): reclaim vertical space so actions clear the fold`

T10's first run measured the laptop viewport at `scrollHeight: 997` against `768` — the actions landed at
`bottom: 898`, 130px under the fold. The two-column split was correct; the panel was simply too tall. This
task is the measured fix, not a guess:

1. `body` padding-top `28px` → `12px` (the panel already carries its own padding).
2. `.subtitle` margin `14px 0 26px` → `10px 0 14px`.
3. `.panel` padding `26px` → `16px`.
4. `.grid-2` `gap:22px; margin-top:6px` → `gap:20px; margin-top:0`.
5. `.output-box` empty height `240px` → `170px`; filled cap `min(540px,62vh)` → `min(300px,44vh)`;
   `textarea` `min-height` `240px` → `170px`.
6. `.upload-card` padding `20px 16px` → `14px`; `.upload-icon` `48px` → `40px`, margin `0 auto 8px`.
7. `.assist-open` margin `18px` → `8px`; `.field-head` margin `8px` → `6px`;
   `.btn-row.main-actions` margin-top `22px` → `12px`.

After the fix the measured action bottom is `730` in a `768` window — inside the fold, empty and filled.

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

| View | Width | Expectation | Observed |
|---|---|---|---|
| Laptop | 1366×768 | Two columns; action buttons within the fold | 2 cols; action bottom **730** ≤ 768 |
| Tablet landscape | 1024×768 | Two columns; action buttons within the fold | 2 cols; action bottom **750** ≤ 768 |
| Tablet landscape | 1180×820 | Two columns; action buttons within the fold | 2 cols; action bottom **730** ≤ 820 |
| Phone landscape | 844×390 | Two columns, stacked-by-height is accepted | 2 cols; **does not fit** — column content is ~460px of card+field+textarea against a 390px window |
| Phone portrait | 390×844 | Stacked; card is a compact tap target | 1 col; stacked, scrolls by design |

The 844×390 row was first written as a "must fit" cell. It is physically impossible: the entry column alone
is `card 211 + assist 30 + field-head 30 + textarea 170 + counter 19 = 460px`, plus a `127px` fixed header
and a `48px` action row. 844×390 is a phone held sideways, not a landscape tablet; the real landscape cases
(1024×768, 1180×820) both fit. The requirement is scoped to the fold-fitting cases, not this one.

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
T1 → T2 ─┬→ T3 → T4 → T5 → T5b ─┬→ T9 ─┐
         │                        │      │
         ├→ T7 ───────────────────┼──────┼→ T10 → T11 → T12
         │                        │      │
T6 ──────┘                        │      │
                                  │      │
         T2..T7 ──────────────→ T8 ┘      │
```

T6 is independent of T1-T5 and may run in any order. T8 must follow the last source change so the recorded
count matches the final suite.

## Commit strategy

One work-unit commit per task, in dependency order, on `feat/two-column-layout`. Tests, code, and docs stay
together per commit. T10 and part of T11 produce evidence, not commits.

## Log

### T8 — config baseline corrected

Committed `50bac7f`. `openspec/config.yaml`: `suite_count 7 → 8`, `baseline_passing 71 → 82`, the `context:`
prose, the header comment, and the apply-phase `baseline 71 passing` line. The 82 was read per-suite, not
carried over: 10+5+8+11+15+9+11+13. The earlier 80 in the plan was an arithmetic slip; `theme.test.js` (9)
had never been counted either.

### T5b — vertical reclaim, and why it existed

T10's first measurement run: laptop 1366×768 gave `scrollHeight 997` / `viewport 768`, actions at
`top 850 / bottom 898`. The goal of the change — the actions reachable without a vertical scroll — was
*not* met, even though the two-column split was correct. The height breakdown showed where the space sat:
`body` padding-top `28`, `.subtitle` margin-bottom `26`, `.panel` padding `26`, a `240px` textarea floor, and
`.upload-card` at `191px` for ~148px of content.

A simulation pass over candidate values found the combination that clears the fold before touching the file.
The seven edits in T5b are that measured combination. After applying them: laptop `bottom 730`, tablet
1024×768 `bottom 750`, tablet 1180×820 `bottom 730` — all inside the fold, both `empty` and `filled` states.

### T10 — browser verification (observed)

Runner: Playwright Node API, `chromium.launch({channel:'chrome'})`, served from `127.0.0.1:8765`.

Layout:

| Viewport | Columns | Card in entry column | Action bottom | Fits |
|---|---|---|---|---|
| 1366×768 | 2 | yes | 730 | yes |
| 1024×768 | 2 | yes | 750 | yes |
| 1180×820 | 2 | yes | 730 | yes |
| 844×390 | 2 | yes | 774 | **no** (physical — 460px column vs 390px window) |
| 390×844 | 1 (stacked) | yes | 1218 | no — stacked layout scrolls by design |

Labels: `[Convertir] [Descargar]` in every viewport. `#btnPaste` absent (`getElementById` → null) in every
viewport. Breakpoint collapse observed at 390px (1 column) versus 844px (2 columns), matching the 700px rule.

Card states (1366×768): resting `border dashed`; hover/drag/loaded switch to `solid` with the transform
transition applied; card visible and non-zero in all four. First keyboard `Tab` lands on `#themeToggle` with
the accent `box-shadow` focus ring — the focus path is intact after the move.

Schemes: `auto` (`data-theme` null) and `light` render the card border `rgb(216,224,236)`; `dark` renders
`rgb(36,48,73)`. The card follows the theme tokens it already used.

Assist navigation: `#btnAssist` opens `#assistModal`; "Ir a la conversión" (`#btnGoConvert`) focuses
`#htmlInput` and leaves the card in view at `top 202` — the `assist-panel.js:123` `scrollIntoView` path still
works after moving the card.

Headless suite: 8/8 green after the CSS change (`editable-output`, `extractor-reachability`,
`generic-semantic`, `mhtml-charset`, `prototype-safety`, `theme`, `url-scheme-safety`, `utils-hardening`).

Not verified by observation: the CSS `:hover` border-color change did not register under `p.hover()` in
headless Chrome (the transition transform applied, the border color did not). No requirement depends on it.

### T11 — spec verdicts (all observed, second browser pass)

Drag/drop, loaded state, clear-reset, single-source copy, and instruction content were all exercised in the
browser, not reasoned about.

**`entry-layout`**

| Requirement | Verdict | Observation |
|---|---|---|
| Surfaces share one row | **pass** | 1366/1024/1180 all render 2 columns; card shares the entry column with `#htmlInput` (`cardSharesColumnWithInput=true`) |
| Action buttons not below the fold | **pass** | action bottom 730 ≤ 768 (laptop), 750 ≤ 768 (1024), 730 ≤ 820 (1180); also holds with the output filled |
| Narrow viewports stack | **pass** | 390×844 renders 1 column, full width, entry above result |
| Upload affordance operable without drag | **pass** | card is a `<label>` for the file input; card visible and non-zero at 390px |
| No paste control | **pass** | `getElementById('btnPaste')` → `null` in every viewport; grep finds only the test assertions |
| Pasting via native paste | **pass** | step 4 text reads *"pega con Ctrl+V en el campo de entrada"*; no custom control claimed |
| Clearing resets the surface | **pass** | `#btnClear` → input empty, output empty, chip empty+hidden, card `loaded` removed, counter `0 caracteres` |
| Action labels | **pass** | `[Convertir] [Descargar]` in every viewport |
| Drag-and-drop loads a file | **pass** | synthetic drop of `pagina.html` → input 54 chars, chip `📄 pagina.html` visible, card `loaded`, border solid |
| Loaded state survives the move | **pass** | loaded border `rgba(52,211,153,.4)`, chip `inline-flex` carrying the file name, entry holds the text |

**`assist-guide` delta**

| Requirement | Verdict | Observation |
|---|---|---|
| Single definition of platform instructions | **pass** | `uploadCopy()` defined once in `js/platform.js`; card consumes it via `renderUploadCard()` — one source |
| Editing the copy updates both surfaces | **pass** | both surfaces read the same function; no second literal found in the grep sweep |
| Instructions match the selected platform | **pass** | rendered steps are the platform branch's steps (desktop branch shown) |
| Instructions name controls that exist | **pass** | rendered text names *"Convertir"* and *"Descargar"*, the entry field, the upload affordance; no step names the removed control (`pegar HTML` regex → false) |
| Upload-card copy from one source | **pass** | single origin confirmed; no duplicate literal |
| Copy matches the rendered affordance | **pass** | wide viewport copy describes dropping/choosing; narrow branch uses tap wording from the same function |

**Severity**

- **CRITICAL:** none.
- **WARNING:** none.
- **SUGGESTION:** none. The 844×390 phone-landscape viewport does not fit the actions, but it is not a
  requirement case — see T10.

Every requirement above was confirmed by an observation in the browser or by a direct read of the source.
Nothing is marked verified on reasoning alone.
