/* ============================================================================
   VITALE — Check del extractor genérico (#9).
   ----------------------------------------------------------------------------
   Sin framework:  node tests/generic-semantic.test.js
   Sale con código 1 si alguna aserción falla.

   Node no trae DOMParser, así que se reemplaza por un stub que devuelve
   elementos ya armados. NO se testea el parseo de HTML: se testea la decisión
   "¿qué contenedor se elige?", que es donde vivía el falso negativo (#9).
   El stub también falla si `main` deja de estar en el selector.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

global.window = globalThis;

const LONG  = 'x'.repeat(600);  // supera el umbral de 500
const SHORT = 'x'.repeat(100);

/** Construye un elemento falso con lo que extractGeneric consulta. */
function el(tagName, attrs, innerHTML){
  return {
    tagName: tagName.toUpperCase(),
    id: attrs.id || '',
    innerHTML,
    getAttribute(name){
      return attrs[name] === undefined ? null : attrs[name];
    },
    _tag: tagName.toLowerCase()
  };
}

let docElements = [];

global.DOMParser = class {
  parseFromString(/* html */){
    return {
      querySelectorAll(selector){
        const tags = selector.split(',').map(s => s.trim().toLowerCase());
        return docElements.filter(e => tags.includes(e._tag));
      }
    };
  }
};

/* --- Cargar el módulo bajo prueba ---------------------------------------- */

eval(fs.readFileSync(path.join(__dirname, '..', 'js/extractors/base.js'), 'utf8'));

const { extractGeneric } = globalThis.Vitale.extractorBase;

let pass = 0;
let fail = 0;

function check(name, fn){
  try{
    fn();
    console.log('  ok   ' + name);
    pass++;
  }catch(e){
    console.log('  FAIL ' + name);
    console.log('       ' + e.message);
    fail++;
  }
}

const FULL_HTML = '<html><body>contenido completo de la página</body></html>';

/* --- Casos --------------------------------------------------------------- */

check('#9: <article> sin class/id se usa (antes se salteaba)', () => {
  docElements = [el('article', {}, LONG)];
  assert.strictEqual(extractGeneric(FULL_HTML), '<div>' + LONG + '</div>');
});

check('#9: <main> sin class/id se usa (antes se salteaba)', () => {
  docElements = [el('main', {}, LONG)];
  assert.strictEqual(extractGeneric(FULL_HTML), '<div>' + LONG + '</div>');
});

check('#9: un <div> sin keyword sigue ignorándose', () => {
  docElements = [el('div', { class: 'sidebar' }, LONG)];
  assert.strictEqual(extractGeneric(FULL_HTML), FULL_HTML);
});

check('#9: no hay regresión con <div class="post">', () => {
  docElements = [el('div', { class: 'post' }, LONG)];
  assert.strictEqual(extractGeneric(FULL_HTML), '<div>' + LONG + '</div>');
});

check('#9: un contenedor semántico corto no se usa', () => {
  docElements = [el('article', {}, SHORT)];
  assert.strictEqual(extractGeneric(FULL_HTML), FULL_HTML);
});

check('#9: id solo (sin class) sigue funcionando', () => {
  docElements = [el('div', { id: 'chapter-1' }, LONG)];
  assert.strictEqual(extractGeneric(FULL_HTML), '<div>' + LONG + '</div>');
});

check('#9: sin contenedores devuelve el HTML tal cual', () => {
  docElements = [];
  assert.strictEqual(extractGeneric(FULL_HTML), FULL_HTML);
});

check('#9: si hay uno válido y otro no, gana el válido', () => {
  docElements = [
    el('div', { class: 'sidebar' }, LONG),
    el('article', {}, LONG)
  ];
  assert.strictEqual(extractGeneric(FULL_HTML), '<div>' + LONG + '</div>');
});

console.log('\n  ' + pass + ' ok, ' + fail + ' fallos\n');
if(fail) process.exit(1);
