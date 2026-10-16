# Tasks: harden-conversion-flow

> Phases are cut by **testability**, not theme, so no file is edited twice across phases.
> Phase 0 enables Strict TDD before the first fix.
> Flow: `proposal → specs → tasks` (`design` skipped deliberately — no architectural decision remains).
> Verification legend: **`suite`** = headless Node test (`tests/*.test.js`); **`browser`** = Puppeteer DOM
> check (focus/markup are not observable headlessly).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120–160 |
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
| 0 | SDD tooling truth-up (`strict_tdd: true` + Engram records) | PR 1 | Tiny; unblocks test-first for everything after |
| A | Pure-logic fixes, test-first: `alertMsg` guard, Fanfiction dead step, MHTML dead guard | PR 1 | Highest certainty; headless `suite` |
| B | Modal behaviour + accessibility + `alert()` → inline message | PR 1 | Needs `browser` checks; changes 3 existing assertions |
| C | Badge debounce | PR 1 | ~5 lines |
| D | Duplication/dead-export/CSS cleanup | PR 1 | Last so a reviewer can reject it alone |
| E | Verification sweep + docs sync | PR 1 | Closes the change |

---

## Phase 0: SDD tooling (first — unblocks test-first)

- [x] 0.1 In `openspec/config.yaml`, replace the stale testing block (`runner: none`, "no test runner"),
      set `strict_tdd: true`, and record the real runner command
      (`Get-ChildItem tests\*.test.js | ForEach-Object { node $_.FullName }`) and the 5 suites.
      Test: `suite` ran 5/5 with `exit=0`, and the top-level + `testing:` section parses with
      `strict_tdd: true`, `runner: node`, the real command, `suite_count: 5`, `baseline_passing: 57`.
      NOTE: `rules.apply` / `rules.verify` mix block-sequence items with sibling scalar keys at the same
      indent, which is NOT strict YAML — a **PRE-EXISTING** defect of the upstream template (the
      unmodified file fails parsing at its own `rules.apply`; reproducible via
      `git show HEAD:openspec/config.yaml`). The shape is preserved on purpose:
      `sdd-apply/strict-tdd.md:123` reads `rules.apply.test_command` as an override AND
      `sdd-apply/SKILL.md:231` applies `rules.apply` as directives, so restructuring would break one of
      the two documented contracts. Out of scope for this change; deliberately not fixed.
- [x] 0.2 Correct the stale Engram records `sdd-init/vitale-old` and `sdd/vitale-old/testing-capabilities`
      (both 2026-10-14, both claiming no tests exist) to reflect 5 suites / 57 passing / Node runner /
      `strict_tdd: true`.
      Test: `mem_search` for the corrected terms returns the updated record, not the old text.
      Done: obs 875 rewritten (strict TDD ENABLED, runner + the 5 suites listed) and obs 877 updated
      (Strict TDD TRUE, `## Testing` section added, stale tabs line and tech-debt statuses corrected).

## Phase A: Pure logic (Strict TDD — RED first, headless)

- [x] A.1 **`alertMsg` null guard.** RED: in `tests/utils-hardening.test.js`, add a case asserting
      `alertMsg('<missing-id>', 'x')` does not throw and is symmetric with the existing `clearAlert` guard
      case — must FAIL first. GREEN: add `if (!a) return;` in `js/core/utils.js:33-35`.
      (spec: `core-utilities` / Alert helper null-safety + helpers are symmetric)
      Done: RED observed (`Cannot set properties of null (setting 'className')`, exit=1) → GREEN
      (13 ok / 0 fallos). JSDoc now states the no-op explicitly, as `clearAlert` does.
- [x] A.2 **MHTML dead guard.** Remove the always-true `if (boundary)` at `js/core/mhtml-parser.js:124`
      (the function already returns early at `:85-89`). Behaviour-preserving by construction — no RED is
      possible for dead-code removal, so this is a refactor under the existing suite.
      Test: `suite` (all `tests/mhtml-charset.test.js` green) + `node --check js/core/mhtml-parser.js`.
      Done: guard removed and its body dedented. `tests/mhtml-charset.test.js` 11 ok / exit=0;
      `node --check` exit=0. No RED claimed — confirmed dead by the `if(!boundary){...return...}` at `:83-87`.
- [x] A.3 **Fanfiction: prove the step dead.** Written as `tests/extractor-reachability.test.js` — ONE
      suite covering A.3 + A.5, because the registry must be loaded to exercise the extractor at all and a
      second file would duplicate the `DOMParser` stub. No real FFN page was available, and reachability is
      a property of the cascade rather than of one page, so the suite pins the OBSERVABLE contract instead
      of a scraped fixture: `#storycontent` long → the selector wins; `#storycontent` short but with the
      exact string `custom`'s regex looked for → nothing rescues it; element absent → no site strategy;
      threshold is exactly 200 (`199` out, `200` in). Every case passes both before and after the deletion,
      so the guard survives the fix instead of being written to fit it.
      (spec: `html-extraction` / No unreachable strategy + Content threshold gate)
- [x] A.4 **Fanfiction: resolve the step.** Resolved as DELETE: the unreachable `custom` step and its false
      comment are gone from `js/extractors/fanfiction.js`, leaving only `selectors: ['#storycontent']`.
      **A genuine RED did exist**, contrary to the plan: the A.5 registry invariant FAILED naming
      `fanfiction` before the deletion (exit=1) and passes after — so this is RED→GREEN, not a blind
      refactor. Docs synced in the same task, because changing behaviour changes its documentation:
      `docs/extractores.md:62-64` and the supported-sites table no longer claim Fanfiction uses `custom`,
      and now warn that declaring both `selectors` and `custom` shadows the `custom`.
      (`old/v1`, `old/v2` intentionally untouched — frozen.)
      Test: `suite` — 6 suites / 63 passing; A.3's test green; no declared step is shadowed.
- [x] A.5 Verify no other extractor declares an unreachable step (same class of defect).
      Done: `fanfiction` was the ONLY extractor declaring both `selectors` and `custom`; the other six
      (`ao3`, `webnovel`, `royalroad`, `wikipedia`, `substack`, `blogger`) declare `selectors` only. The
      invariant is now enforced over the whole registry in `tests/extractor-reachability.test.js` (all
      seven extractors are loaded and counted), so reintroducing the pattern fails the suite.
      Test: `suite` — 6 suites / 63 passing; `node --check` exit=0 on all four changed JS files.

## Phase B: Modal behaviour + accessibility (needs browser checks)

- [x] B.1 **Dialog semantics + live region (markup).** In `index.html`: add `role="dialog"`,
      `aria-modal="true"`, `aria-labelledby` to `#downloadModal` (`:130`) and `#assistModal` (`:154`);
      add `role="status"` and `aria-live="polite"` to `#convertAlert` (`:95`).
      (spec: `modal-accessibility` / Dialog semantics + Status announcements)
      Test: `browser` — each dialog exposes the three dialog attributes; `#convertAlert` exposes the live
      region. Grep for `role=`/`aria-` in `index.html` no longer returns 0.
      Done: applied. **Line drift vs the plan**: `#convertAlert` is at `:124` (was already), not `:95`;
      `#downloadModal` `:131`, `#assistModal` `:155`. RED observed in-browser pre-fix (fix stashed):
      `role`/`aria-modal`/`aria-labelledby` all `null` on both backdrops and the live region `null`.
      GREEN: `status|polite`, `dialog|true`, `dialog|true`, and each `aria-labelledby` resolves to its
      visible `<h3>` (`downloadModalTitle` → "💾 Guardar archivo Markdown",
      `assistModalTitle` → "📋 Cómo obtener el HTML").
- [x] B.2 **Focus entry on open.** RED: `browser` check — focus `#btnAssist`, activate it, assert
      `document.activeElement` is inside `#assistModal`; currently FAILS (focus stays on the trigger).
      GREEN: move focus into the dialog on open in `js/assist-panel.js` (mirror `js/download-modal.js:55`).
      (spec: `modal-accessibility` / Focus entry on open — incl. pointer-open scenario)
      Done: RED observed pre-fix — `activeElement` = `btnAssist` (`focusInsideAssist=false`), i.e. focus
      never left the trigger. GREEN: `activeElement` = `assistUrl`, inside the dialog. The focus call is
      deferred with `setTimeout(..., 100)` on purpose: `.modal-backdrop` is `display:none` until `.show`
      (`styles.css:469` / `:477`), and a synchronous `focus()` on a display-none element is a no-op. The
      plan's "RED first" was NOT captured before writing the fix (see B.4 note) and was recovered by
      stashing the fix and re-running the probe, so the RED is observed, not assumed.
- [x] B.3 **Escape dismissal.** RED: `browser` check — open `#assistModal` via `#btnAssist` with NO click
      inside, press `Escape`, assert the modal is hidden; currently FAILS (the `keydown` listener is on the
      modal at `js/assist-panel.js:60`, so the event never arrives). GREEN: attach/route the dismissal so it
      works regardless of where focus was when the dialog opened. Repeat the check for `#downloadModal`.
      (spec: `modal-accessibility` / Escape dismissal — both scenarios)
      Done: RED observed pre-fix in BOTH dialogs — assist `assistClosedByEscape=false` (the listener lived
      on `modal`, so a key event that never reached the modal was ignored) and download
      `downloadClosedByEscapeFromButton=false`. **New finding**: the download modal bound `Escape` to
      `filenameInput`'s own `keydown`, so `Escape` only worked while focus was in the input — with focus on
      `#btnCancelDownload` it did nothing. GREEN: one `document`-level `keydown` per panel, guarded by
      `modal.classList.contains('show')` so it only acts on an open dialog; the input-level `Escape` was
      removed from `js/download-modal.js` (its `Enter` handler kept).
- [x] B.4 **Focus restoration on close.** `browser` check for each close route (button, `Escape`, backdrop):
      assert `document.activeElement` is the trigger button afterwards. Wire in `js/assist-panel.js` /
      `js/download-modal.js`. (spec: `modal-accessibility` / Focus restoration on close)
      Done: applied and verified GREEN for every route. **Not independently RED-able, recorded as such
      instead of claiming a RED**: while B.2 is broken the focus never enters the dialog, so the pre-fix
      probe reports the trigger by accident and the assertion passes for the wrong reason. The real proof
      needs focus to be inside the dialog first, which only exists once B.2 is fixed: assist via backdrop
      (`activeElement` = `#btnAssist`) and download via `Escape` from `#btnCancelDownload`
      (`activeElement` = `#btnDownloadMd`). `open()` captures `lastFocus = trigger || document.activeElement`
      and `close()` restores it; `downloadModal.open(evt)` normalises `evt.currentTarget` because
      `js/convert-panel.js:240` passes the `MouseEvent` directly as the first argument.
      `#btnGoConvert` deliberately does NOT restore focus — it navigates: it closes the dialog and focuses
      `#htmlInput` (the destination), not the trigger.
- [x] B.5 **Replace native blocking dialogs with inline messages.** In `js/assist-panel.js`, replace the
      four `alert()` calls (`:65`, `:89`, `:96`, `:101`) with the existing inline `showMessage()` surface.
      Update the harness: `tests/url-scheme-safety.test.js` stubs `global.alert` at `:24` and asserts on it
      at `:122`, `:149`, `:160` — repoint those three assertions at the inline message.
      RED first: the repointed assertions FAIL against the current implementation. GREEN: the swap.
      (spec: `assist-guide` / Non-blocking inline feedback — both scenarios)
      NOTE: this is a DELIBERATE behaviour change, not an incidental one.
      Done: RED observed TWICE — headless (`4 ok, 7 fallos`, exit=1; the 7 failures are exactly the
      inline-message assertions) and in-browser (`inlineMessageRendered=false` while the native `alert()`
      WAS invoked with "Introduce una URL http:// o https:// válida."). GREEN: the four `alert()` calls now
      route through `showMessage('warn', ...)`; suite back to 11 ok / 63 total, and
      `assert.deepStrictEqual(alerts, [], 'no debe usar alert() nativo')` guards the regression.
      Harness needed new stubs to see inline output at all: `document.createElement` → `created`,
      `document.addEventListener` → `docHandlers`, `document.activeElement`, `makeEl.insertBefore`
      accumulating into `e.inserted`, plus `resetLogs()` / `inlineMessages()` helpers.
      Deliberately untouched: the two native `confirm()` calls in `js/convert-panel.js:60,:107` — the
      `assist-guide` requirement scopes blocking-dialog removal to the assist panel, and expanding it here
      would widen the change without a spec or a test.

## Phase C: Performance

- [x] C.1 **Debounce the format badge.** Add a small local debounce (~150 ms) at the badge wiring in
      `js/convert-panel.js:154-157` so `updateFormatBadge` → `extractOriginUrl`
      (`js/site-detector.js:159`, `:148`) stops running four whole-document regexes per keystroke over up
      to 3 MB (`js/convert-panel.js:106`). Keep it a local helper — do NOT widen `Vitale.utils` for this.
      (spec: `assist-guide` unaffected; perf goal from `proposal.md` Phase C)
      Test: `browser` — wrap `Vitale.siteDetector.updateFormatBadge` with a counter, dispatch N rapid
      `input` events on the textarea, assert the counter is 1 (not N); then assert the badge still updates
      after the delay.
      Done: implemented as a **local** debounce in `js/convert-panel.js` (`scheduleBadgeUpdate()` +
      `badgeTimer` + `BADGE_DELAY_MS = 150`); `Vitale.utils` untouched, as required. **Line drift vs the
      plan**: the badge wiring is at `js/convert-panel.js:160-163`, not `:154-157`; `extractOriginUrl` is
      DEFINED at `js/site-detector.js:16-39` (the plan's `:148` is actually a line inside
      `updateFormatBadge`) and does exactly **4 whole-document regex passes** — Snapshot-Content-Location
      (`:19`), `Content-Location` with the `gi` flag (`:22`), canonical (`:28`), og:url (`:33`) — plus a
      separate `Vitale.mhtml.looksLikeMHTML(raw)` scan at `:146`. The "four regexes" claim was verified in
      the source, not assumed.
      **RED observed in-browser BEFORE the fix** (input 4.62 MB): 10 `input` events → **10 synchronous
      calls**, `callsAfterWait=10` (no deferral at all), blocked main thread **163.5 ms** for 10 keystrokes
      (~16 ms each — the "long task" threshold), unit badge cost measured at **8.6 ms**.
      **GREEN**: same 4.62 MB, 10 events → `callsRightAfterBurst=0`, `callsAfterWait=1`, burst **2.2 ms**
      (74× less). `#inputCounter` stays immediate (`4.620.178 caracteres`, as designed — it is O(1));
      `#formatBadge` resolves `📄 HTML` and `#siteBadge` resolves `🌐 Royal Road`.
      **Honest gap**: no headless coverage — `js/convert-panel.js` is not loaded by any suite (its
      `setup()` needs a real DOM), so this is verified in-browser only, which is the plan's chosen
      verification. A future regression in the debounce will NOT be caught by CI.
- [x] C.2 Confirm no regression on a large paste: `browser` — paste ~3 MB, type, assert the badge still
      resolves and no long task blocks the input. Report observed timing.
      Done: 1.16 MB input, 8 keystrokes 30 ms apart (deliberately below the 150 ms delay) →
      `callsDuringTyping=0`, `callsAfterStop=1`; `#formatBadge` and `#siteBadge` still resolve
      (`📄 HTML` / `🌐 Royal Road`). Max synchronous `input` handling observed: **21.7 ms**, once, on the
      probe's own `ta.value = <1.16 MB>` re-assignment — NOT on `updateFormatBadge`, which ran zero times
      during typing. A real keystroke never goes through that JS `value` setter, so that spike is a
      measurement artifact; the part this change controls (the 4 regex passes) contributes **0 ms** while
      typing and a single **~8.6 ms** call after the delay stops.
      Note: no `PerformanceObserver`/`longtask` numbers are reported — that probe timed out the browser
      bridge, so timings above are direct synchronous measurements instead of observer entries.
      **Not measured** (out of scope, would require a profiler): whether `looksLikeMHTML` and the `gi`
      array allocation at `js/site-detector.js:22` are themselves worth optimizing inside the single
      deferred call. One 8.6 ms call per pause is acceptable; optimizing further is unrequested.

## Phase D: Cleanup (last — independently rejectable)

- [x] D.1 **Single definition of the platform instructions.** Collapse `js/platform.js:32-58` and
      `js/assist-panel.js:75-90` into one definition rendered by both; diff the two variants first so no
      platform-specific step is lost. (spec: `assist-guide` / Single definition of platform instructions)
      Test: `browser` — both surfaces render the shared definition; assert step text equality.
      Done: the plan's cited lines were WRONG — `js/assist-panel.js:75-90` are event listeners, not a
      second copy of the steps. The real duplicate was the `1️⃣2️⃣3️⃣` per-platform block inside the
      copy-success message (`js/assist-panel.js:90-105`), which restated what `renderAssistSteps()`
      already renders right below in `#assistSteps`. Resolved by **deletion**, not unification: the
      message is now a short confirmation (`📋 URL copiada al portapapeles. Seguí los pasos de abajo.`)
      and the five steps stay defined once in `js/platform.js:33-60`. Confirmed the deleted text was a
      lossy subset of the steps (android "Menú ⋮ → Descargar página" ⊂ step 3; iOS "Compartir → Guardar
      en Archivos" ⊂ step 3; desktop 3 lines ⊂ steps 2–4), so no information is lost.
      `Vitale.platform.PLATFORM` is still used at `js/assist-panel.js:123` (android open-blocked warning)
      — untouched. **Honest spec gap**: the requirement's "the upload card MUST render that same
      definition" is satisfiable only via Req. 2 (upload-card copy) — the upload card renders a prompt,
      not the step list — recorded instead of faked. Verified in-browser: `copyMsgText` = "📋 URL copiada
      al portapapeles. Seguí los pasos de abajo."; `#assistSteps` still shows the 5 desktop steps.
      Visible copy change — deliberate.
- [x] D.2 **Single source for the upload-card copy.** Collapse the duplicated literal
      `js/platform.js:25` ↔ `js/convert-panel.js:33`. (spec: `assist-guide` / Upload-card copy from one
      source) Test: `suite`/grep — no literal duplicate remains; rendered copy unchanged.
      Done: added `uploadCopy()` (single source returning `{title, sub}`) and `renderUploadCard()` to
      `js/platform.js`; `renderBadge()` now always calls `renderUploadCard()`, and `resetCard()` in
      `js/convert-panel.js` delegates to it. The duplicated mobile+desktop literal block in `resetCard()`
      is gone. Safe because `index.html:63,65` already ships the desktop copy identical to the literal,
      so the always-render path is a no-op on desktop. `markLoaded()` ("Archivo cargado") stays in
      convert-panel — it is a third state, not the placeholder copy. `renderUploadCard` added to the
      module's `return`. Verified in-browser: rendered `uploadTitleHTML`/`uploadSubText` byte-identical to
      the pre-change golden; `platformExportKeys` now includes `renderUploadCard`.
- [x] D.3 **Collapse `prepareHTML` branches.** `js/site-detector.js:85-135` computes the same fields in two
      near-identical MHTML/non-MHTML branches. Test: `suite` (existing coverage green; `node --check`).
      Done: `prepareHTML` now resolves `sourceHtml`/`wasMHTML`/`parts` once, then runs a single common
      path for `originUrl`/`siteKey`/`extractMainContent`/`wasFiltered`; only the `info` string stays
      branch-dependent (MHTML always builds it, non-MHTML returns `null` when nothing was filtered).
      Equivalence: `originalLen` ≡ `sourceHtml.length` in both old branches, so reported lengths are
      unchanged. Verified in-browser against the pre-change golden: all cases — MHTML unfiltered
      (royalroad), plain unfiltered, site-selector (fanfiction), generic, and MHTML filtered — produced
      identical `htmlLen`/`wasFiltered`/`siteKey`/`method`/`info`.
- [x] D.4 **Deduplicate `wasFiltered`.** Computed twice with the same predicate:
      `js/extractors/base.js:115-116` and `js/site-detector.js:96`. Test: `suite`.
      Done: `extractMainContent` (`js/extractors/base.js`) now returns `filtered` on every exit
      (site-selector, generic, and the empty-input guard), computing it once inside; `site-detector.js`
      consumes `result.filtered` instead of recomputing `result.html.length < originalLen`. Confirmed
      `extractMainContent` is only called from `js/site-detector.js` and no suite asserts its shape
      (grep: 0 test references). Return shape grew by one key: `['html','method','filtered']`.
- [x] D.5 **Prune unused exports.** Remove `decodeBase64` (`js/core/mhtml-parser.js:59,131`) and
      `MIN_CONTENT_LENGTH` (`js/extractors/base.js:12,119`) — no external consumer. (Keep them only if a
      consumer + test is added instead.) Test: `suite` — no test references them; suite green.
      Done: the plan was WRONG and would have introduced a bug — `decodeBase64` is used INTERNALLY at
      `js/core/mhtml-parser.js:115` (`if(encoding === 'base64') body = decodeBase64(body, charset)`), so
      deleting the function breaks base64 MHTML decoding. Removed only its **export** from the return
      list; the function stays. `MIN_CONTENT_LENGTH` is kept exported: it has an internal consumer
      (`base.js:37`) AND a test consumer (`tests/extractor-reachability.test.js`), satisfying the task's
      own escape clause ("keep them if a consumer + test is added instead"). `decodeQuotedPrintable`
      still exported (out of scope). Verified in-browser: `mhtmlExportKeys` =
      `[looksLikeMHTML, decodeQuotedPrintable, extractHtmlFromMHTML]`. `docs/mhtml-y-charsets.md`
      describes the *encoding algorithm*, which is unchanged, so no doc edit was needed.
- [x] D.6 **CSS dedupe + stale index.** Collapse the repeated gradient-text recipe (`styles.css:93-100`,
      `:357-362`, `:390-395`); fix the section-5 label "Pestañas" at `styles.css:9` to match
      "PANEL PRINCIPAL" (`styles.css:161`). Test: `browser` — visual check at 390 px and 900 px; grep the
      section-5 label.
      Done: added one grouped rule declaring the three shared declarations (`background-clip:text;
      -webkit-background-clip:text; -webkit-text-fill-color:transparent`) for `.brand-text h1,
      .upload-title .hl, .upload-card.loaded .upload-title .hl`, and stripped those declarations from the
      three original rules, leaving each just its own gradient. **Deliberate correction found during
      verification**: the consumers must use `background-image` (longhand), NOT the `background`
      shorthand — the shorthand resets `background-clip` to `border-box`, and because the grouped rule
      sits earlier in the file the later shorthand won, regressing the gradient text to a solid box.
      A/B-verified against pre-change `styles.css` (via `git stash`): original computed
      `background-clip:text`; shorthand version computed `border-box`; `background-image` restored
      `text`. Final computed values identical to the original golden for all three (same
      `backgroundImage`, `clip:text`, `webkitTextFillColor: transparent`). **Adjacent 1-line fix**: the
      section index was stale on TWO lines, not one — `styles.css:9` ("5. Pestañas" → real
      "5. PANEL PRINCIPAL") and `:10` ("6. Inputs y textarea" → real "6. LAYOUT Y CAMPOS DE TEXTO"); both
      corrected. No HTML touched (avoids adding the class in JS strings that emit `<span class="hl">`).
      Note: the visual screenshot at 390 px / 900 px could not be reviewed (the model cannot read
      images); equivalence rests on computed-style equality, stronger for this recipe.

## Phase E: Verification and docs

- [x] E.1 Full suite: `suite` — baseline 57 passing plus the new tests; none removed.
      Done: 6 suites green, 0 failures. Assertion counts — `extractor-reachability` 5,
      `generic-semantic` 8, `mhtml-charset` 11, `prototype-safety` 15, `url-scheme-safety` 11,
      `utils-hardening` 13 = **63** (the 57→63 jump is entirely the tests added in Phase A). No suite
      removed or skipped. `node --check` clean on all six JS files touched by this change.
- [x] E.2 Browser checklist: every `modal-accessibility` scenario, the `assist-guide` inline-message
      scenarios, the badge debounce, and the deduplicated instructions render.
      Done: one Puppeteer pass over `file:///.../index.html` confirmed — (a) instructions render once:
      `#assistSteps` holds exactly 5 steps; (b) assist modal `role="dialog"`, `aria-modal="true"`,
      `aria-labelledby="assistModalTitle"` (resolves to the title); opening moves focus into the dialog
      (`#assistUrl`), Escape closes and restores focus to the trigger; (c) download modal same roles with
      `aria-labelledby="downloadModalTitle"`; opening focuses `#filenameInput`, Escape closes and restores
      focus to the (enabled) trigger — both by direct call and through the `{currentTarget}` event path
      wired in `convert-panel.js`; (d) copy success renders an inline `.assist-dynamic` element
      (class `alert alert-ok show`) with text "📋 URL copiada al portapapeles. Seguí los pasos de abajo."
      while `window.alert` was never called (counter 0); (e) badge debounce — 10 `input` events give 0
      immediate `updateFormatBadge` calls, 0.9 ms blocked, and exactly 1 call after the 150 ms window;
      (f) `#convertAlert` has `role="status"` + `aria-live="polite"`.
      **Honest notes**: focus restore is a no-op when the trigger is `disabled` (a disabled element cannot
      take focus) — observed while probing the download button before a conversion; not a defect in real
      use (the user clicks an enabled button), recorded, not coded around. The visual screenshot check was
      not reviewable (the model cannot read images); equivalence rests on computed styles and DOM
      assertions.
- [x] E.3 `README.md` "Limitaciones conocidas": the review found the table does NOT cover these findings;
      record what this change resolves. Also fix the stale reference at `docs/limitaciones.md:40`
      (`assist-panel.js:62`).
      Done: the backlog table in `docs/limitaciones.md` (the page README links as "Limitaciones y
      backlog") now records what this change resolved as rows **15–18** — modal a11y, badge hot-path,
      `alertMsg` null guard + unreachable extractor step, and duplication/dead exports — with a note that
      they are new findings from `harden-conversion-flow`, not a re-open of the original audit. Fixed the
      stale reference `docs/limitaciones.md:40`: `assist-panel.js:62` → `assist-panel.js:104` (the current
      `window.open` sink; `safeUrl` now lives at `:55`).
- [x] E.4 Confirm untouched: `old/v1/`, `old/v2/`, `js/mdream-loader.js`, and the `conversion-engine-loading`
      spec. Test: `git diff --stat` shows none of them; `Vitale.mdream` surface still
      `{load, isLoaded, convert}`.
      Done: `git diff --stat main..HEAD` reports no changes under `old/v1/`, `old/v2/`,
      `js/mdream-loader.js`, or the `conversion-engine-loading` spec. `js/mdream-loader.js:71` still
      returns `{ load, isLoaded, convert }`, confirmed at runtime: `Vitale.mdream` keys =
      `["load","isLoaded","convert"]`.
