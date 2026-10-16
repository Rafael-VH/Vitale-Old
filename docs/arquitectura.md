# Arquitectura

Vitale es una aplicación **estática**: HTML + CSS + JavaScript clásico. No hay
build, no hay gestor de paquetes, no hay framework, no hay bundler. Clonar el
repositorio y abrir `index.html` es todo lo que hace falta.

- [Principios de diseño](#principios-de-diseño)
- [Estructura de archivos](#estructura-de-archivos)
- [Módulos](#módulos)
- [Orden de carga](#orden-de-carga)
- [Flujo de datos](#flujo-de-datos)
- [Gestión de estado](#gestión-de-estado)
- [Sistema visual](#sistema-visual)
- [Decisiones de diseño](#decisiones-de-diseño)

---

## Principios de diseño

1. **Cero build.** Sin transpilación, sin bundling, sin paso de compilación. Lo
   que hay en el repositorio es exactamente lo que corre en el navegador.
2. **Cero dependencias locales.** El único código de terceros es el motor de
   conversión, y se carga en tiempo de ejecución desde un CDN.
3. **Un namespace global.** Todo vive bajo `window.Vitale`. Cada archivo es una
   IIFE que escribe exactamente una clave.
4. **El orden de los `<script>` es la inyección de dependencias.** No hay
   import/export entre módulos propios.
5. **El DOM es el estado.** No hay store, ni observables, ni reactividad: el
   valor de los inputs y las clases CSS *son* el estado de la aplicación.

---

## Estructura de archivos

```text
Vitale-Old/
├── index.html              # Shell único: barra de estado, panel y 2 modales
├── styles.css              # Tema oscuro completo (variables CSS + media queries)
├── js/
│   ├── main.js             # Bootstrap: carga el motor e inicializa los paneles
│   ├── platform.js         # Detección Android / iOS / escritorio
│   ├── site-detector.js    # URL de origen → sitio → cascada de extracción
│   ├── mdream-loader.js    # Carga el motor y expone convert()
│   ├── download-modal.js   # Modal de nombre de archivo y descarga
│   ├── convert-panel.js    # Panel de conversión
│   ├── assist-panel.js     # Guía "Obtener el HTML" (modal)
│   ├── core/
│   │   ├── utils.js        # esc, alertas, contadores, portapapeles, descarga
│   │   ├── mhtml-parser.js # Detecta y extrae la parte text/html del MHTML
│   │   └── charset.js      # Lectura de archivos con detección de codificación
│   └── extractors/
│       ├── registry.js     # Registro central de extractores
│       ├── base.js         # applyExtractor + extractor genérico + cascada
│       └── <sitio>.js      # Un archivo por sitio soportado
├── docs/                   # Esta documentación
├── tests/                  # Scripts Node sin framework
└── old/
    ├── v1/index.html       # v1: monolito de un solo archivo
    └── v2/                 # v2: index + main.js + styles.css
```

---

## Módulos

Todos los módulos son IIFEs que asignan una sola clave a `window.Vitale`.

| Módulo | Archivo | Responsabilidad |
| --- | --- | --- |
| `Vitale.utils` | `core/utils.js` | Escape HTML, alertas con autocierre, contadores, portapapeles, descarga por Blob |
| `Vitale.mhtml` | `core/mhtml-parser.js` | `looksLikeMHTML`, `extractHtmlFromMHTML`, decodificación quoted-printable/base64 |
| `Vitale.charset` | `core/charset.js` | `readFileSmart(file)` → string con codificación detectada |
| `Vitale.extractors` | `extractors/registry.js` | `register/get/has/list/allDomains/labelOf` |
| `Vitale.extractorBase` | `extractors/base.js` | `extractBySelectors`, `extractGeneric`, `extractMainContent` |
| `Vitale.platform` | `platform.js` | `PLATFORM`, `renderBadge`, `renderAssistSteps` |
| `Vitale.siteDetector` | `site-detector.js` | `prepareHTML`, `extractOriginUrl`, `detectSiteFromUrl`, badges |
| `Vitale.mdream` | `mdream-loader.js` | `load`, `isLoaded`, `convert(html)` |
| `Vitale.downloadModal` | `download-modal.js` | `setup`, `open`, `close`, `confirm` |
| `Vitale.convertPanel` | `convert-panel.js` | Panel de conversión completo |
| `Vitale.assistPanel` | `assist-panel.js` | Guía en modal para obtener el HTML (por plataforma) |

Detalle del subsistema de extracción en [Extractores](extractores.md); el del
formato MHTML en [MHTML y codificaciones](mhtml-y-charsets.md).

---

## Orden de carga

Definido en `index.html`, al final del `<body>`:

```text
1. core/*        utils → mhtml-parser → charset        (sin dependencias)
2. extractors/   registry → base → cada sitio          (cada sitio se auto-registra)
3. servicios     platform → site-detector → mdream-loader → download-modal
4. paneles       convert-panel → assist-panel
5. main.js       bootstrap (ÚLTIMO)
```

**Por qué funciona sin un sistema de módulos:** ningún archivo desreferencia
otro namespace al cargarse. Todos los accesos a `Vitale.*` están *dentro de
funciones*, así que se resuelven en tiempo de llamada. El orden solo importa para
que las claves existan antes de que `main.js` las invoque en `init()`.

La excepción son los **extractores**: cada `<sitio>.js` llama a
`Vitale.extractors.register(...)` en el momento de cargarse, así que
`registry.js` **debe** ir antes.

---

## Flujo de datos

```text
[cargar archivo]   convert-panel.loadFile(file)
      → charset.readFileSmart(file)            → string al #htmlInput
      → site-detector.updateFormatBadge()      → pills de formato y sitio

[pegar]            navigator.clipboard.readText() → #htmlInput

[btnConvert]       convert-panel.convert()
      → site-detector.prepareHTML(raw)
            si mhtml.looksLikeMHTML(raw):
               → mhtml.extractHtmlFromMHTML(raw)   → { html, parts, htmlPartsFound }
               → extractOriginUrl(raw)             → Snapshot-Content-Location │
                                                     Content-Location │ canonical │ og:url
               → detectSiteFromUrl(url)            → clave de sitio o 'unknown'
            → extractorBase.extractMainContent(html, siteKey)
                  1. extractor específico del sitio (selectors → custom)
                  2. extractor genérico               ← última defensa
      → mdream.convert(prepared.html)          → Markdown
      → #mdOutput + habilitar botón de descarga

[btnDownloadMd]    downloadModal.open() → confirm()
      → utils.downloadFile(nombre, md)         → Blob con BOM → <a download>
```

La conversión es **íntegramente local**. El único tráfico de red es la descarga
del motor (`mdream-loader.js`).

---

## Gestión de estado

No hay capa de estado. Los "datos" de la aplicación son:

| Estado | Dónde vive |
| --- | --- |
| HTML/MHTML de entrada | `value` de `#htmlInput` |
| Markdown resultante | `textContent` de `#mdOutput` |
| Guía de obtención abierta | clase `.show` en `#assistModal` |
| Motor cargado | variable `loaded` dentro de `Vitale.mdream` |
| Conversión en curso | variable `processing` dentro de `Vitale.convertPanel` |
| Alertas | clases del elemento `#convertAlert` |

Consecuencia práctica: recargar la página **borra todo**. No hay persistencia
(no se usa `localStorage`).

---

## Sistema visual

Definido en `styles.css` con variables CSS en `:root`:

- **Colores**: `--bg`, `--surface`, `--border`, `--text`, `--text-dim`,
  `--accent` (turquesa `#5eead4`), `--accent-2` (índigo `#818cf8`),
  `--success`, `--error`, `--warn`.
- **Formas**: `--radius` (14px), `--radius-sm` (9px).
- **Sombras**: `--shadow-sm`, `--shadow`, `--shadow-lg`.

Es un tema **oscuro** único; no hay conmutador claro/oscuro.

### Responsive

El layout es de una columna fluida con un ancho máximo, y pasa a dos columnas
(`.grid-2`) en pantallas anchas. Puntos de quiebre:

| Ancho | Qué cambia |
| --- | --- |
| `> 820px` | Layout a dos columnas, botones en fila |
| `≤ 820px` | `.grid-2` a una columna; todos los botones llegan a 44px de alto; `background-attachment` a `scroll` (evita el jank de scroll en iOS) |
| `≤ 640px` | Encabezados de campo apilados; botones de acción principal y del asistente a ancho completo |
| `≤ 480px` | Modal con padding reducido y acciones apiladas; barra de estado más densa |
| `prefers-reduced-motion` | Desactiva animaciones |

Los botones usan `border: 1px solid transparent` en lugar de `border: none`
para que un botón deshabilitado no cambie de tamaño, y `.btn` fija
`white-space: nowrap` para que las etiquetas no se partan en dos líneas.

---

## Decisiones de diseño

| Tema | Decisión |
| --- | --- |
| Build | Cero. HTML + CSS + scripts clásicos; el motor es un `import()` dinámico desde CDN |
| Estado | Sin gestor; el DOM es el estado |
| Aislamiento | Un objeto global `Vitale.*`; cada módulo es una IIFE que escribe una sola clave |
| Extracción | Cascada por sitio → genérico, para sobrevivir a cambios de estructura del DOM |
| Salida | Blob con BOM UTF-8 prependido, para que Android y el Bloc de notas muestren bien los acentos |
| Portapapeles | `navigator.clipboard` con fallback a `document.execCommand('copy')` |
| Alertas | `utils.alertMsg` (autocierre a 8 s en los mensajes de éxito) y avisos dinámicos en la guía de obtención |
| Motor | Versión fijada (`@mdream/js@2.0.3`) con CDN de respaldo, para no depender de una release móvil |
| Idioma | El código, los comentarios y la documentación están en español |

### Historial de versiones

| Versión | Ubicación | Forma |
| --- | --- | --- |
| v1 | `old/v1/index.html` | Monolito: HTML + CSS + JS en un solo archivo |
| v2 | `old/v2/` | Separado en `index.html` + `main.js` + `styles.css`, aún sin módulos |
| **v3 (actual)** | raíz | Modular: `js/core`, `js/extractors`, servicios y paneles; registry de extractores |

Las carpetas `old/` se conservan como referencia del origen del proyecto y **no
se modifican**.

Siguiente: [Extractores](extractores.md) ·
[MHTML y codificaciones](mhtml-y-charsets.md) ·
[Desarrollo](desarrollo.md)
