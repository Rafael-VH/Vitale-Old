# Vitale — HTML · MHTML → Markdown

Convierte páginas web guardadas (`.mhtml`, `.mht`, `.html`, `.htm`, `.txt`) en
Markdown limpio, **100 % en el navegador**. Pensado para leer ficción, artículos
y documentos sin conexión: sueltas el archivo, pulsas *Convertir* y descargas el
`.md`. Nada de tu contenido sale del dispositivo.

**Demo en vivo:** <https://rafael-vh.github.io/Vitale-Old/>

> **Estado**: esta es la versión **legacy vanilla-JS** (`Vitale-Old`). Existe un
> port a **Flutter/Dart** en otro repositorio que es el sucesor objetivo. Este
> repo se mantiene como referencia de comportamiento y para uso inmediato sin
> build.

---

## ¿Por qué existe?

Los navegadores **no pueden descargar una página externa** por ti: la política de
CORS lo prohíbe. Por eso Vitale no recibe una URL, recibe la página **ya
guardada**. Así la conversión ocurre entera en tu equipo y nada se sube a ningún
servidor.

Contexto completo en la [Guía de uso](docs/guia-de-uso.md).

---

## Tecnologías

- **HTML5 + CSS3** — variables CSS, grid, flexbox y media queries; tema oscuro.
- **JavaScript ES6+ vanilla** — sin framework, sin bundler, **sin build**.
- Módulos como IIFEs bajo un único namespace global `window.Vitale`.
- **Motor de conversión**: [`@mdream/js@2.0.3`](https://github.com/huggingface/mdream),
  cargado por `import()` dinámico desde CDN con CDN de respaldo.
- **Tests**: scripts de Node sin framework (57 aserciones).
- **Publicación**: GitHub Pages, sirviendo la rama `main`.

---

## Cómo se usa

1. Abre la [demo](https://rafael-vh.github.io/Vitale-Old/) o `index.html` en tu
   navegador.
2. Guarda la página que quieras convertir (en escritorio <kbd>Ctrl</kbd>+<kbd>S</kbd>
   → *"Página web, un solo archivo (.mhtml)"*).
3. Suelta el archivo (o pega el HTML).
4. **⚡ Convertir a Markdown** → **💾 Descargar .md**.

Instrucciones por plataforma (Android, iOS y escritorio) en la
[Guía de uso](docs/guia-de-uso.md).

> El motor se descarga de un CDN la primera vez por sesión, así que la app
> **necesita internet al cargar**. La conversión, después, es local.

---

## ¿Para qué casos sirve?

| Caso | Ejemplo |
| --- | --- |
| Leer ficción sin conexión | Fanfiction.net, AO3, Webnovel, Royal Road |
| Guardar artículos y blogs | Substack, Blogger, cualquier blog |
| Citar y conservar referencias | Wikipedia |
| Convertir cualquier página guardada | Extractor genérico para sitios no cubiertos |
| Alimentar tu editor | Obsidian, Notion, Logseq, etc. |

Vitale detecta el sitio de origen y aplica un extractor específico que aísla el
contenido del ruido (menús, comentarios, publicidad). Ver
[Extractores](docs/extractores.md).

---

## Estructura del proyecto

```text
Vitale-Old/
├── index.html          # Shell: barra de estado, 2 pestañas, modal de descarga
├── styles.css          # Tema oscuro completo (variables CSS + media queries)
├── js/
│   ├── core/           # utils, parser MHTML, detección de charset
│   ├── extractors/     # registry + base + un archivo por sitio
│   ├── *.js            # servicios y paneles
│   └── main.js         # bootstrap
├── docs/               # Documentación (esta tabla)
├── tests/              # Scripts de Node sin framework
└── old/                # Versiones anteriores (v1, v2) — no se modifican
```

---

## Documentación

| Documento | Qué cubre |
| --- | --- |
| [Guía de uso](docs/guia-de-uso.md) | Flujo completo, por plataforma y por qué hay que guardar la página |
| [Arquitectura](docs/arquitectura.md) | Módulos, orden de carga, flujo de datos, sistema visual y decisiones |
| [Extractores](docs/extractores.md) | Cómo funciona la cascada y cómo agregar un sitio nuevo |
| [MHTML y codificaciones](docs/mhtml-y-charsets.md) | Parser MHTML, quoted-printable, base64 y charsets |
| [Desarrollo](docs/desarrollo.md) | Entorno, tests, convenciones de código y flujo de git |
| [Limitaciones y backlog](docs/limitaciones.md) | Bordes conocidos, deuda técnica y notas de seguridad |

---

## Historial de versiones

| Versión | Ubicación | Forma |
| --- | --- | --- |
| v1 | `old/v1/index.html` | Monolito: HTML + CSS + JS en un archivo |
| v2 | `old/v2/` | Separado en `index.html` + `main.js` + `styles.css`, sin módulos |
| **v3 (actual)** | raíz | Modular: `js/core`, `js/extractors`, servicios y paneles |

Las carpetas `old/` se conservan como referencia del origen del proyecto.
