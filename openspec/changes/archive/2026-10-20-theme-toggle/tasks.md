# Tasks: theme-toggle

> Phases are cut so **no file is edited twice**, and ordered so the intent of the suite is visible at every
> step: RED first, GREEN when the last behaviour lands.
> Flow: `proposal → specs → design → tasks` (design was NOT skipped: the attribute model and the rejection of
> `light-dark()` are decisions the human approves in `design.md` §10).
> Verification legend: **`suite`** = headless Node test (`tests/*.test.js`); **`browser`** = computed-style
> probe over the app served on `http://127.0.0.1:8765`; **`golden`** = diff against the archived
> `dark-golden.json`.
> Baseline before Apply: **8 suites / 75 assertions / 0 failures**. It must be green again at the end of
> Phase C, and stay green after that.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 160–230 (`styles.css` ~55, `js/theme.js` ~60, `index.html` ~16, `tests/theme.test.js` ~45, docs ~8) |
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
| 1 | RED tests + CSS attribute model | PR #1 | Phase A + B |
| 2 | JS module + markup, suite GREEN | PR #1 | Phase C |
| 3 | Docs + verification evidence | PR #1 | Phase D + E |

Single PR: the phases are small and the suite only turns green once, at the end of Phase C.

## Phase A: RED

- [x] A.1 **Write the failing guards first.** Extend `tests/theme.test.js` with five assertions: the
      `:root[data-theme="light"]` token block exists; both light token blocks are declaration-identical; both
      light rule blocks are selector-identical; the media selector excludes `[data-theme="dark"]`;
      `js/theme.js` declares exactly `auto`, `light`, `dark`. Observe RED with a falsifiable assertion, not a
      guard that already passes.
      (spec: `theme-support` / The light theme is complete — Both paths into light agree)
      Test: `suite`.
      Done: RED observed — `theme.test.js` 4 ok / 5 fallos, and the five failures are exactly the new checks
      (block `[data-theme="light"]` ausente, drift, guard de oscuro, `js/theme.js` ausente, pre-paint script
      ausente). The other 7 suites stayed green (8/8, 5/5, 8/8, 11/11, 15/15, 11/11, 13/13), so the RED is
      scoped and falsifiable. Expected GREEN total: 80 assertions.

## Phase B: CSS

- [x] B.1 **Guard the automatic path.** Change the two `@media (prefers-color-scheme: light)` selectors to
      exclude an explicit dark (`:root:not([data-theme="dark"])`), leaving every declaration untouched.
      (spec: `theme-support` / Explicit dark overrides a light operating system)
      Test: `suite` + `browser`.
      Done: selector cambiado en ambos bloques (tokens y overrides), 15 valores intactos. Suite: el guard
      "el bloque automático no se aplica sobre un oscuro explícito" pasa.

- [x] B.2 **Add the explicit light path.** Duplicate the 15 light token declarations under
      `:root[data-theme="light"]`, and the eight rule overrides under the same root attribute. Values are
      copied, never re-authored. Duplication is deliberate; the A.1 drift test is what keeps it honest.
      (spec: `theme-support` / Explicit light overrides a dark operating system; Both paths into light agree)
      Test: `suite` + `browser`.
      Done: bloque `:root[data-theme="light"]` con los 15 tokens y los 8 overrides duplicados en orden idéntico.
      El test de drift (comparación de Map por orden de iteración) pasa.

- [x] B.3 **Style the control.** Add `.theme-toggle` sharing the pill geometry and tokens, plus its focus
      ring. No animation is added.
      (spec: `theme-support` / The control is reachable and labelled; The scheme control is legible in both
      schemes)
      Test: `browser`.
      Done: `.theme-toggle` en `styles.css:237-251` (geometría de pill, hover, focus-visible, svg 15px).
      Verificación visual del control queda para E.1 en navegador.

## Phase C: behaviour

- [x] C.1 **Add the module.** `js/theme.js` under `window.Vitale`: read, apply, cycle, persist, and refresh
      the button glyph. Storage access wrapped in `try/catch` on both read and write; an unusable value falls
      back to `auto`.
      (spec: `theme-support` / The mode survives a reload; An unusable stored value falls back to automatic)
      Test: `suite` + `browser`.
      Done: `js/theme.js` escrito (IIFE `Vitale.theme`: KEY `vitale.theme`, MODES `['auto','light','dark']`,
      ciclo auto→light→dark→auto, glifo = modo elegido, `try/catch` en read y write, fallback a auto).
      Suite: el guard del módulo pasa. Verificación de persistencia/fallback en navegador → E.3.

- [x] C.2 **Wire the markup.** Pre-paint inline script in `<head>` before the stylesheet link; the toggle
      button as the last child of `.status-bar`; `js/theme.js` before `js/main.js`. The icon reflects the
      stored mode, not the resolved scheme.
      (spec: `theme-support` / The scheme is selectable among auto, light and dark; The mode survives a
      reload)
      Test: `suite` + `browser`.
      Done: script pre-paint inline en `<head>` antes del `<link>`; `<button type="button" class="theme-toggle"
      id="themeToggle" aria-label="Tema">` como último hijo de `.status-bar`; `js/theme.js` antes de
      `js/main.js`; `Vitale.theme.init()` añadido a `main.js`. Suite: el guard de markup pasa.

- [x] C.3 **Confirm GREEN.** Full suite green again. If any A.1 assertion still fails, fix the behaviour —
      never the assertion.
      (spec: all)
      Test: `suite`.
      Done: **8 suites / 80 assertions / 0 fallos** (baseline 75 + 5 nuevos guards).

## Phase D: docs

- [x] D.1 **Correct every statement that now lies.** `README.md` (the two places that say the scheme follows
      the OS with no control), `docs/arquitectura.md` §Sistema visual (document the three modes and the
      `vitale.theme` key), `docs/limitaciones.md` (the row that says there is no toggle). Rewrite the rows;
      do not delete them.
      (spec: `theme-support` / The scheme is selectable among auto, light and dark)
      Test: manual read of each changed line + `suite` unchanged.
      Done: 7 statements rewritten across 3 files — README.md `:30` (tech list), `:35` (assertion count 57→80),
      `:78-82` (file tree: `styles.css` comment + `js/theme.js` entry); arquitectura.md `:38` (tree comment)
      and §Sistema visual (three modes, `vitale.theme` key, pre-paint, drift test); limitaciones.md rows
      "Sin persistencia" (localStorage nuance) and "Tema sin conmutador" → "Tema con tres modos". Suite
      unchanged (8/80/0).

## Phase E: verify

- [x] E.1 **Six combinations.** `{auto, light, dark} × {OS light, OS dark}` in a real browser. Assert body
      background and text, brand title gradient, status dot, card background, and both ink tokens against the
      expected palette for each combination.
      (spec: `theme-support` / all scheme-selection scenarios)
      Test: `browser`.
      Done: 6/6 ok (Playwright Node API + system Chrome, emulated `colorScheme`). All 14 probed tokens
      matched per combination; attribute correct in every row.

- [x] E.2 **Golden.** Diff against the archived `dark-golden.json` under explicit dark and under auto+dark
      OS. Only the two documented dead-token removals may appear.
      (spec: `theme-support` / The dark theme is unchanged)
      Test: `golden`.
      Done: clean diff in both captures (explicit dark and auto+dark OS).

- [x] E.3 **Persistence and fallback.** Set each pinned mode, reload, and assert the first sampled frame is
      already the stored scheme. Then seed an invalid value and assert `auto` plus a rendered app.
      (spec: `theme-support` / The mode survives a reload; An unusable stored value falls back to automatic)
      Test: `browser`.
      Done: persist light ok, persist dark ok, fallback `banana` → auto + rendered ok, 3 glyphs ok,
      aria-label follows mode. Fix applied during E.3: the button keeps `hidden` (CSS documents the
      no-JS degradation) and `Vitale.theme.init()` reveals it — matched Phase B's intent.

- [x] E.4 **Close.** Write `verify-report.md` with the six-combination table, the golden diff, the
      persistence evidence, and an honest limitations section. State the non-conformance of hairline borders
      again if it still applies.
      (spec: all)
      Test: `suite` + `browser` + `golden`.
      Done: `verify-report.md` written — verdict **PASS**, suite 8/80/0, 4 limitation notes (hairlines,
      no animation, probe not in repo, playwright-cli shell bug).
