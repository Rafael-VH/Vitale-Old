/* ============================================================================
   VITALE — Check de alcanzabilidad de los extractores.
   ----------------------------------------------------------------------------
   Sin framework:  node tests/extractor-reachability.test.js
   Sale con código 1 si alguna aserción falla.

   Node no trae DOMParser: se reemplaza por un stub que devuelve el
   #storycontent ya armado. NO se testea el parseo de HTML, se testea la
   DECISIÓN de la cascada (¿qué estrategia gana?), que es donde vivía el paso
   inalcanzable de Fanfiction.

   Por qué existe: `applyExtractor` corre `selectors` ANTES que `custom`. Si un
   extractor declara los dos, `custom` solo puede correr cuando `selectors`
   falló; y si además exige el mismo umbral de longitud, nunca aporta nada. El
   segundo bloque (A.5) hace cumplir ese invariante sobre el registro entero.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

global.window = globalThis;

/* --- Stub de DOMParser --------------------------------------------------- */

const LONG  = 'x'.repeat(300);   // supera MIN_CONTENT_LENGTH (200)
const SHORT = 'x'.repeat(100);   // no lo supera

/** innerHTML del #storycontent, o null si el elemento no existe. */
let storyContent = null;

global.DOMParser = class {
  parseFromString(/* html */){
    return {
      querySelectorAll(selector){
        if(selector !== '#storycontent' || storyContent === null) return [];
        return [{ innerHTML: storyContent }];
      }
    };
  }
};

/* --- Cargar los módulos bajo prueba -------------------------------------- */

const load = (rel) => eval(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

load('js/extractors/registry.js');
load('js/extractors/base.js');

const SITES = ['fanfiction', 'ao3', 'webnovel', 'royalroad', 'wikipedia', 'substack', 'blogger'];
SITES.forEach(site => load('js/extractors/' + site + '.js'));

const { applyExtractor, MIN_CONTENT_LENGTH } = globalThis.Vitale.extractorBase;

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

/* --- A.3: comportamiento observable del extractor Fanfiction ------------- */

check('fanfiction: con #storycontent largo gana el selector (custom sombreado)', () => {
  storyContent = LONG;
  const r = applyExtractor('<html></html>', 'fanfiction');
  assert.ok(r, 'debería resolver por selector');
  assert.strictEqual(r.method, 'site-selector');
});

check('fanfiction: con #storycontent corto ninguna estrategia lo rescata', () => {
  // El HTML SÍ contiene el patrón que busca el regex de `custom` (div con
  // id="storycontent" + <hr>). Si ese paso pudiera aportar algo, sería ahora.
  // Exige > 200 chars, así que tampoco aporta: no hay rescate posible.
  storyContent = SHORT;
  const html = '<div id="storycontent">' + SHORT + '</div><hr><div class="drop_m"></div>';
  assert.strictEqual(applyExtractor(html, 'fanfiction'), null);
});

check('fanfiction: sin #storycontent no hay estrategia específica', () => {
  storyContent = null;
  assert.strictEqual(applyExtractor('<html><body>x</body></html>', 'fanfiction'), null);
});

check('fanfiction: el umbral es MIN_CONTENT_LENGTH (200)', () => {
  assert.strictEqual(MIN_CONTENT_LENGTH, 200);

  storyContent = 'x'.repeat(199);
  assert.strictEqual(applyExtractor('<html></html>', 'fanfiction'), null, '199 debería quedar afuera');

  storyContent = 'x'.repeat(200);
  assert.ok(applyExtractor('<html></html>', 'fanfiction'), '200 debería entrar');
});

/* --- A.5: invariante del registro (misma clase de defecto) --------------- */

check('A.5: ningún extractor declara selectors y custom a la vez', () => {
  const names = globalThis.Vitale.extractors.list();
  assert.strictEqual(names.length, SITES.length, 'no se registraron todos los extractores');

  const shadowed = names.filter(name => {
    const cfg = globalThis.Vitale.extractors.get(name);
    return Array.isArray(cfg.selectors) && cfg.selectors.length > 0 && typeof cfg.custom === 'function';
  });

  assert.deepStrictEqual(
    shadowed, [],
    'tienen un `custom` que `selectors` deja inalcanzable: ' + shadowed.join(', ') +
    ' — `custom` solo corre si `selectors` falló'
  );
});

console.log('\n  ' + pass + ' ok, ' + fail + ' fallos\n');
if(fail) process.exit(1);
