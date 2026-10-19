# Tasks: editable-markdown-output

> Phases are cut so **no file is edited twice**, and ordered so the app is correct after every commit.
> Flow: `proposal → specs → tasks` (`design` skipped deliberately — the one design decision is made and
> justified in `exploration.md`).
> Verification legend: **`suite`** = headless Node test (`tests/*.test.js`); **`browser`** = Puppeteer DOM /
> computed-style check over `file:///.../index.html`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 45–80 |
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
| A | Editable surface + `.value` access paths, test-first | PR 1 | Atomic: element and readers move together |
| B | Presentation for a form control (CSS only) | PR 1 | Independently rejectable; behaviour untouched |
| C | Verification sweep + docs | PR 1 | Closes the change |

---

## Phase A: Editable surface + edit-aware access paths (Strict TDD — RED first)

- [x] A.1 **RED: the save path ignores edits.** Create `tests/editable-output.test.js` following the existing
      suite style (module loaded via `eval(fs.readFileSync(...))`, hand-rolled `makeEl` stubs, no framework).
      Stub `#mdOutput` as an element exposing a DISTINCT `value` (the edit) and `textContent` (the original),
      stub `Vitale.utils.downloadFile`, call `Vitale.downloadModal.confirm()` and assert `downloadFile`
      received the **edited** value. This MUST FAIL first: today the code reads `.textContent`. Also cover the
      refusal guard (empty result and a result starting with `❌` → `downloadFile` NOT called).
      (spec: `editable-markdown-output` / Save uses the current text — both scenarios; Empty and error guards
      preserved — both scenarios)
      Test: `suite` — the new suite runs and the save-path case is RED (exit=1).
      Done: `tests/editable-output.test.js`, 8 cases. RED observed BEFORE the fix (4 fallos / 4 ok): the save
      path returned `'# Original'` instead of the edit, copy returned `'# Original'`, `convert` left `.value`
      empty, and the counter listener was absent. Scope widened beyond this task's plan: the copy path and the
      counter-on-typing path were slated as browser-only, but `convert-panel.setup()` turned out to be cheaply
      stubbable (same pattern as `url-scheme-safety.test.js`), so both got real REDs instead of a documented
      gap. Only the boundary effects are stubbed (`downloadFile`, `copyToClipboard`); `updateCounter`,
      `alertMsg` and `esc` are the real implementations.

- [x] A.2 **The result surface becomes a plain-text control.** In `index.html`, replace the `#mdOutput`
      `<div class="output-box">` (`:110`) with a `<textarea class="output-box" id="mdOutput">` carrying the
      native `placeholder` with the text the CSS hint currently renders ("El resultado aparecerá aquí…") and
      `spellcheck="false"`; add `for="mdOutput"` to the "Markdown resultante" label (`:105`), which currently
      points at nothing. KEEP the `output-box` class — its specificity already carries the box look.
      Do NOT add a `rows` attribute larger than needed; the height is Phase B's job.
      (spec: Editable result surface — all three scenarios; Accessible name for the result control)
      Test: `browser` — the element accepts text input; the hint is visible while empty; the label resolves to
      the control.
      Done: `<textarea class="output-box" id="mdOutput" spellcheck="false" placeholder="El resultado aparecerá
      aquí…"></textarea>` y `for="mdOutput"` en el label. Verificado en navegador: `tagName=TEXTAREA`,
      `placeholder="El resultado aparecerá aquí…"`, `spellcheck=false`, sin `disabled`/`readOnly`, el label
      resuelve, y `.output-box` conserva el aspecto (Fira Code, `white-space:pre-wrap`, `overflow-y:auto`,
      `padding:16px`, `border-radius:9px`). Sin atributo `rows`.

- [x] A.3 **GREEN: one property for every access.** Switch the six sites from `.textContent` to `.value`:
      `js/convert-panel.js:44` (clear), `:116` (markdown), `:134` (error), `:221` (Limpiar), `:236` (copy
      read), and `js/download-modal.js:30` (save read). Writes and reads MUST move together: mixing them
      reads `undefined` while the element is still a div and `''` on an untouched textarea. After this task,
      `grep -rn "mdOutput" js/` MUST show no `.textContent` access.
      (spec: Save uses the current text; Copy uses the current text)
      Test: `suite` — A.1 GREEN; every prior suite still green.
      Done: los 6 sitios pasados a `.value` (`convert-panel.js:44,116,134,227,242`; `download-modal.js:30`).
      Drift de líneas: `:221→:227` y `:236→:242` por las 6 líneas del listener de A.4. `grep` de
      `mdOutput'\)\.(textContent|value)` → 6 coincidencias, TODAS `.value`, 0 `.textContent`. Suite completa:
      8 nuevos + 5+8+11+15+11+13 previos = **71 aserciones, 0 fallos** (base 63). `node --check` en ambos
      archivos: OK.

- [x] A.4 **Keep the counter honest.** Add an `input` listener on `#mdOutput` calling
      `Vitale.utils.updateCounter('mdOutput','outputCounter')`, so manual typing updates the counter (today it
      only follows programmatic writes — a defect this change would otherwise introduce). Do NOT modify
      `updateCounter` (`js/core/utils.js:76-86`): it already reads `.value` before `.textContent`.
      (spec: Counter reflects the current text — both scenarios)
      Test: `browser` — type and delete; the counter follows. `suite` unchanged.
      Done: listener `input` sobre `#mdOutput` en `convert-panel.js`, justo después del bloque de `#htmlInput`.
      `updateCounter` NO se tocó (`utils.js:76-86` ya prefiere `.value`). Verificado en navegador: escribir 28
      caracteres lleva `#outputCounter` de `0 caracteres` a `28 caracteres`. Ya no depende solo del navegador:
      la suite dispara el handler real y lo cubre.

## Phase B: Presentation for a form control (CSS only)

- [x] B.1 **Preserve the box geometry.** A textarea does not grow with its content, so with only the inherited
      `min-height:240px` it would sit at 240 px and scroll, where the div used to grow up to
      `min(540px,62vh)` (`.output-box`, `styles.css:275-284`). Give `#mdOutput` an explicit height matching
      the previous cap, and verify how it interacts with the inherited `resize:vertical`
      (`styles.css:204`).
      (spec: Editable result surface — text preserved verbatim / Empty result shows the hint)
      Test: `browser` — computed height and overflow behaviour match the previous box; `resize` still works.

      Done: `.output-box` (`styles.css:275-287`) cambia `min-height:240px` por `height:min(540px,62vh)`, y deja
      el `max-height` fuera. Verificado en navegador (viewport de 600px de alto → 62vh = 372px): `height:372px`,
      `min-height:240px` (lo sigue aplicando la regla global `textarea`, `styles.css:214`), `overflow-y:auto`
      conservado, y con 3290 caracteres `scrollHeight:1884 > clientHeight:370` (scrollea de verdad).
      `#htmlInput` intacto en 240px → el cambio quedó scopeado a `.output-box`.
      DESVIACIÓN: se quitó `max-height:min(540px,62vh)`, que no estaba en el plan. Con `height` fijo igual al
      tope, `max-height` solo bloqueaba el tirador: `resize:vertical` era de una sola dirección (achicar).
      Ahora crece a 520px, se achica hasta el piso de 240px y restaura a 372px. Es el riesgo "Low" que
      `exploration.md:189` había anotado como "set an explicit height if the interaction is poor".
      TRADE-OFF DECLARADO: la caja vacía ahora mide 372px en vez de 240px, porque un textarea no se ajusta a su
      contenido. `field-sizing:content` lo resolvería con fidelidad total, pero es solo-Chromium → descartado
      por determinismo entre navegadores.

- [x] B.2 **Remove the dead hint rule.** Delete `.output-box:empty::before` (`styles.css:286`) — a form control
      does not render it, and the hint now comes from the `placeholder` attribute. Confirm first that
      `#mdOutput` is that rule's only consumer (`old/v2/styles.css` carries its own frozen copy — do not
      touch it).
      (spec: Editable result surface — Empty result shows the hint)
      Test: `browser` — the hint still renders (via `placeholder`); grep shows no `:empty::before` remains.

      Done: regla borrada. Prueba en runtime: el `content` computado de `::before` pasó de
      `"El resultado aparecerá aquí…"` a `none`. Grep de `:empty::before` en `*.css`: solo sobrevive en
      `old/v2/styles.css:269` y `old/v1/index.html:178`, ambos congelados. Confirmado antes de borrar que
      `#mdOutput` era el único consumidor vivo. El hint sigue: el atributo `placeholder` está presente y el
      texto exacto quedó intacto.

## Phase C: Verification and docs

- [x] C.1 Full suite: `suite` — baseline 6 suites / 63 assertions, plus the new suite; none removed or skipped.
      Also `node --check` on every changed JS file (the repo has no linter, formatter or type-checker; this is
      the only static gate).
      Test: the suite command exits 0 with the expected counts.

      Done: suite completa = **7 suites / 71 ok / 0 fallos**, todas `exit=0` (baseline 6/63 + 8 casos de la suite
      nueva); ninguna removida ni salteada. `node --check` = 0 en `js/convert-panel.js`, `js/download-modal.js`
      y `tests/editable-output.test.js` (única puerta estática del repo: no hay linter, formatter ni
      type-checker).

- [x] C.2 Browser checklist: every `editable-markdown-output` scenario, in one Puppeteer pass — edit then
      download contains the edit; edit then Copiar contains the edit; download without editing saves the
      conversion unchanged; the counter follows typing; **Limpiar** empties the result box (its write site also changed property and no test pins it); the hint shows before the first conversion; the empty
      and `❌` paths still refuse; computed styles match the previous box.
      Note: screenshots cannot be reviewed (the model cannot read images) — equivalence rests on DOM
      assertions and computed styles, as in the previous change.
      Test: `browser`.

      Done: 11/11 escenarios en una sola pasada Puppeteer, con **conversión real** (`Vitale.mdream.isLoaded()`
      = true, CDN disponible; sin stub de conversión). Evidencia: (1) tras convertir, `#mdOutput` es TEXTAREA
      editable con `# Titulo` y contador `48 caracteres`; (2) escritura verbatim: saltos e indentación exactos
      y `textContent === ''` (no reinterpreta markup); (3) placeholder visible antes de convertir y tras
      Limpiar; (4) `label[for=mdOutput]` y `md.labels = ["Markdown resultante"]`; (5) editar → descargar entrega
      el editado exacto (`## Nueva seccion` presente); (6) sin editar → lo descargado es la conversión intacta,
      comparación EXACTA tras descartar mi primera comprobación, que solo medía el largo (corregida);
      (7) editar → Copiar entrega el editado; (8) vacío → «⚠️ No hay Markdown que descargar.» y 0 descargas (el
      guard corre antes de abrir el modal); (9) `❌` → mismo rechazo; (10)-(11) el contador sigue el tipeo (58) y
      la conversión (48); Limpiar vacía salida+entrada, deja contadores en 0, deshabilita la descarga y mantiene
      el hint. Estilos computados idénticos al diseño previo: `372px`, `min-height:240px`, `max-height:none`,
      Fira Code, `pre-wrap`, `auto`, `16px`, `9px`, `vertical`, `::before: none`. `downloadFile` y
      `copyToClipboard` stubbeados solo para capturar el payload (su escritura a disco no cambió).
      LÍMITE DECLARADO: los screenshots no son revisables (el modelo no lee imágenes) → la equivalencia visual
      se apoya en estilos computados y aserciones DOM, igual que en el change anterior.

- [x] C.3 Docs sync if a description of the pipeline or the limitations table is affected (`README.md`,
      `docs/*`). If `docs/limitaciones.md` already lists this as a known limitation, mark it resolved and
      note the change name; if it does not, add nothing (do not invent a backlog row for a feature that now
      works).
      Test: grep the touched docs for the change name.

      Done: SÍ aplica. `docs/arquitectura.md:148` documentaba la ubicación del estado como «`textContent` de
      `#mdOutput`» — quedó falso al pasar a `.value`; corregido a «`value` de `#mdOutput` (editable)». Se añadió
      una frase en `docs/guia-de-uso.md` (sección «Guardar el resultado») explicando que el recuadro es editable
      y que se guarda/copia lo que se ve. `docs/limitaciones.md`: NO se toca — no listaba esto como limitación y
      no se inventa una fila para algo que ahora funciona. `docs/mhtml-y-charsets.md:87`: fuera de alcance
      (documenta la codificación, no la API). DESVIACIÓN: los docs aterrizan en el commit siguiente al código
      (el código ya estaba en `5c5951c` y `8d4de86`); mismo change y sin drift funcional.

- [x] C.4 Confirm untouched: `old/v1/`, `old/v2/`, `js/mdream-loader.js`, and the existing specs
      (`core-utilities`, `modal-accessibility`, `assist-guide`, `html-extraction`,
      `conversion-engine-loading`).
      Test: `git diff --stat` shows none of them.

      Done: `git diff --stat 8173543..HEAD` sale vacío para `js/mdream-loader.js`, `openspec/specs/` y `old/`.
      El diff completo toca 9 archivos: `index.html`, `js/convert-panel.js`, `js/download-modal.js`,
      `styles.css`, `tests/editable-output.test.js` y los 4 artefactos del change en `openspec/changes/`.
      Ningún spec existente modificado (promover specs es tarea de `archive`, no de `apply`).
