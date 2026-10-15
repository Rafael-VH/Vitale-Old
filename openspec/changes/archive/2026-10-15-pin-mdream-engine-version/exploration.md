# Exploration: pin-mdream-engine-version

> SDD explore artifact. Maps to README "Limitaciones conocidas" bug **#1 (CRÍTICA)**.
> Persistence: hybrid (this file + Engram `sdd/pin-mdream-engine-version/explore`).

## Current State

`js/mdream-loader.js` is a single IIFE that assigns `Vitale.mdream`, exposing three functions:

- `load()` — async. Grabs `#statusDot` / `#statusText`, adds the `loading` class, then
  `await import('https://cdn.jsdelivr.net/npm/@mdream/js@latest/+esm')`. On success it stores
  `core.htmlToMarkdown` in a closure variable, validates it is a function, sets `loaded = true`,
  and paints the dot `ready` + text "Vitale listo". On any throw it removes `loading` and writes
  `'❌ Error al cargar: ' + err.message` into `#statusText`.
- `isLoaded()` — returns the closure `loaded` flag.
- `convert(html)` — throws if `!loaded`, throws on empty input, calls `htmlToMarkdown(html)`,
  validates the result shape (string or `{ markdown }`), else throws a descriptive error.

Wiring / consumers:
- `js/main.js:42` calls `Vitale.mdream.load()` once at bootstrap (fire-and-forget, non-blocking).
- `js/convert-panel.js:98` guards with `Vitale.mdream.isLoaded()` → if false, shows a warn alert
  "⏳ El motor aún se está cargando…". `convert-panel.js:121` calls `Vitale.mdream.convert()`.

How a failure surfaces today: the app never crashes at load time (the `import()` is awaited inside
a try/catch), so a dead CDN produces a **soft, silent-ish failure** — dot never turns green, status
text shows a raw browser error string, and the Convert action is permanently stuck on the
"motor cargando" warning. There is no retry, no fallback host, no offline guidance, and the
"listo" state is unreachable. There is also no offline path at all: the engine is fetched on every
page load and never cached by design.

The `@latest` tag additionally means the app silently adopts whatever the publisher ships next —
including a breaking major or a bad release — with no way for the app author to test against it.

## Verified Facts (evidence gathered this phase)

- **Current latest `@mdream/js` = `2.0.3`** (npm registry `dist-tags.latest`, checked 2026-10-14).
  The package is ESM-only (`"type": "module"`, `main: ./dist/index.mjs`), MIT, single maintainer
  (`harlan_zw`), ~6.8k weekly downloads, published with SLSA provenance via GitHub Actions OIDC.
- **The package follows semver.** It has already shipped a major bump (1.x → 2.0.x), so major
  versions can break. Pinning to `2.0.3` therefore equals **exactly what `@latest` resolves to
  today** → the pin is a pure risk-reduction change with zero behavior change on day one.
- **`https://cdn.jsdelivr.net/npm/@mdream/js@2.0.3/+esm` returns HTTP 200** and the bundle exports
  `htmlToMarkdown` (confirmed by reading the tail: `... no as htmlToMarkdown ...`). The loader's
  expected export name is unchanged in 2.0.x.
- **SRI is impossible on `/+esm`.** The jsDelivr-generated bundle literally carries the header:
  *"Do NOT use SRI with dynamically generated files!"* The `+esm` endpoint is transpiled/bundled
  server-side per request and is **not byte-stable**, even for a pinned version. Separately, the
  platform constraint: **dynamic `import()` has no `integrity` option** (import attributes only
  support `type`), so the browser will not enforce SRI on a runtime import regardless of endpoint.
- **Raw file alternative is byte-stable:** `https://cdn.jsdelivr.net/npm/@mdream/js@2.0.3/dist/index.mjs`
  returns 200 and is immutable for a pinned version — but it is only 340 bytes and re-exports from
  relative `./_chunks/*.mjs` (multiple extra requests). Still not SRI-enforceable through
  `import()`.
- **Fallback hosts are reachable:** `https://unpkg.com/@mdream/js@2.0.3/dist/index.mjs` → 200;
  `https://esm.sh/@mdream/js@2.0.3` → 200. Both can serve a pinned engine as a secondary source.

## Affected Areas

- `js/mdream-loader.js` — **the only required code change**. Replace the single `@latest` URL with
  a pinned version and (recommended) a small ordered fallback list + friendlier offline message.
- `index.html` — **no change required.** The loader already owns `#statusDot`/`#statusText`
  mutations; the initial text "Cargando motor…" stays valid.
- `README.md` — **optional doc sync** only: flip bug #1 row / tick the "Siguientes pasos" checkbox.
  Not part of the functional fix.
- `js/main.js`, `js/convert-panel.js` — **untouched.** They depend only on the `Vitale.mdream`
  public API (`load`/`isLoaded`/`convert`), which does not change.

## Approaches

1. **Pin exact version on jsDelivr `/+esm` only** — one-line change:
   `import('https://cdn.jsdelivr.net/npm/@mdream/js@2.0.3/+esm')`.
   - Pros: smallest possible diff; identical runtime behavior; removes the `@latest` supply risk.
   - Cons: still a single point of failure — a jsDelivr outage or an offline user leaves the app
     dead; SRI still impossible; IP still leaked to jsDelivr.
   - Effort: **Low**.

2. **Exact pin + secondary CDN fallback + clear offline message (RECOMMENDED)** — replace the one
   URL with an ordered list (jsDelivr `@2.0.3/+esm` → esm.sh `@2.0.3`), try each in turn inside
   the existing try/catch, and reword the failure text to distinguish "sin conexión / CDN no
   disponible" from a parse error.
   - Pros: survives a single CDN outage; still a ~20-line, one-file change; keeps zero local deps
     and zero build step; honors the existing `load()`/`isLoaded()`/`convert()` contract.
   - Cons: slightly more code than option 1; the two CDNs bundle the same package source, so a
     genuinely bad release affects both — pinning, not the fallback, is what fixes that class.
   - Effort: **Low**.

3. **Vendor a local copy of the engine (`js/vendor/mdream.mjs`) with CDN fallback** — ship the
   pinned bundle in-repo, `import('./js/vendor/mdream.mjs')`, fall back to CDN only if missing.
   - Pros: true offline support; no runtime third-party code; no IP leak to jsDelivr; SRI-able in
     principle if loaded via `<script>`/hash check; immune to CDN churn.
   - Cons: introduces a new local dependency file (~80 KB bundle or 340 B + chunk graph) and a
     manual update chore; violates the repo's "no new local dependencies unless truly required"
     spirit; largest blast radius. README does hint at "considerar copia local".
   - Effort: **Medium**.

## Recommendation

**Adopt Approach 2.** Pin to the exact version **`@mdream/js@2.0.3`** on jsDelivr `/+esm` as the
**primary**, with **esm.sh `@mdream/js@2.0.3`** as the **secondary fallback**, and a clearer offline
error message. Rationale:

- Pinning `2.0.3` is exactly today's `@latest`, so it is a **zero-regression** change that removes
  the "silent bad release / breaking major" risk — the actual CRITICAL bug.
- A single fallback host is the cheapest meaningful resilience step that stays inside one file and
  respects the no-build / no-local-dependency constraints.
- SRI is **not achievable** here (dynamic `import()` has no `integrity`; `/+esm` is not
  byte-stable), so the realistic mitigation is exactly this: **exact pin + optional fallback +
  explicit offline message**. Do not spend the change trying to add SRI — the browser cannot
  enforce it on a runtime import.
- Approach 3 (vendor local) is the *ultimate* reliability/privacy fix and is worth a **separate,
  later change** — flag it, do not fold it in. Keep this change small.

Pinned constants to use (decimal exact versions depend on the Implementation deciding the final
format, but the values are fixed): primary `https://cdn.jsdelivr.net/npm/@mdream/js@2.0.3/+esm`,
fallback `https://esm.sh/@mdream/js@2.0.3`.

## Minimal Change Set / Blast Radius

**One file: `js/mdream-loader.js`.** No `index.html` edit, no new scripts, no new files, no build.

- Replace the single hard-coded `@latest` URL (line 19) with a pinned primary + fallback.
- Attempt the URLs in order inside the existing `try/catch`; keep the `htmlToMarkdown`
  function-shape validation as the acceptance check for each attempt.
- Keep the `Vitale.mdream` return contract identical (`{ load, isLoaded, convert }`) so
  `main.js` and `convert-panel.js` need no edits.
- Optionally improve the catch-branch message (e.g. a friendlier "sin conexión" note) — still the
  same file.

Anything beyond `mdream-loader.js` (README doc sync) is **optional** and not required to satisfy
the bug. If a reviewer sees a diff touching `index.html` or `convert-panel.js`, that is a signal
the change drifted out of scope.

## Manual Verification (no test runner — `strict_tdd: false`)

1. **Happy path (online):** serve the folder (`python -m http.server 8080`) or open `index.html`
   directly. Confirm the status dot turns **green** and `#statusText` reads "Vitale listo".
2. **Pin confirmed:** open DevTools → Network → reload → the engine request URL MUST contain
   `@mdream/js@2.0.3/` and MUST NOT contain `@latest`.
3. **Functional:** conversion still works — paste/drop an `.html`/`.mhtml`, click
   **⚡ Convertir a Markdown**, verify Markdown output is produced and the download works.
4. **API intact:** in the console, after load, `Vitale.mdream.isLoaded()` returns `true` and
   `typeof Vitale.mdream.convert === 'function'`.
5. **Primary-CDN failure / fallback:** DevTools → Network → block `cdn.jsdelivr.net` → reload →
   the engine must still load from `esm.sh` and the dot must still go green (proves the fallback).
6. **Full offline:** DevTools → Network → "Offline" → reload → dot must NOT go green; status text
   must show a clear load/offline error (not a silent blank); clicking Convert must show the
   "motor aún cargando" warn (no crash, no uncaught console error).
7. **No regressions:** console shows no uncaught errors on load; `main.js` bootstrap log still
   prints the extractor list.

## Risks

- **Fallback CDN can drift in output shape.** esm.sh may wrap/transform exports differently from
  jsDelivr. Mitigated by keeping the `htmlToMarkdown` function-shape validation on every attempt
  (already the existing acceptance check), and by treating the fallback as best-effort.
- **Pin can age.** `2.0.3` will eventually be behind. That is the intended tradeoff (stability over
  currency); a future, deliberate bump is a separate change.
- **SRI expectation gap.** A reviewer may ask for `integrity`; it is not enforceable on dynamic
  `import()`. Document this explicitly in the proposal/design so it is a known, reasoned exclusion.
- **Full offline still unsupported.** Approach 2 improves CDN-outage resilience but a device with
  no network still cannot load the engine. Only Approach 3 (local vendor) closes that; it is
  deferred, not solved here.
- **Exit criteria for the fix depend on manual browser checks**, since the repo has no automated
  runner. Verification is human, so the verify phase must document the exact steps above.

## Ready for Proposal

**Yes.** The scope is well-bounded: one file (`js/mdream-loader.js`), a fixed target version
(`@mdream/js@2.0.3`), a clear fallback strategy, and a documented, verified reason SRI is
out of scope. Tell the user: bug #1 is a one-file pin to `2.0.3` with an esm.sh fallback and a
clear offline message; vendoring a local copy is a recommended follow-up change, not part of this one.
