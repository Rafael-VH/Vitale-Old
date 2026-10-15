# Extractores

Un **extractor** aísla el contenido útil (el capítulo, el artículo) del resto de
la página: menús, cabeceras, comentarios, publicidad. Sin extractores, el motor
de conversión procesaría la página entera y el Markdown saldría lleno de ruido.

- [Cómo funciona la cascada](#cómo-funciona-la-cascada)
- [Sitios soportados](#sitios-soportados)
- [Cómo se detecta el sitio](#cómo-se-detecta-el-sitio)
- [El extractor genérico](#el-extractor-genérico)
- [Cómo agregar un extractor](#cómo-agregar-un-extractor)
- [Contrato de `register`](#contrato-de-register)

---

## Cómo funciona la cascada

`Vitale.extractorBase.extractMainContent(html, siteKey)` decide en este orden:

```text
1. Si el sitio es conocido  → applyExtractor(html, siteKey)
                                 a. cfg.selectors  → extractBySelectors()
                                 b. cfg.custom     → solo si (a) no dio resultado
2. Si nada funcionó         → extractGeneric(html)   ← última defensa
3. Si el genérico no filtró → se devuelve el HTML original tal cual
```

`extractMainContent` devuelve `{ html, method }` donde `method` es uno de:

| `method` | Significado |
| --- | --- |
| `site-selector` | Coincidió un selector CSS del extractor del sitio |
| `site-custom` | Coincidió la función `custom` del extractor del sitio |
| `generic` | Filtró el extractor genérico |
| `none` | No se filtró nada; se devuelve el HTML tal cual |

Ese `method` se muestra al usuario en el mensaje de resultado, así que sirve
para diagnosticar por qué una conversión salió sucia.

### `extractBySelectors(html, selectors)`

1. Parsea el HTML con `DOMParser` — tolera comillas simples o dobles y
   anidamiento real, a diferencia de un regex perezoso.
2. Recorre los selectores **en orden**; el primero que dé resultado gana.
3. Para cada selector, **concatena el `innerHTML` de TODOS los elementos que
   coincidan**. Esto es intencional: en AO3 con `?view_full_work=true` hay varios
   capítulos en la misma página y así se unen todos.
4. Exige que la suma de longitudes **alcance o supere** `MIN_CONTENT_LENGTH`
   (**200** caracteres). Si no, pasa al siguiente selector.

### Aplicación de un extractor

```text
applyExtractor(html, name):
    cfg = registry.get(name)
    if !cfg → null
    if cfg.selectors → extractBySelectors()  → si da resultado: { html, method:'site-selector' }
    if cfg.custom    → cfg.custom(html)      → si da resultado: { html, method:'site-custom' }
    → null   (y la cascada cae al genérico)
```

`custom` es la vía de escape cuando los selectores no bastan. Hoy el único
extractor que lo usa es **Fanfiction.net**: en algunos MHTML el `innerHTML` de
`#storycontent` arrastra residuos que un regex específico limpia mejor.

---

## Sitios soportados

| Clave | Etiqueta | Dominios | Selectores | `custom` |
| --- | --- | --- | --- | --- |
| `fanfiction` | Fanfiction | `fanfiction.net` | `#storycontent` | Sí (regex) |
| `ao3` | AO3 | `archiveofourown.org` | `#chapters .userstuff.module`, `#chapters .userstuff`, `#workskin .userstuff.module`, `.userstuff.module`, `.userstuff` | — |
| `webnovel` | Webnovel | `webnovel.com` | `.cha-content`, `.cha-words`, `#chapter-content`, `.chapter-content` | — |
| `royalroad` | Royal Road | `royalroad.com` | `.chapter-content`, `.chapter-inner` | — |
| `wikipedia` | Wikipedia | `wikipedia.org` | `#mw-content-text .mw-parser-output`, `#mw-content-text` | — |
| `substack` | Substack | `substack.com` | `.body.markup`, `.available-content .body` | — |
| `blogger` | Blogger | `blogspot.com` | `.post-body.entry-content`, `.post-body` | — |

Si el dominio no está cubierto, cae al extractor genérico.

---

## Cómo se detecta el sitio

Dos pasos, ambos en `site-detector.js`.

### 1. Extraer la URL de origen

`extractOriginUrl(mhtml)` prueba, **en este orden**:

| Orden | Fuente | Nota |
| --- | --- | --- |
| 1 | Header `Snapshot-Content-Location:` | Lo añade Chrome al guardar |
| 2 | Cualquier header `Content-Location:` | Solo si empieza por `http://` o `https://` |
| 3 | `<link rel="canonical">` | — |
| 4 | `<meta property="og:url">` | — |

Si ninguna coincide, devuelve `null` y el sitio se trata como `unknown`.

### 2. Resolver el sitio

`detectSiteFromUrl(url)` consulta `Vitale.extractors.allDomains()` y aplica:

```text
1. Coincidencia exacta de host
2. Coincidencia por sufijo:  host === dominio  ||  host.endsWith('.' + dominio)
```

El mapa de dominios se construye con `Object.create(null)` para que un host como
`constructor` o `__proto__` no colisione con propiedades heredadas de
`Object.prototype`, y la búsqueda usa `Object.hasOwn`.

---

## El extractor genérico

`extractGeneric(html)` es la última defensa, para HTML de sitios no cubiertos:

```text
recorre article, main, div en orden de documento:
    si es <article> o <main> → contenedor semántico, no exige class/id
    si no                     → exige que class o id contenga
                                /(story|chapter|post|article|content)/i
    si el innerHTML supera 500 caracteres → devolver
si nada coincide → devolver el HTML original sin tocar
```

Usa `DOMParser`, no regex: un regex perezoso cortaría en el primer `</div>` y
perdería contenido anidado.

`<article>` y `<main>` ya son contenedores semánticos de contenido, así que no se
les exige `class`/`id`. Exigírselo era el falso negativo que dejaba sin extraer
páginas modernas que usan HTML semántico.

> **Nota de deuda técnica:** aquí el umbral es **500** caracteres, mientras que
> `extractBySelectors` usa la constante `MIN_CONTENT_LENGTH` (**200**). Son
> criterios distintos y la constante no se aplica en este punto. Ver
> [Limitaciones](limitaciones.md).

---

## Cómo agregar un extractor

**Se tocan exactamente dos archivos.**

### 1. Crear `js/extractors/<nombre>.js`

```js
/* ============================================================================
   VITALE — Extractor: <Nombre del sitio>
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractors.register('<nombre>', {
  label:     '<Etiqueta del pill>',        // texto del badge de sitio
  domains:   ['ejemplo.com'],              // string[] usado por site-detector
  selectors: ['#contenido', '.post'],      // CSS, en orden de prioridad
  custom:    function(html){ /* → string | null */ }   // opcional
});
```

### 2. Registrar el script en `index.html`

Añadir la línea en la **sección 2 (Extractores)**, después de `registry.js` y
`base.js`:

```html
<script src="js/extractors/<nombre>.js"></script>
```

Nada más cambia: `allDomains()`, `detectSiteFromUrl`, `labelOf` y el badge lo
detectan solos, porque el extractor se auto-registra al cargarse.

### Cómo encontrar los selectores

1. Abre una página del sitio en el navegador.
2. Inspecciona el contenedor del texto (clic derecho → *Inspeccionar*).
3. Anota el `id` o la `class` **más específicos** que envuelvan solo el contenido.
4. Ponlos en `selectors`, del más específico al más genérico.

---

## Contrato de `register`

```text
register(name, config)
```

- Lanza un error si falta `name` o `config`.
- Un `name` duplicado **sobrescribe en silencio** (es un `Map`).

`config`:

| Campo | Tipo | Uso |
| --- | --- | --- |
| `label` | `string` | Texto del badge de sitio. Si falta, se capitaliza el nombre |
| `domains` | `string[]` | Dominios que cubre, usados por `detectSiteFromUrl` |
| `selectors` | `string[]` | Selectores CSS, en orden de prioridad |
| `custom` | `(html) => string \| null` | Se llama **solo** si los selectores no dieron resultado |

### API de `Vitale.extractors`

| Método | Devuelve |
| --- | --- |
| `register(name, config)` | — (registra o sobrescribe) |
| `get(name)` | La config, o `undefined` |
| `has(name)` | `boolean` |
| `list()` | `string[]` con los nombres registrados |
| `allDomains()` | Mapa `dominio → nombre` sin prototipo |
| `labelOf(name)` | Etiqueta legible para el pill |

En desarrollo, `main.js` imprime los extractores registrados al arrancar:
`[Vitale] Extractores registrados: [...]`.

Siguiente: [MHTML y codificaciones](mhtml-y-charsets.md) ·
[Arquitectura](arquitectura.md)
