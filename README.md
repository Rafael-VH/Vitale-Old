# Vitale — HTML · MHTML → Markdown

Convierte páginas web guardadas (`.mhtml`, `.mht`, `.html`, `.htm`, `.txt`) en Markdown limpio, **100 % en el navegador**. Pensado para leer ficción, artículos y documentos sin conexión: suelta el archivo, pulsa *Convertir*, descarga el `.md`. Nada de tu contenido sale del dispositivo.

> **Estado**: esta es la versión **legacy vanilla-JS** (`Vitale-Old`). Existe un port a **Flutter/Dart** en otro repositorio (proyecto `vitale` en Engram) que es el sucesor objetivo. Este repo se mantiene como referencia de comportamiento y para uso inmediato sin build.

---

## Inicio rápido

1. Abre `index.html` en el navegador —o sirve la carpeta por HTTP:
   ```powershell
   python -m http.server 8080      # luego: http://localhost:8080
   # o:  npx serve .
   ```
2. **Necesita internet al cargar**: el motor de conversión se descarga de un CDN (ver [Limitaciones](#limitaciones-conocidas)).
3. Suelta un archivo `.mhtml`/`.html` (o pega HTML) → **⚡ Convertir a Markdown** → **💾 Descargar .md**.

> Abrir con doble clic (`file://`) **funciona**, incluido el `import()` del CDN. Servir por HTTP solo ayuda si el navegador bloquea módulos remotos o si quieres trabajar sin red.

---

## Arquitectura

App estática **sin build, sin dependencias locales, sin framework**. Todo el código vive en un único namespace global `window.Vitale`. El orden de `<script>` en `index.html` es la única "inyección de dependencias".

### Layout

```
Vitale-Old/
├── index.html              # Shell único (tabs, modal, área de entrada/salida)
├── styles.css              # Tema oscuro completo (variables CSS + media queries)
├── js/
│   ├── main.js             # Bootstrap: inicializa paneles y tabs
│   ├── platform.js         # Detecta Android / iOS / Escritorio
│   ├── site-detector.js    # URL de origen → sitio → cascada de extracción
│   ├── mdream-loader.js    # Carga el motor y expone convert()
│   ├── download-modal.js   # Modal de nombre de archivo + descarga
│   ├── convert-panel.js    # Pestaña "Convertir HTML"
│   ├── assist-panel.js     # Pestaña "Obtener de URL"
│   ├── core/
│   │   ├── utils.js        # esc, alertas, contadores, portapapeles, descarga
│   │   ├── mhtml-parser.js # Detecta y extrae la parte text/html del MHTML
│   │   └── charset.js      # Lectura de archivos con detección de charset
│   └── extractors/
│       ├── registry.js     # Registro central de extractores
│       ├── base.js         # applyExtractor + extractor genérico + cascada
│       └── <sitio>.js      # Un archivo por sitio (ver tabla)
└── old/
    ├── v1/index.html       # v1: monolito de un solo archivo
    └── v2/                 # v2: separación index + main.js + styles.css
```

### Módulos (namespace `Vitale`)

| Módulo | Archivo | Responsabilidad |
| --- | --- | --- |
| `Vitale.utils` | `core/utils.js` | Escape HTML, alertas con autocierre, contadores, portapapeles, descarga de Blob |
| `Vitale.mhtml` | `core/mhtml-parser.js` | `looksLikeMHTML`, `extractHtmlFromMHTML`, decodifica quoted-printable/base64 |
| `Vitale.charset` | `core/charset.js` | `readFileSmart(file)` → string con charset detectado |
| `Vitale.extractors` | `extractors/registry.js` | `register/get/has/list/allDomains/labelOf` |
| `Vitale.extractorBase` | `extractors/base.js` | `extractBySelectors`, `extractGeneric`, `extractMainContent` |
| `Vitale.platform` | `platform.js` | `PLATFORM`, `renderBadge`, `renderAssistSteps` |
| `Vitale.siteDetector` | `site-detector.js` | `prepareHTML`, `extractOriginUrl`, `detectSiteFromUrl`, badges |
| `Vitale.mdream` | `mdream-loader.js` | `load`, `isLoaded`, `convert(html)` |
| `Vitale.downloadModal` | `download-modal.js` | `setup`, `open`, `close`, `confirm` |
| `Vitale.convertPanel` | `convert-panel.js` | Pestaña 1 completa |
| `Vitale.assistPanel` | `assist-panel.js` | Pestaña 2 (guía por plataforma) |

### Orden de carga (index.html)

```
1. core/*        (sin dependencias)
2. extractors/   (registry → base → cada sitio)
3. servicios     (platform → site-detector → mdream-loader → download-modal)
4. paneles       (convert-panel → assist-panel)
5. main.js       (bootstrap, ÚLTIMO)
```

Ningún módulo se desreferencia al cargarse: todos acceden al namespace de forma diferida dentro de funciones, así que el orden solo importa para que existan las claves antes de `main.js`.

---

## Flujo de datos (pipeline)

```
[drop/select]  convert-panel.loadFile(file)
      → charset.readFileSmart(file)                 → string al #htmlInput
[o pegar]      navigator.clipboard.readText()

[btnConvert]   convert-panel.convert()
      → site-detector.prepareHTML(raw)
            si mhtml.looksLikeMHTML(raw):
               → mhtml.extractHtmlFromMHTML(raw)    → { html, parts, htmlPartsFound }
               → extractOriginUrl(raw)              → Snapshot-Content-Location │ Content-Location │ canonical │ og:url
               → detectSiteFromUrl(url)             → clave de sitio o 'unknown'
            → extractorBase.extractMainContent(html, siteKey)
                  1. extractor específico del sitio (selectors → custom)
                  2. extractor genérico (regex)      → última defensa
      → mdream.convert(prepared.html)               → Markdown
      → #mdOutput + habilitar descarga

[btnDownloadMd] downloadModal.open() → confirm() → utils.downloadFile(name, md)
      → Blob (con BOM UTF-8) → <a download> click
```

La conversión ocurre **íntegramente en el cliente**. Solo la descarga del motor (`mdream-loader.js`) toca la red.

---

## Extractores por sitio

| Clave | Label | Dominios | Selectores |
| --- | --- | --- | --- |
| `fanfiction` | Fanfiction | `fanfiction.net` | `#storycontent` + regex `custom` |
| `ao3` | AO3 | `archiveofourown.org` | `#chapters .userstuff(.module)`, `.userstuff` |
| `webnovel` | Webnovel | `webnovel.com` | `.cha-content`, `.cha-words`, `#chapter-content`… |
| `royalroad` | Royal Road | `royalroad.com` | `.chapter-content`, `.chapter-inner` |
| `wikipedia` | Wikipedia | `wikipedia.org` | `#mw-content-text .mw-parser-output` |
| `substack` | Substack | `substack.com` | `.body.markup`, `.available-content .body` |
| `blogger` | Blogger | `blogspot.com` | `.post-body.entry-content`, `.post-body` |

Si el dominio no está cubierto, cae al **extractor genérico**.

---

## Cómo agregar un extractor nuevo

**Se tocan exactamente dos archivos.**

1. **Crear** `js/extractors/<nombre>.js`:
   ```js
   window.Vitale = window.Vitale || {};

   Vitale.extractors.register('<nombre>', {
     label:     '<Label del pill>',        // texto del badge de sitio
     domains:   ['ejemplo.com'],           // string[] usado por site-detector
     selectors: ['#contenido', '.post'],   // CSS en orden de prioridad
     custom:    function(html){ /* → string | null */ }   // opcional
   });
   ```
2. **Editar** `index.html`: agregar `<script src="js/extractors/<nombre>.js"></script>` en la sección **2 (Extractores)**, después de `registry.js` y `base.js`.

Nada más cambia: `allDomains()`, `detectSiteFromUrl`, `labelOf` y el badge lo detectan solos.

### Contrato de `register(name, config)`

- Lanza si falta `name` o `config`. Un `name` duplicado **sobrescribe en silencio** (`Map`).
- `domains` → detección: coincidencia exacta de host **o** `host.endsWith('.' + domain)`.
- `selectors` → `extractBySelectors` usa `DOMParser`, **concatena el contenido de TODOS** los elementos que coincidan y exige un total de innerHTML ≥ `MIN_CONTENT_LENGTH` (200).
- `custom(html)` → se llama **solo si los selectores no dieron resultado**; devuelve HTML o `null`.
- Cascada en `applyExtractor`: **selectors → custom → genérico**.

---

## Decisiones de diseño

| Tema | Decisión |
| --- | --- |
| Build | Cero. HTML + CSS + scripts clásicos; el motor es un `import()` dinámico desde CDN |
| Estado | Sin gestor; el DOM es el estado (valores de inputs + clases) |
| Aislamiento | Un objeto global `Vitale.*`; cada módulo es una IIFE que escribe una sola clave |
| Extracción | Cascada por sitio → genérico, para sobrevivir a cambios de estructura del DOM |
| Salida | Blob con **BOM UTF-8** prependido, para que Android/Notepad muestren bien los acentos |
| Portapapeles | `navigator.clipboard` con fallback a `execCommand` |
| Alertas | `utils.alertMsg` (autocierre a 8 s en éxito) y avisos dinámicos en el panel asistente |
| Comentarios | Encabezados con cajas ASCII e índice por sección; **el código y la doc están en español** |

---

## Limitaciones conocidas

Deuda técnica priorizada (auditoría independiente). Sirve como backlog.

| # | Severidad | Dónde | Problema | Fix sugerido |
| --- | --- | --- | --- | --- |
| 1 | ✅ **RESUELTA** | `mdream-loader.js` | Motor desde CDN con `@latest`, sin pin ni SRI ni fallback offline. Si jsdelivr cae o cambia una release, la app queda inservible; además ejecuta código de terceros con privilegios de la página | **Hecho** (change `pin-mdream-engine-version`): pin `@mdream/js@2.0.3` + fallback esm.sh + error claro. SRI sigue siendo imposible en un `import()` dinámico |
| 2 | ALTA | `download-modal.js:52` | `confirm()` **no** revalida el guard de "sin Markdown / salida de error" (solo lo hace `open()`). Verificado: con `#mdOutput="❌ Error: boom"` descarga el error como `vitale.md` | Repetir el guard al inicio de `confirm()` |
| 3 | ALTA | `extractors/base.js:52` | `extractGeneric` falla con atributos entre comillas simples y con `<div>` anidados (corta en el primer `</div>` y pierde contenido) | Usar `DOMParser` (ya disponible) en vez de regex |
| 4 | ALTA | `core/mhtml-parser.js:40,50` | Ignora el charset declarado en la parte MHTML: siempre decodifica UTF-8 → mojibake en `windows-1252`/`iso-8859-1` | Leer `charset=` de los headers de la parte y pasarlo a `TextDecoder` |
| 5 | ALTA | `core/charset.js:23,27` | `readFileSmart` busca `<meta charset>` solo en los primeros 4 KB; en `.mhtml` el HTML va después de los headers MIME → detección falla | Para MHTML, decodificar la parte HTML con su propio charset |
| 6 | MEDIA | `extractors/registry.js:44`, `site-detector.js:51` | Contaminación de prototipo: `map` es `{}`; `detectSiteFromUrl('http://constructor/')` devuelve una función | `Object.create(null)` + `hasOwnProperty` |
| 7 | MEDIA | `assist-panel.js:62` | `window.open(url)` sin validar esquema; `javascript:`/`data:` son controlables por el usuario | Exigir `^https?://` antes de abrir/copiar |
| 8 | MEDIA | `core/utils.js:82` | El fallback de portapapeles deja el `<textarea>` en el DOM si `execCommand` lanza | Quitar el nodo en un `finally` |
| 9 | BAJA | `extractors/base.js:52` | Falsos negativos con `<article>`/`<main>` sin class/id | Ampliar el genérico |
| 10 | BAJA | `core/utils.js:96` | BOM UTF-8 incondicional ensucia el inicio en algunas tools Markdown | Hacer el BOM opcional |
| 11 | BAJA | `core/utils.js:30` | `esc()` no escapa comillas: seguro solo porque hoy todo uso es contenido, no atributo | Escapar comillas si algún día se usa en atributos |
| 12 | BAJA | `convert-panel.js:219` | `btnClear` toca `className` directo sin pasar por `alertMsg` (bypass del API) | Usar el helper |

### Notas de revisión

- **XSS**: contenido contenido. Todo `innerHTML` recibe strings estáticos o valores pasados por `utils.esc()`. El riesgo es futuro: cualquier llamada nueva a `alertMsg`/`showMessage` con URL o nombre sin escapar es XSS inmediato.
- **Privacidad**: el HTML/MHTML **no** se transmite. Solo la carga del módulo CDN filtra la IP a jsdelivr (o a esm.sh si el primario falla).
- **`styles.css` vs `old/v2/styles.css`**: reglas idénticas; solo difieren 2 líneas de comentario.

---

## Historial de versiones

| Versión | Ubicación | Forma |
| --- | --- | --- |
| v1 | `old/v1/index.html` | Monolito: todo (HTML + CSS + JS) en un archivo |
| v2 | `old/v2/` | Separado en `index.html` + `main.js` + `styles.css`, aún sin módulos |
| **v3 (actual)** | raíz | Modular: `js/core`, `js/extractors`, servicios y paneles; registry de extractores |

---

## Convenciones para contribuir

- **Nuevo módulo**: IIFE que asigna exactamente una clave a `window.Vitale` (p. ej. `Vitale.miModulo = (function(){ ... })()`), exponiendo un objeto con la API pública.
- **Encabezado** con caja ASCII y descripción en español (seguir el estilo existente).
- **Escapar** todo valor dinámico que vaya a `innerHTML` con `Vitale.utils.esc()`.
- **Registrar** scripts en `index.html` en la sección correcta según el orden de dependencia.
- **Extraer** el sitio nuevo con la receta de [Cómo agregar un extractor](#cómo-agregar-un-extractor-nuevo).
- No hay linter ni tests; verifica manualmente en el navegador.

---

## Siguientes pasos sugeridos

- [x] ~~Fijar la versión del motor `@mdream/js` (bug #1 — máxima prioridad de fiabilidad).~~ **Resuelto**: pin a `@mdream/js@2.0.3` + fallback esm.sh (change `pin-mdream-engine-version`).
- [ ] Revalidar el guard en `confirm()` (bug #2).
- [ ] Reemplazar el regex genérico por `DOMParser` (bug #3).
- [ ] Respetar el charset declarado en partes MHTML (bugs #4/#5).
- [ ] Endurecer `detectSiteFromUrl` contra el prototipo (bug #6).
- [ ] Validar esquema de URL en el asistente (bug #7).
