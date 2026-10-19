/* ============================================================================
   VITALE — Check del esquema de URL en la guía "Obtener el HTML".
   ----------------------------------------------------------------------------
   Sin framework:  node tests/url-scheme-safety.test.js
   Sale con código 1 si alguna aserción falla.

   Cubre el bug #7: la guía hacía `window.open(url)` con el texto crudo del
   campo, así que un `javascript:` o un `data:text/html,<script>…` pegado en el
   campo se abría como si fuera una página. Las pruebas disparan los handlers
   REALES de la guía (con DOM simulado), no una copia de la lógica.

   Desde `harden-conversion-flow` el aviso ya no es un `alert()` nativo sino un
   mensaje inline en el panel, así que las aserciones comprueban el mensaje
   renderizado en `#assistSteps` Y que no se llamó a `alert()`.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

/* --- Shim mínimo de DOM y navegador -------------------------------------- */

const alerts = [];
const openCalls = [];
const clipboardCalls = [];
const created = [];      // nodos creados por document.createElement
const docHandlers = {};  // listeners registrados directamente sobre document

global.window = globalThis;
global.alert = (msg) => { alerts.push(String(msg)); };
global.window.open = (...args) => { openCalls.push(args); return { closed: false }; };
global.window.scrollTo = () => {};

const elements = {};
function makeEl(id){
  const e = {
    id,
    value: '',
    handlers: {},
    offsetTop: 0,
    firstChild: null,
    addEventListener(ev, fn){ e.handlers[ev] = fn; },
    querySelectorAll(){ return []; },
    insertBefore(child){ (e.inserted = e.inserted || []).push(child); },
    scrollIntoView(){}
  };
  elements[id] = e;
  return e;
}

global.document = {
  activeElement: null,
  getElementById: (id) => elements[id] || null,
  createElement: () => { const n = { className: '', style: {}, innerHTML: '' }; created.push(n); return n; },
  addEventListener(ev, fn){ docHandlers[ev] = fn; }
};

makeEl('assistModal');
makeEl('assistSteps');
makeEl('assistUrl');
makeEl('btnAssist');
makeEl('btnCloseAssist');
makeEl('btnCopyUrl');
makeEl('btnOpenPage');
makeEl('btnGoConvert');

/* --- Cargar el módulo bajo prueba ---------------------------------------- */

const loadModule = (rel) =>
  eval(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

loadModule('js/assist-panel.js');

globalThis.Vitale.utils = {
  copyToClipboard: async (text) => { clipboardCalls.push(text); return true; }
};
globalThis.Vitale.platform = { PLATFORM: 'desktop' };

globalThis.Vitale.assistPanel.setup();

/** Limpia los registros de la última interacción. */
function resetLogs(){
  alerts.length = 0;
  openCalls.length = 0;
  clipboardCalls.length = 0;
  created.length = 0;
  elements.assistSteps.inserted = [];
}

/** Texto de los avisos inline insertados en `#assistSteps`. */
function inlineMessages(){
  return (elements.assistSteps.inserted || []).map(n => String(n.innerHTML)).join(' | ');
}

/** Dispara el click del botón "Abrir". */
function clickOpen(url){
  resetLogs();
  elements.assistUrl.value = url;
  return elements.btnOpenPage.handlers.click();
}

/** Dispara el click del botón "Copiar URL" y espera el async. */
async function clickCopy(url){
  resetLogs();
  elements.assistUrl.value = url;
  await elements.btnCopyUrl.handlers.click();
}

let pass = 0;
let fail = 0;

async function check(name, fn){
  try{
    await fn();
    console.log('  ok   ' + name);
    pass++;
  }catch(e){
    console.log('  FAIL ' + name);
    console.log('       ' + e.message);
    fail++;
  }
}

/* --- Esquemas peligrosos: no deben abrirse ------------------------------- */

const dangerous = [
  'javascript:alert(1)',
  'javascript://%0aalert(1)',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'file:///etc/passwd'
];

async function main(){
  for(const url of dangerous){
    await check('no abre ' + JSON.stringify(url), () => {
      clickOpen(url);
      assert.deepStrictEqual(
        openCalls, [],
        'window.open fue llamado con ' + JSON.stringify(url)
      );
      assert.match(inlineMessages(), /Introduce una URL/i, 'debería avisar inline en el panel');
      assert.deepStrictEqual(alerts, [], 'no debe usar alert() nativo');
    });
  }

  /* --- URLs legítimas: siguen abriéndose --------------------------------- */

  await check('abre https:// tal cual', () => {
    clickOpen('https://archiveofourown.org/works/123');
    assert.strictEqual(openCalls.length, 1);
    assert.strictEqual(openCalls[0][0], 'https://archiveofourown.org/works/123');
    assert.strictEqual(openCalls[0][1], '_blank');
  });

  await check('abre http:// tal cual', () => {
    clickOpen('http://example.com/a');
    assert.strictEqual(openCalls[0][0], 'http://example.com/a');
  });

  await check('una URL sin esquema se normaliza a https://', () => {
    clickOpen('archiveofourown.org/works/123');
    assert.strictEqual(openCalls.length, 1);
    assert.strictEqual(openCalls[0][0], 'https://archiveofourown.org/works/123');
  });

  await check('campo vacío: no abre y avisa', () => {
    clickOpen('   ');
    assert.deepStrictEqual(openCalls, []);
    assert.match(inlineMessages(), /Introduce una URL/i, 'debería avisar inline en el panel');
    assert.deepStrictEqual(alerts, [], 'no debe usar alert() nativo');
  });

  /* --- La copia tampoco debe aceptar esquemas peligrosos ----------------- */

  await check('no copia javascript:', async () => {
    await clickCopy('javascript:alert(1)');
    assert.deepStrictEqual(
      clipboardCalls, [],
      'copyToClipboard fue llamado con javascript:'
    );
    assert.match(inlineMessages(), /Introduce una URL/i, 'debería avisar inline en el panel');
    assert.deepStrictEqual(alerts, [], 'no debe usar alert() nativo');
  });

  await check('copia una https:// válida', async () => {
    await clickCopy('https://example.com/x');
    assert.deepStrictEqual(clipboardCalls, ['https://example.com/x']);
  });

  console.log('\n  ' + pass + ' ok, ' + fail + ' fallos\n');
  if(fail) process.exit(1);
}

main();
