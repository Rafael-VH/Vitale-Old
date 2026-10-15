# Desarrollo

Guía para trabajar en el repositorio: cómo levantarlo, cómo correr los tests y
qué convenciones seguir.

- [Requisitos](#requisitos)
- [Ejecutar la aplicación](#ejecutar-la-aplicación)
- [Tests](#tests)
- [Convenciones de código](#convenciones-de-código)
- [Flujo de trabajo con git](#flujo-de-trabajo-con-git)
- [Despliegue](#despliegue)

---

## Requisitos

| Herramienta | Para qué | Notas |
| --- | --- | --- |
| Un navegador moderno | Ejecutar la app | Chrome, Firefox, Edge o Safari actuales |
| **Node.js** (v18+) | Correr los tests | Los módulos de test usan `node:assert` y `node:fs` |

**No se necesita** gestor de paquetes, bundler, transpilador ni servidor de
desarrollo. No hay `package.json`.

---

## Ejecutar la aplicación

### Opción A — Abrir el archivo directamente

Abre `index.html` en el navegador. Funciona desde `file://` para casi todo.

La excepción es el **portapapeles**: en varios navegadores `file://` no es un
"contexto seguro", así que `navigator.clipboard` puede no estar disponible;
`utils.copyToClipboard` cae entonces a `document.execCommand('copy')`.

### Opción B — Servidor local

Si vas a tocar cosas del portapapeles o del motor, sirve la carpeta por HTTP:

```powershell
# Con Python
python -m http.server 8000

# Con Node (sin instalar nada global)
npx serve .
```

Luego abre `http://localhost:8000`.

> El motor de conversión **sí** requiere conexión a internet: se descarga de un
> CDN la primera vez que se usa en cada sesión.

---

## Tests

No hay framework ni runner. Cada test es un script Node autónomo que usa
`node:assert` y **sale con código 1** si alguna aserción falla.

```text
tests/
├── utils-hardening.test.js     # Vitale.utils: esc, alertas, contadores, descarga
├── generic-semantic.test.js    # extractor genérico con HTML semántico
├── mhtml-charset.test.js       # parser MHTML: boundary, charset, decodificaciones
├── prototype-safety.test.js    # registro de extractores a prueba de contaminación de prototipo
└── url-scheme-safety.test.js   # safeUrl y detección de esquemas peligrosos
```

### Ejecutar uno

```powershell
node tests/utils-hardening.test.js
```

### Ejecutar todos

```powershell
Get-ChildItem tests\*.test.js | ForEach-Object { node $_.FullName; if(-not $?) { throw "FALLÓ: $($_.Name)" } }
```

Al terminar, cada script imprime cuántas aserciones pasaron. Estado actual:
**57 aserciones, todas verdes.**

### Cómo están escritos

Como los módulos dependen del DOM, cada test **simula** el navegador antes de
`require`-ear el archivo bajo prueba:

```js
global.window = globalThis;          // el namespace Vitale cuelga de aquí
global.document = { /* stub mínimo */ };
global.navigator = { /* stub */ };   // a veces requiere defineProperty
```

Por eso se puede testear lógica de navegador en Node sin `jsdom` ni
dependencias. Si tu cambio toca un módulo, agrega su aserción al archivo
correspondiente (o crea uno nuevo siguiendo la misma cabecera).

---

## Convenciones de código

### Estructura de módulo

Cada archivo del proyecto sigue el mismo patrón:

```js
/* ============================================================================
   VITALE — <capa>: <qué hace>
   ----------------------------------------------------------------------------
   <descripción breve>
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.<nombre> = (function(){
  // ... funciones privadas ...

  return { /* API pública */ };
})();
```

- Una sola clave por archivo.
- Nada de `import`/`export`: todo pasa por `window.Vitale`.
- El **orden de los `<script>`** en `index.html` es la inyección de dependencias.

### Estilo

- **Idioma**: código, comentarios y documentación en **español**.
- IIFEs y `const`/`let`; `var` no se usa.
- Funciones con nombre, no flecha, para la API pública.
- Sin linter ni formatter configurados; se sigue el estilo del archivo vecino.

### Seguridad al inyectar HTML

Nunca interpoles datos del usuario en `innerHTML` sin escapar. Usa
`Vitale.utils.esc()`, que escapa `& < > " '`.

Para URLs, usa `Vitale.assistPanel`‑style `safeUrl`: permite solo `http:` y
`https:` y bloquea `javascript:`, `data:`, `vbscript:`, etc. Hay tests
dedicados en `url-scheme-safety.test.js`.

---

## Flujo de trabajo con git

- **Una rama por preocupación**, creada desde `main`.
- **Conventional Commits**, con la descripción **en inglés**:
  `fix(charset): decode mhtml parts with per-part charset`.
- Tipos usados en el historial: `feat`, `fix`, `docs`, `refactor`, `test`,
  `style`, `chore`.
- **Sin atribución de IA** en los commits (nada de `Co-Authored-By`).
- **Nunca `git add -A`**: se listan las rutas explícitas.
- Los merges a `main` se hacen **en local con `--no-ff`**, con un mensaje
  `Merge branch 'rama' (descripción)`.
- **Push y creación de PR requieren confirmación explícita** del responsable.

Ejemplo:

```powershell
git checkout main
git checkout -b fix/mi-cambio
# ... editar ...
node tests/mi-test.test.js
git add js/core/archivo.js tests/mi-test.test.js
git commit -m "fix(scope): descripción en inglés"
git checkout main
git merge --no-ff fix/mi-cambio -m "Merge branch 'fix/mi-cambio' (descripción)"
```

---

## Despliegue

El sitio está publicado con **GitHub Pages**, sirviendo directamente la rama
`main` desde la raíz del repositorio.

- URL: <https://rafael-vh.github.io/Vitale-Old/>
- Configuración: *Deploy from a branch* → `main` → `/ (root)`.
- **No hay workflow de Actions**: es un sitio estático puro.
- El archivo **`.nojekyll`** (vacío, en la raíz) **desactiva Jekyll**. Como la app
  no usa ninguna función de Jekyll (layouts, *front matter*, Liquid), procesarla
  solo añadiría tiempo de build y un modo de fallo: cualquier `{{` o `{%` en un
  `.md` nuevo rompería el deploy entero. Con `.nojekyll`, Pages sirve los
  archivos tal cual.

### Consecuencias a tener en cuenta

- Todo lo que esté **trackeado en git se publica**. Eso incluye la app, `old/`,
  `tests/`, `openspec/` y esta documentación.
- Los enlaces internos deben ser **relativos** (`docs/x.md`, `styles.css`), nunca
  absolutos desde `/`, porque el sitio vive bajo el subdirectorio `/Vitale-Old/`.
- Los archivos `.md` se sirven correctamente (se pueden enlazar desde el
  `README` y desde la app).
- Para publicar, basta con **pushear a `main`**: Pages reconstruye el sitio solo.

Siguiente: [Limitaciones y backlog](limitaciones.md) ·
[Arquitectura](arquitectura.md)
