/* ============================================================================
   VITALE — Check de seguridad del mapa de dominios (prototype pollution).
   ----------------------------------------------------------------------------
   Sin framework:  node tests/prototype-safety.test.js
   Sale con código 1 si alguna aserción falla.

   Cubre el bug #6: `allDomains()` devolvía un objeto literal `{}`, así que los
   hosts que colisionan con propiedades heredadas de Object.prototype
   ("constructor", "toString", "__proto__"…) se resolvían como si fueran sitios
   conocidos. `detectSiteFromUrl('http://constructor/')` devolvía la función
   Object en vez de 'unknown', y la cadena que sigue (labelOf → name.charAt)
   terminaba en TypeError.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

// Los módulos escriben en `window.Vitale`; los cargamos con un shim mínimo.
global.window = globalThis;
const loadModule = (rel) =>
  eval(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

loadModule('js/extractors/registry.js');
loadModule('js/site-detector.js');

const { allDomains, register, labelOf } = globalThis.Vitale.extractors;
const { detectSiteFromUrl } = globalThis.Vitale.siteDetector;

// Un extractor real registrado, para las pruebas de regresión.
register('ejemplo', {
  domains: ['ejemplo.com'],
  selectors: ['#contenido'],
  label: 'Ejemplo'
});

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

/* --- El mapa no hereda de Object.prototype ------------------------------- */

check('allDomains() no hereda "constructor" de Object.prototype', () => {
  assert.ok(
    !('constructor' in allDomains()),
    '"constructor" in allDomains() debería ser false'
  );
});

check('allDomains() no hereda "toString" de Object.prototype', () => {
  assert.ok(
    !('toString' in allDomains()),
    '"toString" in allDomains() debería ser false'
  );
});

/* --- Hosts que colisionan con el prototipo -------------------------------
   Ojo: URL.hostname siempre viene en minúsculas, así que las propiedades
   camelCase de Object.prototype ("toString", "valueOf", "hasOwnProperty"…)
   NUNCA pueden alcanzarse desde un host. Los únicos explotables son los que
   ya son minúscula: "constructor" y "__proto__". El resto de la lista queda
   como guarda por si cambia ese supuesto. ---------------------------------- */

const inheritedHosts = [
  'constructor',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  '__proto__'
];

for(const host of inheritedHosts){
  check('detectSiteFromUrl("http://' + host + '/") → unknown', () => {
    assert.strictEqual(
      detectSiteFromUrl('http://' + host + '/'),
      'unknown'
    );
  });
}

/* --- La cadena de crash no explota --------------------------------------- */

check('labelOf(detectSiteFromUrl(host heredado)) no tira TypeError', () => {
  const siteKey = detectSiteFromUrl('http://constructor/');
  const label = labelOf(siteKey);
  assert.strictEqual(typeof label, 'string');
});

/* --- Regresión: la detección legítima sigue funcionando ------------------ */

check('dominio registrado resuelve a su key', () => {
  assert.strictEqual(detectSiteFromUrl('https://ejemplo.com/articulo/1'), 'ejemplo');
});

check('subdominio registrado resuelve a su key', () => {
  assert.strictEqual(detectSiteFromUrl('https://m.ejemplo.com/x'), 'ejemplo');
});

check('dominio no registrado → unknown', () => {
  assert.strictEqual(detectSiteFromUrl('https://otro-sitio.com/x'), 'unknown');
});

check('URL inválida → unknown', () => {
  assert.strictEqual(detectSiteFromUrl('no-es-una-url'), 'unknown');
});

check('labelOf devuelve el label del extractor', () => {
  assert.strictEqual(labelOf('ejemplo'), 'Ejemplo');
});

check('labelOf de un sitio desconocido sigue capitalizando', () => {
  assert.strictEqual(labelOf('desconocido'), 'Desconocido');
});

console.log('\n  ' + pass + ' ok, ' + fail + ' fallos\n');
if(fail) process.exit(1);
