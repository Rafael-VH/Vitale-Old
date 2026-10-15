# Tasks: Pin MDream Engine Version

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 30–50 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (not needed) |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Pin engine + fallback in `js/mdream-loader.js`, sync README bug #1 | PR 1 | Single self-contained unit; manual browser verification included |

## Phase 1: Foundation (pinned source list)

- [x] 1.1 In `js/mdream-loader.js`, replace the single `import('https://cdn.jsdelivr.net/npm/@mdream/js@latest/+esm')` with a module-private ordered `SOURCES` array: jsDelivr `@2.0.3/+esm` first, esm.sh `@2.0.3` second. Test: no `@latest` string remains in the file.

## Phase 2: Core Implementation (ordered load loop)

- [x] 2.1 In `js/mdream-loader.js`, iterate `SOURCES` in a `try/catch`, validating `typeof core.htmlToMarkdown === 'function'` on each attempt and returning on the first pass. Test: each failed source falls through to the next, no uncaught exception.
- [x] 2.2 On total failure, set the existing error state on `#statusDot`/`#statusText` and keep `convert()` rejecting with its descriptive error when not loaded. Test: all sources blocked → UI shows error, no crash.

## Phase 3: Contract & UI wiring

- [x] 3.1 Verify the exported contract is still exactly `{ load, isLoaded, convert }` and `index.html` / `js/convert-panel.js` need no change. Test: `window.Vitale.mdream` surface unchanged.

## Phase 4: Verification (manual — no test runner)

- [x] 4.1 Happy path: load app with network open → `#statusText` = "Vitale listo", conversion works. (spec: Ready UI state / Pinned version)
- [x] 4.2 Fallback path: block jsDelivr (DevTools request blocking) → loads via esm.sh fallback. (spec: Primary fails, secondary succeeds)
- [x] 4.3 Failure path: block both hosts → clear non-crashing error UI, `convert()` rejects. (spec: All sources fail)
- [x] 4.4 Confirm requests go to `@2.0.3`, never `@latest`. (spec: Load uses pinned version only)

## Phase 5: Documentation

- [x] 5.1 In `README.md`, mark bug #1 (CDN unpinned `@latest`) as resolved by this change and note the pinned version + fallback.

---

## Apply Evidence (2026-10-15)

Verified in a real browser via Puppeteer against `file:///C:/.../index.html`:

| Check | Method | Result |
|-------|--------|--------|
| Happy path (S: Ready UI / Pinned) | load page, wait for status | `statusText`="Vitale listo", `dot.className`="status-dot ready" |
| Pinned request (S: Load uses pinned version only) | `performance.getEntriesByType('resource')` | only `https://cdn.jsdelivr.net/npm/@mdream/js@2.0.3/+esm`; no `@latest` |
| Fallback (S: Primary fails, secondary succeeds) | SOURCES[0] → invalid host, reload | loaded via `https://esm.sh/@mdream/js@2.0.3`, `isLoaded`=true |
| Total failure (S: All sources fail) | SOURCES both invalid, reload | `statusText`="❌ Error al cargar: no se pudo cargar el motor desde ninguna fuente", dot loading cleared, no uncaught error |
| convert() before/without load (S: convert before load) | call `convert()` in total-failure state | throws "El motor aún se está cargando. Espera 1-2 segundos." |
| Contract (S: Contract surface unchanged) | `Object.keys(Vitale.mdream)` | `["load","isLoaded","convert"]` |
| Conversion works (happy) | `convert('<h1>Ok</h1>')` | `"# Ok"` |
| Syntax | `node --check js/mdream-loader.js` | OK |

Temporary edits used to exercise fallback/failure branches were reverted; final `SOURCES` = pinned jsDelivr `@2.0.3` + esm.sh `@2.0.3`.
