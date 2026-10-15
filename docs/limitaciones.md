# Limitaciones y backlog

Lo que la aplicación **no** hace, la deuda técnica conocida y las notas de
seguridad. Sirve como registro honesto de los bordes del sistema.

- [Limitaciones de la aplicación](#limitaciones-de-la-aplicación)
- [Backlog técnico](#backlog-técnico)
- [Deuda detectada pero no priorizada](#deuda-detectada-pero-no-priorizada)
- [Notas de seguridad y privacidad](#notas-de-seguridad-y-privacidad)
- [Simplificaciones deliberadas](#simplificaciones-deliberadas)

---

## Limitaciones de la aplicación

| Limitación | Detalle |
| --- | --- |
| **No descarga URLs** | CORS lo impide. La página debe guardarse a mano (ver [Guía de uso](guia-de-uso.md)) |
| **Necesita internet al cargar** | El motor de conversión se descarga de un CDN la primera vez por sesión |
| **Una conversión a la vez** | El botón se bloquea mientras procesa |
| **Sin persistencia** | Recargar borra la entrada y la salida; no se usa `localStorage` |
| **Tema único** | Solo existe el tema oscuro; no hay conmutador claro/oscuro |
| **Un archivo por vez** | No hay conversión por lotes |
| **BOM no configurable** | La salida siempre lleva BOM UTF-8 (ver bug #10) |

---

## Backlog técnico

Auditoría independiente priorizada. Estado a la fecha de esta documentación.

| # | Severidad | Dónde | Problema | Estado / fix |
| --- | --- | --- | --- | --- |
| 1 | Alta | `mdream-loader.js` | Motor desde CDN con `@latest`, sin pin ni SRI ni fallback. Si el CDN cae o cambia una release, la app queda inservible; además ejecuta código de terceros | ✅ **Resuelto**: pin `@mdream/js@2.0.3` + fallback esm.sh + error claro. SRI es imposible en un `import()` dinámico |
| 2 | Alta | `download-modal.js` | `confirm()` no revalidaba el guard de "sin Markdown / salida de error"; descargaba un mensaje de error como `vitale.md` | ✅ **Resuelto**: guard centralizado en `markdownOrWarn()`, usado por `open()` y `confirm()` |
| 3 | Alta | `extractors/base.js` | `extractGeneric` fallaba con comillas simples y con `<div>` anidados (cortaba en el primer `</div>`) | ✅ **Resuelto**: reescrito con `DOMParser` |
| 4 | Media | `core/mhtml-parser.js` | Ignoraba el charset de la parte MHTML: siempre UTF-8 → *mojibake* en `windows-1252`/`iso-8859-1` | ✅ **Resuelto**: charset por parte + `safeDecode()` |
| 5 | Media | `core/charset.js` | `readFileSmart` buscaba `<meta charset>` solo en los primeros 4 KB; en `.mhtml` el HTML va después | ✅ **Resuelto**: era el mismo defecto que el #4; cubierto por `mhtml-charset.test.js` |
| 6 | Media | `registry.js:44`, `site-detector.js:51` | Contaminación de prototipo: `detectSiteFromUrl('http://constructor/')` devolvía una función | ✅ **Resuelto**: `Object.create(null)` + `Object.hasOwn` |
| 7 | Media | `assist-panel.js:62` | `window.open(url)` sin validar esquema; `javascript:`/`data:` controlables por el usuario | ✅ **Resuelto**: exigir `^https?://` antes de abrir/copiar |
| 8 | Baja | `core/utils.js:82` | El fallback de portapapeles dejaba el `<textarea>` en el DOM si `execCommand` lanzaba | ✅ **Resuelto**: se quita el nodo en un `finally` |
| 9 | Baja | `extractors/base.js:53` | Falsos negativos con `<article>`/`<main>` sin class/id | ✅ **Resuelto**: los semánticos no exigen class/id |
| 11 | Baja | `core/utils.js:12` | `esc()` no escapaba comillas: seguro solo porque todo uso era contenido, no atributo | ✅ **Resuelto**: escapa `"` y `'` |
| 12 | Baja | `convert-panel.js:219` | `btnClear` tocaba `className` directo sin pasar por el API de alertas | ✅ **Resuelto**: helper `clearAlert()` en `utils` |
| **10** | Baja | `core/utils.js:96` | El BOM UTF-8 incondicional ensucia el inicio en algunas herramientas Markdown | ⚠️ **No se arregla**: quitarlo regresaría el problema de acentos en Android y el Bloc de notas de Windows. Hacerlo opcional requeriría una opción en la UI |
| **13** | Baja | `core/mhtml-parser.js:106-116` | Si una parte HTML no declara `Content-Transfer-Encoding`, no se decodifica (default `7bit`) y las secuencias `=XX` quedan crudas | ⚠️ **No se arregla**: la heurística sugerida (`/=[0-9A-Fa-f]{2}/`) da falsos positivos en textos con `=` |

---

## Deuda detectada pero no priorizada

### Bug #14 (candidato) — umbrales de contenido inconsistentes

`extractors/base.js` usa **dos criterios distintos** para decidir si un
contenedor tiene suficiente texto:

| Función | Umbral | Origen |
| --- | --- | --- |
| `extractBySelectors` | **200** caracteres | constante `MIN_CONTENT_LENGTH` |
| `extractGeneric` | **500** caracteres | valor literal en el código |

La constante `MIN_CONTENT_LENGTH` existe pero **no se aplica** en
`extractGeneric`. No es un bug funcional (cada ruta es coherente consigo misma),
pero sí una inconsistencia: un texto de 300 caracteres se extrae por selector y
se descarta por la vía genérica.

**Fix posible**: usar la constante en ambos puntos, y decidir un solo umbral.
Requiere verificar que no cambie el resultado en páginas cortas reales.

---

## Notas de seguridad y privacidad

### Superficie XSS

Está **contenida**. Todo `innerHTML` recibe strings estáticos o valores pasados
por `Vitale.utils.esc()` (que ahora escapa `& < > " '`).

El riesgo es **futuro**: cualquier llamada nueva a `alertMsg`/`showMessage` con
una URL o un nombre sin escapar es XSS inmediato. Regla: **escapar todo valor
dinámico** antes de inyectarlo.

La validación de esquemas de URL vive en `assist-panel.js` (`safeUrl`) y está
cubierta por `tests/url-scheme-safety.test.js`.

### Privacidad

El HTML/MHTML **no se transmite**. La conversión es local.

El único contacto con la red es la **carga del motor** desde el CDN, que filtra
la IP a jsdelivr (o a esm.sh si el primario falla). No hay analítica, ni
telemetría, ni cookies.

---

## Simplificaciones deliberadas

Recortes conscientes hechos para no sobre-construir. No son defectos:

- **Sin punto de quiebre `> 1600px`**: el layout ya centra a `max-width: 1440px`;
  añadir otro breakpoint no cambiaría nada.
- **Sin `100dvh` ni manejo de safe-areas de iOS**: el layout es de documento con
  scroll, no de pantalla completa.
- **Sin `for=` en los `<label>`**: no se pidió accesibilidad formal; los labels
  envuelven o preceden a sus inputs.
- **La barra de estado a 320px** queda en dos filas. Es un ancho extremo; se
  priorizó que nada se desborde por sobre que quepa en una línea.

### Notas de revisión

- `styles.css` y `old/v2/styles.css` tienen reglas idénticas; solo difieren en
  dos líneas de comentario. `old/` se conserva como referencia y **no se
  modifica**.

Siguiente: [Guía de uso](guia-de-uso.md) ·
[Desarrollo](desarrollo.md) ·
[Arquitectura](arquitectura.md)
