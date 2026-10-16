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

- [ ] B.1 **Dialog semantics + live region (markup).** In `index.html`: add `role="dialog"`,
      `aria-modal="true"`, `aria-labelledby` to `#downloadModal` (`:130`) and `#assistModal` (`:154`);
      add `role="status"` and `aria-live="polite"` to `#convertAlert` (`:95`).
      (spec: `modal-accessibility` / Dialog semantics + Status announcements)
      Test: `browser` — each dialog exposes the three dialog attributes; `#convertAlert` exposes the live
      region. Grep for `role=`/`aria-` in `index.html` no longer returns 0.
- [ ] B.2 **Focus entry on open.** RED: `browser` check — focus `#btnAssist`, activate it, assert
      `document.activeElement` is inside `#assistModal`; currently FAILS (focus stays on the trigger).
      GREEN: move focus into the dialog on open in `js/assist-panel.js` (mirror `js/download-modal.js:55`).
      (spec: `modal-accessibility` / Focus entry on open — incl. pointer-open scenario)
- [ ] B.3 **Escape dismissal.** RED: `browser` check — open `#assistModal` via `#btnAssist` with NO click
      inside, press `Escape`, assert the modal is hidden; currently FAILS (the `keydown` listener is on the
      modal at `js/assist-panel.js:60`, so the event never arrives). GREEN: attach/route the dismissal so it
      works regardless of where focus was when the dialog opened. Repeat the check for `#downloadModal`.
      (spec: `modal-accessibility` / Escape dismissal — both scenarios)
- [ ] B.4 **Focus restoration on close.** `browser` check for each close route (button, `Escape`, backdrop):
      assert `document.activeElement` is the trigger button afterwards. Wire in `js/assist-panel.js` /
      `js/download-modal.js`. (spec: `modal-accessibility` / Focus restoration on close)
- [ ] B.5 **Replace native blocking dialogs with inline messages.** In `js/assist-panel.js`, replace the
      four `alert()` calls (`:65`, `:89`, `:96`, `:101`) with the existing inline `showMessage()` surface.
      Update the harness: `tests/url-scheme-safety.test.js` stubs `global.alert` at `:24` and asserts on it
      at `:122`, `:149`, `:160` — repoint those three assertions at the inline message.
      RED first: the repointed assertions FAIL against the current implementation. GREEN: the swap.
      (spec: `assist-guide` / Non-blocking inline feedback — both scenarios)
      NOTE: this is a DELIBERATE behaviour change, not an incidental one.

## Phase C: Performance

- [ ] C.1 **Debounce the format badge.** Add a small local debounce (~150 ms) at the badge wiring in
      `js/convert-panel.js:154-157` so `updateFormatBadge` → `extractOriginUrl`
      (`js/site-detector.js:159`, `:148`) stops running four whole-document regexes per keystroke over up
      to 3 MB (`js/convert-panel.js:106`). Keep it a local helper — do NOT widen `Vitale.utils` for this.
      (spec: `assist-guide` unaffected; perf goal from `proposal.md` Phase C)
      Test: `browser` — wrap `Vitale.siteDetector.updateFormatBadge` with a counter, dispatch N rapid
      `input` events on the textarea, assert the counter is 1 (not N); then assert the badge still updates
      after the delay.
- [ ] C.2 Confirm no regression on a large paste: `browser` — paste ~3 MB, type, assert the badge still
      resolves and no long task blocks the input. Report observed timing.

## Phase D: Cleanup (last — independently rejectable)

- [ ] D.1 **Single definition of the platform instructions.** Collapse `js/platform.js:32-58` and
      `js/assist-panel.js:75-90` into one definition rendered by both; diff the two variants first so no
      platform-specific step is lost. (spec: `assist-guide` / Single definition of platform instructions)
      Test: `browser` — both surfaces render the shared definition; assert step text equality.
- [ ] D.2 **Single source for the upload-card copy.** Collapse the duplicated literal
      `js/platform.js:25` ↔ `js/convert-panel.js:33`. (spec: `assist-guide` / Upload-card copy from one
      source) Test: `suite`/grep — no literal duplicate remains; rendered copy unchanged.
- [ ] D.3 **Collapse `prepareHTML` branches.** `js/site-detector.js:85-135` computes the same fields in two
      near-identical MHTML/non-MHTML branches. Test: `suite` (existing coverage green; `node --check`).
- [ ] D.4 **Deduplicate `wasFiltered`.** Computed twice with the same predicate:
      `js/extractors/base.js:115-116` and `js/site-detector.js:96`. Test: `suite`.
- [ ] D.5 **Prune unused exports.** Remove `decodeBase64` (`js/core/mhtml-parser.js:59,131`) and
      `MIN_CONTENT_LENGTH` (`js/extractors/base.js:12,119`) — no external consumer. (Keep them only if a
      consumer + test is added instead.) Test: `suite` — no test references them; suite green.
- [ ] D.6 **CSS dedupe + stale index.** Collapse the repeated gradient-text recipe (`styles.css:93-100`,
      `:357-362`, `:390-395`); fix the section-5 label "Pestañas" at `styles.css:9` to match
      "PANEL PRINCIPAL" (`styles.css:161`). Test: `browser` — visual check at 390 px and 900 px; grep the
      section-5 label.

## Phase E: Verification and docs

- [ ] E.1 Full suite: `suite` — baseline 57 passing plus the new tests; none removed.
- [ ] E.2 Browser checklist: every `modal-accessibility` scenario, the `assist-guide` inline-message
      scenarios, the badge debounce, and the deduplicated instructions render.
- [ ] E.3 `README.md` "Limitaciones conocidas": the review found the table does NOT cover these findings;
      record what this change resolves. Also fix the stale reference at `docs/limitaciones.md:40`
      (`assist-panel.js:62`).
- [ ] E.4 Confirm untouched: `old/v1/`, `old/v2/`, `js/mdream-loader.js`, and the `conversion-engine-loading`
      spec. Test: `git diff --stat` shows none of them; `Vitale.mdream` surface still
      `{load, isLoaded, convert}`.
