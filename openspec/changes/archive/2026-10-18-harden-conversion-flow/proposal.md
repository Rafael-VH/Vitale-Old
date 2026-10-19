# Proposal: harden-conversion-flow

## Intent

A full-tree code review of the live code (2026-10-16) surfaced defects across four concerns that the
README "Limitaciones conocidas" table does **not** cover — they are new findings, not a re-open of a
listed bug. Left unaddressed they produce: a keyboard-inaccessible modal (`Esc` does not close it after
opening via the button), an extractor step that is dead code while claiming to run, a `TypeError` trap in
a shared helper, a whole-document re-scan on every keystroke, and dialog markup with **zero**
accessibility semantics. Separately, the SDD tooling for this repo is stale: it records "no test runner"
while five suites exist.

This change hardens the conversion flow: fix the real defects, make the modals accessible and
non-blocking, remove the per-keystroke cost, collapse the duplication the review found, and correct the
SDD capability record so future phases plan against reality.

## Scope

### In Scope

Phases are cut by **testability**, not by theme, so that no file is edited twice across phases.

**Phase 0 — SDD tooling (first; unblocks test-first)**
- Refresh `openspec/config.yaml`: real runner + `strict_tdd: true`.
- Correct the Engram `sdd-init/{project}` and `sdd/{project}/testing-capabilities` records.

**Phase A — Pure logic (test-first, headless, no browser needed)**
- `alertMsg`: add the missing null guard (`js/core/utils.js:33-35`), matching `clearAlert`.
- Fanfiction: resolve the unreachable `custom` step (`js/extractors/fanfiction.js:13`) so no declared
  extractor step is dead code. **Decision rule:** confirm against a real FFN fixture that the selector
  output is residue-free; if it is, delete the `custom` step and its false comment; if residue is
  observed, keep it and give it reach (make it the priority path for that site).
- MHTML parser: remove the always-true `if (boundary)` guard (`js/core/mhtml-parser.js:124`).

**Phase B — Modal behaviour + accessibility (needs a browser check)**
- `Esc` MUST close the open dialog, **including** the assist modal opened from its trigger button
  (focus must enter the dialog on open, mirroring `js/download-modal.js:55`).
- Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby` to `#downloadModal` and `#assistModal`.
- Return focus to the trigger on close.
- Add a live region to `#convertAlert` (`role="status"`, `aria-live="polite"`).
- Replace the four **native blocking** `alert()` calls (`js/assist-panel.js:65,89,96,101`) with the
  existing inline `showMessage()` surface, and update the three assertions that stub `global.alert`
  (`tests/url-scheme-safety.test.js:24`, `:122`, `:149`, `:160`) to assert on the inline message instead.

**Phase C — Performance**
- Debounce the format badge so `updateFormatBadge`/`extractOriginUrl` no longer runs four regexes over up
  to 3 MB of input on every keystroke.

**Phase D — Cleanup (last; independently rejectable)**
- Single source of truth for the platform "how to get the HTML" instructions and the upload-card copy.
- Collapse the two near-identical `prepareHTML` branches and the duplicated `wasFiltered` computation.
- Drop the unused `decodeBase64` and `MIN_CONTENT_LENGTH` exports (or give them a consumer + test).
- Deduplicate the repeated gradient-text CSS recipe; fix the stale stylesheet index label.

### Out of Scope
- **`_alertTimer` shared-timer refactor** (`js/core/utils.js:26`). Latent only; every current call site
  uses one alert box. No live bug. Revisit only when a second alert box appears.
- **`allDomains()` memoization** (`js/extractors/registry.js:44`). Noise at 9 extractors.
- **`setDownloadEnabled` decoupling** (`js/core/utils.js:138-140`). Would touch 9 call sites for a string.
- Any change to `old/v1/`, `old/v2/` (frozen samples).
- Vendoring the mdream engine (already deferred by the previous change).
- The `design` phase: **skipped deliberately**. No architectural decision remains — the repo contract
  (one IIFE, one `Vitale.*` key, no new files, no build) already dictates the implementation, and a
  `design.md` would only restate this proposal.

## Capabilities

### New Capabilities
- `modal-accessibility`: dialog semantics, focus entry/restoration, Escape dismissal, and status
  announcements shared by all modals.
- `assist-guide`: the URL assist modal — single-sourced platform instructions and non-blocking inline
  messaging.
- `html-extraction`: the per-site extractor cascade (selectors → custom → generic), its content
  threshold, and the no-dead-step contract.
- `core-utilities`: shared helpers (`esc`, `alertMsg`/`clearAlert`) and their null-safety contract.

### Modified Capabilities
- `conversion-engine-loading`: **untouched.** The engine loader is not modified and its spec stands.

## Approach

One change, five phases (0, A, B, C, D), each an independent, revertible work-unit commit:

- **0 → A → B → C → D**, ordered so that the tooling that enables test-first lands before the first
  fix, pure-logic fixes (highest certainty) come next, then the behaviour/accessibility work, then the
  cheap perf win, and the cleanup churn last so a reviewer can reject it alone.
- Each phase leaves the full suite green. Phase A is written test-first: a failing test, then the fix.
- Phase B is validated in a browser as well as by suite, because focus and screen-reader behaviour is not
  observable headlessly.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `js/core/utils.js` | Modified | `alertMsg` null guard |
| `js/extractors/fanfiction.js` | Modified | Resolve the dead `custom` step |
| `js/core/mhtml-parser.js` | Modified | Remove dead guard / unused export |
| `js/assist-panel.js` | Modified | Focus entry, `alert()` → inline message |
| `js/download-modal.js` | Modified | Focus entry, role wiring |
| `index.html` | Modified | Roles, `aria-modal`, `aria-labelledby`, live region |
| `js/site-detector.js` | Modified | Badge debounce, branch collapse |
| `js/convert-panel.js` | Modified | Shared copy, `input` wiring |
| `js/platform.js` | Modified | Single source for instructions + copy |
| `js/extractors/base.js` | Modified | Duplicate `wasFiltered`, unused export |
| `styles.css` | Modified | CSS dedupe, index label fix |
| `tests/url-scheme-safety.test.js` | Modified | Assert inline message instead of `global.alert` |
| `tests/*.test.js` | New/Modified | Regression tests per fix |
| `openspec/config.yaml` | Modified | Testing capabilities, `strict_tdd: true` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fanfiction: deleting `custom` drops an intended cleanup | Med | FFN fixture check; if residue is present, keep it and give it reach instead of deleting |
| Focus/`Tab` changes regress the `c262e92` modal | Med | Browser checklist in phase B; full suite after every phase |
| `alert()` → inline message changes what the scheme-guard tests assert | High (intended) | Tests assert the new inline surface; the behaviour change is deliberate, not incidental |
| Deduplicating platform instructions loses a platform-specific step | Med | Diff both current variants before collapsing; assert rendered output in a test |
| Debounce delays the badge and feels laggy | Low | 150 ms; verify by typing in a 3 MB paste |
| Cleanup phase rejected by reviewer | Low | Isolated in its own commit; revertible alone |
| `strict_tdd` flip changes how later phases are planned | Low | Intentional and correct — a runner exists |

## Rollback Plan

Each phase is its own commit on the feature branch. Revert any single phase with `git revert <sha>`
without affecting the others. No data, schema, or storage changes. `window.Vitale` public surfaces
(`mdream`, `extractors`, `utils`, panel APIs) keep their existing shape; only the unused
`decodeBase64`/`MIN_CONTENT_LENGTH` exports may be removed and neither has a consumer.

## Dependencies

- None external. No new runtime dependency, no build step, no new local file beyond tests and this
  change's artifacts.
- Node available for the test suite (already used today).

## Success Criteria

- [ ] Phase 0: `openspec/config.yaml` reports the real runner and `strict_tdd: true`; Engram `sdd-init`
      record corrected.
- [ ] Full suite green (baseline 57 passing, plus new regression tests — none silently removed).
- [ ] Phase A: no declared extractor step is unreachable; `alertMsg` does not throw on an absent target.
- [ ] Phase B: `Esc` closes the assist modal after opening it via its trigger button, with no mouse click.
- [ ] Phase B: grep for `role=`/`aria-` in `index.html` returns the new dialog and live-region attributes
      (was 0).
- [ ] Phase B: no native `alert()` remains in `js/assist-panel.js`; the scheme-guard suite passes against
      the inline message surface.
- [ ] Phase C: typing in a 3 MB paste no longer runs `extractOriginUrl` per keystroke.
- [ ] Phase D: platform instructions and upload copy exist in exactly one place.
- [ ] `old/v1`, `old/v2`, and the mdream loader are untouched.
