# MHTML y codificaciones

Cuando el navegador guarda una página como *"Página web, un solo archivo"*
produce un `.mhtml`: un archivo MIME `multipart/related` que empaqueta el HTML y
todos sus recursos (CSS, imágenes, fuentes) en un solo documento.

Vitale no convierte el MHTML directamente. Primero **extrae la parte HTML** y la
entrega limpia al motor de Markdown.

- [Detección](#detección)
- [Extracción de la parte HTML](#extracción-de-la-parte-html)
- [Codificaciones de transferencia](#codificaciones-de-transferencia)
- [Codificaciones de caracteres](#codificaciones-de-caracteres)
- [Casos borde](#casos-borde)

---

## Detección

`Vitale.mhtml.looksLikeMHTML(text)` inspecciona **solo los primeros 2000
caracteres** (barato, no recorre todo el archivo) y devuelve `true` si coincide
cualquiera de estos tres patrones:

| # | Patrón | Cuándo aparece |
| --- | --- | --- |
| 1 | `/From:\s*<Saved by Blink>/i` | Chrome / Edge al guardar la página |
| 2 | `/Content-Type:\s*multipart\/related/i` | Cualquier MHTML con cabecera de tipo |
| 3 | `/^From:\s*.*\r?\n.*MIME-Version:\s*1\.0/im` | Firefox y otros guardados MIME |

Si ninguno coincide, el texto se trata como HTML plano y se salta el parser.

---

## Extracción de la parte HTML

`Vitale.mhtml.extractHtmlFromMHTML(mhtml)` devuelve
`{ html, parts, htmlPartsFound }` o `null`.

### 1. Encontrar el separador (boundary)

```text
boundary="xxx"   →  MIME estándar entre comillas
boundary=xxx     →  variante sin comillas
```

**Si no hay boundary**, el archivo quizá sea HTML con cabeceras MIME delante. Se
busca el primer `<!DOCTYPE html` o `<html …>` y se corta desde ahí:

```text
{ html: mhtml.slice(idx), parts: 1, htmlPartsFound: 1 }
```

Si tampoco se encuentra, devuelve `null`.

### 2. Dividir en partes

Se corta el texto por cada `--<boundary>` y se descarta el preámbulo
(`.slice(1)`). Cada parte tiene cabeceras y cuerpo separados por una línea en
blanco, que puede ser `\r\n\r\n` (CRLF, lo habitual) o `\n\n` (LF).

### 3. Filtrar y decodificar

Para cada parte:

1. Solo se consideran las de `Content-Type: text/html` (las imágenes y CSS se
   ignoran).
2. Se lee su `Content-Transfer-Encoding` y su `charset` **de esa parte**.
3. Se decodifica el cuerpo según corresponda.

### 4. Elegir y delimitar

- De todas las partes HTML se queda la **de mayor longitud** (`body.length >
  bestHtml.length`). Es una heurística sólida: el documento real suele ser el más
  grande con diferencia.
- Si el cuerpo quedó con el `--<boundary>` final pegado, se corta ahí.
- Se devuelve `{ html: bestHtml.trim(), parts, htmlPartsFound }`.

> `parts` cuenta **todas** las partes del archivo (incluidas imágenes y CSS);
> `htmlPartsFound` cuenta solo las HTML.

---

## Codificaciones de transferencia

### `base64`

`decodeBase64(str, charset)`:

```text
1. Quita todo el espacio en blanco
2. atob() → string binario
3. Cada charCode → byte de un Uint8Array
4. safeDecode(bytes, charset)
```

Si algo falla, devuelve el texto original sin tocar (no rompe la conversión).

### `quoted-printable`

`decodeQuotedPrintable(str, charset)`:

```text
1. Elimina las continuaciones de línea suaves ("=\r\n" y "=\n")
2. Recorre el texto acumulando BYTES:
     "=XX"  →  byte 0xXX
     otro   →  charCodeAt(i) & 0xFF
3. Decodifica TODOS los bytes de una pasada con safeDecode(bytes, charset)
```

Acumular bytes y decodificar en una sola pasada es lo correcto: preserva los
caracteres multi-byte de UTF-8 (`C3 A1` → `á`) y también los bytes altos de
`windows-1252` / `iso-8859-1`. Forzar UTF-8 byte a byte producía *mojibake*
(`Ã¡` en lugar de `á`).

### `safeDecode`

```js
new TextDecoder(charset || 'utf-8', { fatal: false })
```

`TextDecoder` lanza `RangeError` si el label no es válido. `safeDecode` lo
captura y cae a UTF-8 en lugar de abortar la conversión. `fatal: false` hace que
los bytes inválidos se sustituyan por `�` en vez de lanzar.

---

## Codificaciones de caracteres

Hay **dos capas** de detección, y en MHTML la de la parte gana.

### En un archivo cargado — `Vitale.charset.readFileSmart(file)`

```text
1. file.arrayBuffer()
2. Previsualiza los primeros 4096 bytes como UTF-8
3. Busca  <meta … charset=…>  con
      /<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i
4. Si el detectado está en la lista blanca → se usa; si no → UTF-8
5. Decodifica el buffer completo con TextDecoder(charset, { fatal:false })
   y, si falla, reintenta con UTF-8
```

Lista blanca (`SUPPORTED`): `utf-8`, `utf8`, `iso-8859-1`, `latin1`,
`windows-1252`, `windows-1251`, `shift_jis`, `euc-jp`, `gbk`, `big5`,
`koi8-r`. `utf8` se normaliza a `utf-8`.

### Dentro de un MHTML — por parte

Cada parte declara su charset en su propio `Content-Type`. El parser lo extrae
con:

```text
Content-Type: text/html; charset=windows-1252
                            ^^^^^^^^^^^^^^^^  →  gana sobre el del archivo
```

Si la parte no declara charset, se asume `utf-8`. El charset **del archivo
completo** no se usa para las partes: en MHTML cada parte puede traer el suyo.

---

## Casos borde

| Caso | Comportamiento |
| --- | --- |
| Sin `boundary` pero con `<html>` | Se corta desde la etiqueta y se trata como HTML |
| Sin `boundary` ni `<html>` | `null` → el texto se usa como HTML plano |
| Ninguna parte es `text/html` | `null` |
| Cuerpo `7bit`/`8bit` sin `charset` declarado | Se codifica como UTF-8 (ver limitación conocida) |
| Charset inválido o desconocido | `safeDecode` cae a UTF-8 |
| Varias partes HTML | Se elige la de mayor longitud |
| Base64 corrupto | Se devuelve el texto crudo sin tocar |

Siguiente: [Extractores](extractores.md) ·
[Desarrollo](desarrollo.md)
