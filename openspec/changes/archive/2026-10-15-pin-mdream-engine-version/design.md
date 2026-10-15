# Design: Pin mdream engine version

## Technical Approach

Pin the mdream engine to `@mdream/js@2.0.3` and add an ordered CDN fallback, all inside
`js/mdream-loader.js`. Replace the single `import()` on line 19 with a loop over a module-private
candidate list. Each candidate is tried in `try/catch`; a candidate is accepted only when its
module exposes a callable `htmlToMarkdown`. The first passing candidate is kept; if none pass, the
existing error state in `#statusDot`/`#statusText` is set (non-crashing). The public
`{load, isLoaded, convert}` contract is untouched and `convert()` keeps throwing when not loaded.
This maps directly to the spec requirements: pinned version, ordered fallback, shape validation,
ready UI, failure handling, contract stability.

## Architecture Decisions

### Decision: Pin exact version, not a range

**Choice**: `@mdream/js@2.0.3` (exact).
**Alternatives considered**: `@2` / `^2.0.3` range; keep `@latest`.
**Rationale**: A range still auto-adopts upstream breaking releases — the exact failure mode bug #1
describes. The exact pin makes the loaded artifact byte-identifiable in the Network tab and
reproducible. Bumping is a deliberate future change.

### Decision: Ordered fallback list, not a single source

**Choice**: try jsDelivr `/+esm` first, then esm.sh.
**Alternatives considered**: single jsDelivr source; parallel race.
**Rationale**: A single source re-introduces the single point of failure the proposal calls "app
inservible". Sequential-try keeps ordering deterministic and lets the primary serve the common path
at zero extra cost; esm.sh runs only when jsDelivr fails. A parallel race always wastes a second
request and complicates winner selection.

### Decision: Per-attempt shape validation inside the loop

**Choice**: validate `typeof core.htmlToMarkdown === 'function'` per candidate.
**Alternatives considered**: validate once after the loop.
**Rationale**: esm.sh and jsDelivr build ESM differently; one could return a shape without
`htmlToMarkdown`. Validating per attempt turns a shape mismatch into a fallback trigger instead of
a dead end.

### Decision: No SRI

**Choice**: omit `integrity`.
**Alternatives considered**: SRI on the dynamic import.
**Rationale**: Dynamic `import()` has no `integrity` option, and jsDelivr `/+esm` output is not
byte-stable (it may be rewrapped), so a fixed hash would break. Documented limitation.

## Data Flow

```text
load()
  |
  +- dot.classList.add('loading')
  |
  +- for src of SOURCES:            (jsdelivr -> esm.sh)
       try:
         core = await import(src.url)          # network
         if typeof core.htmlToMarkdown === 'function':
            htmlToMarkdown = core.htmlToMarkdown
            loaded = true
            dot: loading -> ready ; txt = "Vitale listo"
            return
         else: continue                        # shape fail -> next
       catch: continue                         # network fail -> next
  |
  +- loop exhausted:
       dot: loading -> (not ready) ; txt = "Error al cargar: ..."
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `js/mdream-loader.js` | Modify | Add `SOURCES` candidate list; replace line-19 single import with ordered fallback loop + per-attempt validation; reword final catch message (offline hint). Contract unchanged. |
| `README.md` | Modify (optional) | Sync bug #1 row / "Siguientes pasos" checkbox. Not required for behavior. |

`index.html`, `js/main.js`, `js/convert-panel.js` — NO change (proposal out-of-scope).

## Interfaces / Contracts

Public contract MUST stay identical (spec: Public contract stability):

```js
Vitale.mdream = { load, isLoaded, convert };   // unchanged shape
```

Internal source list (new, module-private):

```js
const SOURCES = [
  { name: 'jsdelivr', url: 'https://cdn.jsdelivr.net/npm/@mdream/js@2.0.3/+esm' },
  { name: 'esm.sh',   url: 'https://esm.sh/@mdream/js@2.0.3' }
];
```

`convert(html)` behavior unchanged: throws `'El motor aun se esta cargando...'` when `!loaded`;
empty-input, parse-error, and result-shape errors preserved verbatim.

## Testing Strategy

No runner/linter exists (see `openspec/config.yaml`). Verification is manual in a browser.

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual – happy path | Pinned load + ready UI + conversion | Open app; Network shows `@mdream/js@2.0.3/`, never `@latest`; `#statusDot` green, `#statusText` = "Vitale listo"; convert a sample HTML -> markdown output. |
| Manual – fallback | Primary blocked, secondary serves | DevTools -> block `cdn.jsdelivr.net`; reload; Network shows `esm.sh/@mdream/js@2.0.3`; dot green; conversion works. |
| Manual – total failure | No uncaught error, clear UI, convert rejects | Block both hosts (or go offline); reload; dot non-ready + clear message; `Vitale.mdream.convert('<p>x</p>')` in console -> descriptive throw; no uncaught exception. |
| Manual – contract | Surface unchanged | In console: `Object.keys(Vitale.mdream)` -> `['load','isLoaded','convert']`. |

## Migration / Rollout

No migration required. Single-file revert (`git revert` / restore prior `mdream-loader.js`)
restores `@latest` behavior; no data, schema, or contract changes.

## Open Questions

- [ ] None blocking. (Pin-bump cadence for future upstream releases is a separate change.)
