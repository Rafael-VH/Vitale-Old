/* ============================================================================
   VITALE — Check del endurecimiento de Vitale.utils.
   ----------------------------------------------------------------------------
   Sin framework:  node tests/utils-hardening.test.js
   Sale con código 1 si alguna aserción falla.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

/* --- Shim de DOM --------------------------------------------------------- */

global.window = globalThis;

let bodyChildren = [];
let removedCount = 0;
let execCommandImpl = () => true;
let createdTextareas = 0;

global.document = {
  body: {
    appendChild(node){ bodyChildren.push(node); node.parentNode = global.document.body; },
    removeChild(node){
      bodyChildren = bodyChildren.filter(c => c !== node);
      node.parentNode = null;
      removedCount++;
    }
  },
  createElement(tag){
    createdTextareas++;
    return {
      tagName: tag,
      value: '',
      style: {},
      parentNode: null,
      setAttribute(){},
      select(){},
      setSelectionRange(){}
    };
  },
  execCommand(){ return execCommandImpl(); }
};

/** navigator es un getter en Node 22: hay que redefinirlo. */
function setClipboard(impl){
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText: impl } },
    configurable: true,
    writable: true
  });
}

/* --- Cargar el módulo bajo prueba ---------------------------------------- */

const loadModule = (rel) =>
  eval(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

loadModule('js/core/utils.js');

const { copyToClipboard } = globalThis.Vitale.utils;

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

function reset(){
  bodyChildren = [];
  removedCount = 0;
  createdTextareas = 0;
}

/* --- #8: el fallback no debe dejar el <textarea> en el DOM --------------- */

async function main(){
  setClipboard(async () => { throw new Error('permiso denegado'); });

  await check('#8: execCommand lanza → no queda <textarea> en el DOM', async () => {
    reset();
    execCommandImpl = () => { throw new Error('execCommand no soportado'); };

    const ok = await copyToClipboard('texto');

    assert.strictEqual(ok, false, 'debería devolver false');
    assert.deepStrictEqual(
      bodyChildren, [],
      'quedó un <textarea> en el DOM tras el fallo'
    );
    assert.strictEqual(removedCount, 1, 'no se quitó el <textarea>');
  });

  await check('#8: execCommand devuelve false → tampoco deja basura', async () => {
    reset();
    execCommandImpl = () => false;

    const ok = await copyToClipboard('texto');

    assert.strictEqual(ok, false);
    assert.deepStrictEqual(bodyChildren, []);
  });

  await check('#8: execCommand funciona → devuelve true y limpia', async () => {
    reset();
    execCommandImpl = () => true;

    const ok = await copyToClipboard('texto');

    assert.strictEqual(ok, true);
    assert.deepStrictEqual(bodyChildren, []);
    assert.strictEqual(createdTextareas, 1);
  });

  await check('#8: si el portapapeles nativo anda, no hay fallback', async () => {
    reset();
    setClipboard(async () => {});

    const ok = await copyToClipboard('texto');

    assert.strictEqual(ok, true);
    assert.strictEqual(createdTextareas, 0, 'no debería crear <textarea>');
  });

  console.log('\n  ' + pass + ' ok, ' + fail + ' fallos\n');
  if(fail) process.exit(1);
}

main();
