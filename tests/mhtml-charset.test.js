/* ============================================================================
   VITALE — Check del charset declarado por parte en MHTML.
   ----------------------------------------------------------------------------
   Sin framework:  node tests/mhtml-charset.test.js
   Sale con código 1 si alguna aserción falla.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

// Los módulos escriben en `window.Vitale`; los cargamos con un shim mínimo.
global.window = globalThis;
const loadModule = (rel) =>
  eval(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

loadModule('js/core/mhtml-parser.js');
loadModule('js/core/charset.js');

const { extractHtmlFromMHTML, decodeQuotedPrintable, looksLikeMHTML } =
  globalThis.Vitale.mhtml;
const { readFileSmart } = globalThis.Vitale.charset;

/** Arma un MHTML mínimo con una sola parte. */
function mhtml(partHeaders, body){
  return [
    'From: <Saved by Blink>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/related; boundary="----B"',
    '',
    '------B',
    partHeaders,
    '',
    body,
    '',
    '------B--',
    ''
  ].join('\r\n');
}

let pass = 0;
let fail = 0;

function report(name, err){
  if(err){
    console.log('  FAIL ' + name);
    console.log('       ' + err.message);
    fail++;
  }else{
    console.log('  ok   ' + name);
    pass++;
  }
}

function check(name, fn){
  try{
    fn();
    report(name);
  }catch(e){
    report(name, e);
  }
}

async function checkAsync(name, fn){
  try{
    await fn();
    report(name);
  }catch(e){
    report(name, e);
  }
}

(async () => {

  // --- El bug reportado: la parte declara windows-1252 y se decodificaba como UTF-8 ---

  check('quoted-printable + windows-1252 decodifica é y ñ', () => {
    const src = mhtml(
      'Content-Type: text/html; charset=windows-1252\r\n' +
      'Content-Transfer-Encoding: quoted-printable',
      '<html><body><div class="content">Caf=E9 a=F1e</div></body></html>'
    );
    const res = extractHtmlFromMHTML(src);
    assert.ok(res, 'debe extraer una parte HTML');
    assert.ok(res.html.includes('Café añe'),
      'esperaba "Café añe"; obtuve ' + JSON.stringify(res.html.slice(-70)));
    assert.ok(!res.html.includes('\uFFFD'),
      'no debe haber caracteres de reemplazo (mojibake)');
  });

  check('base64 + windows-1252 decodifica é y ñ', () => {
    // "Café añe" en windows-1252: C a f é(0xE9) espacio a ñ(0xF1) e
    const bytes = Buffer.from([0x43, 0x61, 0x66, 0xE9, 0x20, 0x61, 0xF1, 0x65]);
    const src = mhtml(
      'Content-Type: text/html; charset=windows-1252\r\n' +
      'Content-Transfer-Encoding: base64',
      bytes.toString('base64')
    );
    const res = extractHtmlFromMHTML(src);
    assert.ok(res, 'debe extraer una parte HTML');
    assert.ok(res.html.includes('Café añe'),
      'esperaba "Café añe"; obtuve ' + JSON.stringify(res.html));
  });

  check('quoted-printable + iso-8859-1 decodifica é', () => {
    const src = mhtml(
      'Content-Type: text/html; charset=iso-8859-1\r\n' +
      'Content-Transfer-Encoding: quoted-printable',
      '<div class="content">Caf=E9</div>'
    );
    const res = extractHtmlFromMHTML(src);
    assert.ok(res && res.html.includes('Café'),
      'esperaba "Café"; obtuve ' + JSON.stringify(res && res.html));
  });

  check('el charset de la parte tiene prioridad sobre el del archivo', () => {
    // Dos partes HTML con charsets distintos: debe ganar el declarado por cada
    // una, no un valor global.
    const src = [
      'From: <Saved by Blink>',
      'MIME-Version: 1.0',
      'Content-Type: multipart/related; boundary="----B"',
      '',
      '------B',
      'Content-Type: text/html; charset=windows-1252',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      '<div class="content">Caf=E9</div>',
      '',
      '------B',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      '<div class="content">Caf=C3=A9</div>',
      '',
      '------B--',
      ''
    ].join('\r\n');
    const res = extractHtmlFromMHTML(src);
    assert.ok(res && res.html.includes('Café'),
      'esperaba "Café"; obtuve ' + JSON.stringify(res && res.html));
    assert.ok(!res.html.includes('\uFFFD'), 'sin mojibake');
  });

  // --- Regresiones: lo que ya funcionaba debe seguir funcionando ---

  check('quoted-printable + utf-8 sigue decodificando multi-byte', () => {
    const src = mhtml(
      'Content-Type: text/html; charset=utf-8\r\n' +
      'Content-Transfer-Encoding: quoted-printable',
      '<div class="content">Caf=C3=A9 a=C3=B1e</div>'
    );
    const res = extractHtmlFromMHTML(src);
    assert.ok(res && res.html.includes('Café añe'),
      'esperaba "Café añe"; obtuve ' + JSON.stringify(res && res.html));
  });

  check('quoted-printable sin charset declarado asume utf-8', () => {
    const src = mhtml(
      'Content-Type: text/html\r\n' +
      'Content-Transfer-Encoding: quoted-printable',
      '<div class="content">Caf=C3=A9</div>'
    );
    const res = extractHtmlFromMHTML(src);
    assert.ok(res && res.html.includes('Café'),
      'esperaba "Café"; obtuve ' + JSON.stringify(res && res.html));
  });

  check('charset desconocido no rompe: cae a utf-8', () => {
    const src = mhtml(
      'Content-Type: text/html; charset=x-inventado\r\n' +
      'Content-Transfer-Encoding: quoted-printable',
      '<div class="content">Caf=C3=A9</div>'
    );
    const res = extractHtmlFromMHTML(src);
    assert.ok(res && res.html.includes('Café'),
      'esperaba "Café"; obtuve ' + JSON.stringify(res && res.html));
  });

  check('decodeQuotedPrintable con un solo argumento sigue siendo utf-8', () => {
    assert.strictEqual(decodeQuotedPrintable('Caf=C3=A9'), 'Café');
  });

  // --- Limitación conocida y deliberada ---
  // Si la parte NO declara Content-Transfer-Encoding, RFC 2045 establece 7bit
  // como default: no se aplica ningún decoding. Algunos generadores de MHTML lo
  // omiten y dejan secuencias =XX crudas en el HTML. Detectarlas exigiría una
  // heurística (/=[0-9A-Fa-f]{2}/) con riesgo de falsos positivos en textos que
  // contienen "=", así que se deja documentado en vez de adivinar.
  check('parte sin Content-Transfer-Encoding no se decodifica (default 7bit)', () => {
    const src = mhtml(
      'Content-Type: text/html; charset=windows-1252',
      '<div class="content">Caf=E9</div>'
    );
    const res = extractHtmlFromMHTML(src);
    assert.ok(res && res.html.includes('Caf=E9'),
      'esperaba passthrough de "Caf=E9"; obtuve ' + JSON.stringify(res && res.html));
  });

  // --- Pipeline completo: archivo MHTML real → readFileSmart → parser ---

  // Un MHTML real es grande: la parte HTML va después de otros recursos, así que
  // su <meta charset> queda más allá del preview de 4 KB que mira readFileSmart.
  // Replicamos ese orden con una parte CSS de relleno.
  const mhtmlBytes = Buffer.from([
    'From: <Saved by Blink>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/related; boundary="----B"',
    '',
    '------B',
    'Content-Type: text/css',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    'x'.repeat(6000),
    '',
    '------B',
    'Content-Type: text/html; charset=windows-1252',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    '<html><head><meta charset="windows-1252"></head>' +
    '<body><div class="content">Caf=E9 a=F1e</div></body></html>',
    '',
    '------B--',
    ''
  ].join('\r\n'), 'latin1');

  await checkAsync('readFileSmart + parser recuperan "Café añe" de un archivo real', async () => {
    const file = new File([mhtmlBytes], 'saved.mhtml');
    const text = await readFileSmart(file);
    assert.ok(looksLikeMHTML(text), 'debe detectarse como MHTML');
    const res = extractHtmlFromMHTML(text);
    assert.ok(res && res.html.includes('Café añe'),
      'esperaba "Café añe"; obtuve ' + JSON.stringify(res && res.html));
  });

  await checkAsync('la búsqueda de <meta charset> no ve el MHTML (y ya no importa)', async () => {
    // El <meta> va después de los headers MIME, así que el preview de 4 KB no lo
    // ve y readFileSmart cae a UTF-8 para el archivo entero. Es inofensivo: la
    // parte va en quoted-printable (ASCII-safe), los bytes sobreviven intactos y
    // el charset real se aplica por parte dentro de extractHtmlFromMHTML.
    const file = new File([mhtmlBytes], 'saved.mhtml');
    const text = await readFileSmart(file);
    assert.ok(!/<meta/i.test(text.slice(0, 4096)),
      'el preview de 4 KB no debe contener el <meta charset>');
    assert.ok(text.includes('=E9'),
      'la secuencia quoted-printable debe sobrevivir intacta a la lectura como UTF-8');
  });

  console.log('');
  console.log(`  ${pass} ok, ${fail} fallos`);
  process.exit(fail ? 1 : 0);

})();
