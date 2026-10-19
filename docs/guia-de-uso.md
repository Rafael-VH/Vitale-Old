# Guía de uso

Vitale convierte **una página web ya guardada** en Markdown limpio. Esta guía
explica el flujo completo, incluido el paso que suele sorprender: **por qué hay
que guardar la página antes** en lugar de simplemente pegar su URL.

- [Por qué hay un paso manual](#por-qué-hay-un-paso-manual)
- [Flujo en escritorio](#flujo-en-escritorio)
- [Flujo en Android](#flujo-en-android)
- [Flujo en iOS](#flujo-en-ios)
- [El panel y la guía](#el-panel-y-la-guía)
- [Guardar el resultado](#guardar-el-resultado)
- [Límites](#límites)

---

## Por qué hay un paso manual

Los navegadores aplican la política de **CORS**: una página abierta no puede
leer el contenido de otra página de un dominio distinto. Por eso la app no
puede "descargar" una URL y convertirla directamente: el navegador se lo
prohibiría.

La solución es darle el contenido ya en mano:

```text
1. Tú guardas la página        →  archivo .mhtml (o .html)
2. Lo sueltas en Vitale        →  conversión 100 % local
3. Descargas el .md            →  listo para leer o pegar en tu editor
```

En móvil hay un segundo motivo: **Android** asocia ciertos dominios a sus apps
instaladas, así que tocar un enlace puede abrir la app en lugar del navegador.
Por eso la guía *¿Cómo obtengo el archivo?* empuja a **copiar** la URL y pegarla
a mano.

El contenido **nunca sale del dispositivo**. Lo único que toca la red es la
descarga inicial del motor de conversión desde un CDN (ver
[Limitaciones](limitaciones.md)).

---

## Flujo en escritorio

### Opción A — Guardar la página (recomendado)

1. Abre la página que quieras convertir.
2. <kbd>Ctrl</kbd>+<kbd>S</kbd> → en *Guardar como*, elige **"Página web, un solo
   archivo (*.mhtml)"**.
3. Arrastra ese `.mhtml` a Vitale (o haz clic en el recuadro de carga).
4. Pulsa **Convertir a Markdown** → **Descargar .md**.

### Opción B — Copiar el código fuente

1. Abre la página y pulsa <kbd>Ctrl</kbd>+<kbd>U</kbd> (o clic derecho →
   *Ver código fuente*).
2. <kbd>Ctrl</kbd>+<kbd>A</kbd> → <kbd>Ctrl</kbd>+<kbd>C</kbd>.
3. Vuelve a Vitale y pega con <kbd>Ctrl</kbd>+<kbd>V</kbd> en el panel *Convertir
   HTML*.

> La opción A conserva mejor el contenido y permite detectar el sitio de origen
> para usar su extractor específico.

---

## Flujo en Android

1. Abre la guía con el botón **❔ ¿Cómo obtengo el archivo?** y pulsa
   **Copiar URL**. Esto copia el enlace **sin abrirlo**, evitando que Android lo
   redirija a la app instalada.
2. Abre **Chrome** o **Firefox**, pega la URL y pulsa Enter.
3. Menú <kbd>⋮</kbd> → **Descargar página**. Se guardará como `.mhtml`.
4. Vuelve a Vitale, pulsa **Ir a pegar HTML** y usa el recuadro de carga para
   seleccionar el archivo descargado.
5. Pulsa **Convertir a Markdown** → **Descargar .md**.

Si al pulsar *Intentar abrir* se abrió una app en lugar del navegador, ciérrala
y usa *Copiar URL*: es el comportamiento documentado en la propia guía.

---

## Flujo en iOS

1. Pulsa **Copiar URL**.
2. Abre **Safari**, pega la URL y pulsa Enter.
3. Botón **Compartir** → **Opciones** → **Página web** → **Guardar en Archivos**.
4. Vuelve a Vitale, pulsa **Ir a pegar HTML** y usa el recuadro de carga.
5. Pulsa **Convertir a Markdown** → **Descargar .md**.

---

## El panel y la guía

### Panel de conversión

El panel principal. Acepta tres vías de entrada:

| Vía | Cómo |
| --- | --- |
| Arrastrar y soltar | Suelta el archivo sobre el recuadro punteado |
| Selector nativo | Clic en el recuadro → se abre el selector del sistema |
| Pegar | Botón **Pegar** (o pegado manual en el área de texto) |

Al cargar un archivo, la app:

- Detecta la codificación de caracteres.
- Marca el badge de formato (**HTML** o **MHTML detectado**).
- Si es MHTML y reconoce el dominio, muestra el badge de sitio y avisa que se
  usará su extractor específico.

### Guía "Obtener el HTML" (modal)

Se abre desde el botón **❔ ¿Cómo obtengo el archivo?**, bajo el recuadro de
carga. Es una guía interactiva para el flujo manual: no descarga nada por sí
sola, copia la URL, ofrece intentar abrirla, y muestra los pasos adaptados a tu
plataforma (Android, iOS o escritorio). Se cierra con **Cerrar**, <kbd>Esc</kbd>
o tocando fuera de la tarjeta. **Ir a pegar HTML** cierra la guía y baja hasta el
recuadro de carga.

---

## Guardar el resultado

El recuadro **Markdown resultante** es editable: puedes corregir el texto antes
de descargarlo o copiarlo. Se guarda y se copia siempre lo que ves ahí, con tus
correcciones incluidas.

El botón **Descargar .md** abre un modal donde eliges el nombre del archivo:

- Si cargaste un archivo, el nombre se propone a partir de él (sin la extensión
  original).
- El nombre se **sanea**: se quitan los caracteres no válidos en Windows
  (`\ / : * ? " < > |`) y se corta a 80 caracteres.
- La extensión `.md` se añade sola.
- <kbd>Enter</kbd> confirma, <kbd>Esc</kbd> cancela.

El archivo se guarda con **BOM UTF-8** al principio. Esto es deliberado: sin
BOM, visores como el Bloc de notas de Windows o algunas apps de Android asumen
Latin-1 y muestran mal los acentos (`Ã¡`, `Ã©`).

---

## Límites

| Límite | Valor | Comportamiento |
| --- | --- | --- |
| Tamaño de archivo | 10 MB | Pide confirmación antes de leerlo |
| Tamaño de HTML pegado | 3 000 000 caracteres | Pide confirmación antes de convertir |
| Procesamiento simultáneo | 1 conversión | El botón se bloquea mientras trabaja |
| Conexión a internet | Necesaria al cargar | El motor se descarga de un CDN una vez por sesión |

Formatos aceptados: `.mhtml`, `.mht`, `.html`, `.htm`, `.txt`.

Siguiente: [Arquitectura](arquitectura.md) ·
[Limitaciones y backlog](limitaciones.md)
