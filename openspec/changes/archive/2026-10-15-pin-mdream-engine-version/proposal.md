# Proposal: pin-mdream-engine-version

## Intent

README "Limitaciones conocidas" bug **#1 (CRÍTICA)**: `js/mdream-loader.js:19` loads the Markdown engine via `import('...@mdream/js@latest/+esm')` — unpinned, no SRI, no fallback. A CDN outage or a breaking upstream release silently disables conversion ("app inservible"). Pin the version, add a fallback CDN, and surface load failures clearly.

## Scope

### In Scope
- Pin exact `@mdream/js@2.0.3` on jsDelivr `/+esm` (primary).
- Secondary fallback `https://esm.sh/@mdream/js@2.0.3`.
- Try endpoints in order; keep `htmlToMarkdown` function-shape validation per attempt.
- Clearer offline/loading failure UI in `#statusDot`/`#statusText`.

### Out of Scope
- Vendoring a local engine copy (Approach 3) — deferred to a separate change.
- SRI: not enforceable on dynamic `import()`.
- Any edit to `index.html`, `js/main.js`, `js/convert-panel.js`.
- Future pin bumps (separate change).

## Capabilities

### New Capabilities
- `conversion-engine-loading`: runtime loading of the mdream engine — pinned version, ordered CDN fallback, and explicit failure UI.

### Modified Capabilities
- None.

## Approach

Replace the line-19 `@latest` URL with an ordered endpoint list: `cdn.jsdelivr.net/npm/@mdream/js@2.0.3/+esm` → `esm.sh/@mdream/js@2.0.3`. Loop the existing `try/catch` over endpoints; on each success assign `htmlToMarkdown` and validate `typeof === 'function'`; on total failure reword the catch message (offline hint). Public contract `{load,isLoaded,convert}` unchanged. 2.0.3 == today's `@latest` → zero behavior change, pure risk reduction. No build, no new files.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `js/mdream-loader.js` | Modified | Pinned primary + esm.sh fallback + clearer failure message |
| `README.md` | Modified (optional) | Sync bug #1 row / "Siguientes pasos" checkbox |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| esm.sh output shape differs from jsDelivr | Low | Shape validation on every attempt; fallback best-effort |
| Pin ages / misses upstream fixes | Low | Intentional stability; bump is a separate change |
| Reviewer requests SRI | Med | Documented: dynamic `import()` has no `integrity`; `/+esm` not byte-stable |
| Full offline still unsupported | Med | Explicit failure UI; vendoring deferred |

## Rollback Plan

Revert the single-file diff (`git revert` or restore the prior `mdream-loader.js`). No data, schema, or contract changes; the old `@latest` line restores prior behavior immediately.

## Dependencies

- jsDelivr and esm.sh reachable at runtime; `@mdream/js@2.0.3` published (verified HTTP 200).

## Success Criteria

- [ ] DevTools Network shows `@mdream/js@2.0.3/`, never `@latest`.
- [ ] Happy path: `#statusDot` green, "Vitale listo", conversion works.
- [ ] jsDelivr blocked → still loads from esm.sh, dot green.
- [ ] Full offline → non-green dot + clear error, no uncaught error.
- [ ] `Vitale.mdream.isLoaded()` / `convert()` contract intact.
