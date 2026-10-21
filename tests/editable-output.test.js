/* ============================================================================
   VITALE — Check de la superficie editable del Markdown resultante.
   ----------------------------------------------------------------------------
   Sin framework:  node tests/editable-output.test.js
   Sale con código 1 si alguna aserción falla.

   Cubre el cambio `editable-markdown-output`: `#mdOutput` deja de ser un <div>
   y pasa a ser un <textarea>, así que el texto vive en `.value`. Antes TODOS
   los accesos leían/escribían `.textContent`.

   El bug que esto previene: en un <textarea> `.textContent` devuelve el texto
   por DEFECTO, no lo que el usuario escribió. Leer `.textContent` después de
   que alguien edite el resultado descargaría el Markdown original y descartaría
   sus ediciones, en silencio.

   Las pruebas disparan los handlers REALES (con DOM simulado), no una copia de
   la lógica.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

/* --- Shim mínimo de DOM --------------------------------------------------- */

global.window = globalThis;

const downloads = [];       // llamadas a Vitale.utils.downloadFile
const clipboardCalls = [];  // llamadas a Vitale.utils.copyToClipboard
const docHandlers = {};     // listeners registrados sobre document

const elements = {};

/** Elemento simulado con `.value` Y `.textContent` (como un <textarea> real). */
function makeEl(id){
  const e = {
    id,
    value: '',
    textContent: '',
    innerHTML: '',
    className: '',
    disabled: false,
    handlers: {},
    classList: {
      _set: new Set(),
      add(c){ this._set.add(c); },
      remove(c){ this._set.delete(c); },
      contains(c){ return this._set.has(c); }
    },
    addEventListener(ev, fn){ e.handlers[ev] = fn; },
    focus(){ global.document.activeElement = e; },
    select(){},
    /* Un <button> real expone setAttribute/getAttribute; el toggle del campo de
       entrada los usa para llevar aria-expanded. */
    attributes: {},
    setAttribute(k, v){ e.attributes[k] = String(v); },
    getAttribute(k){ return Object.prototype.hasOwnProperty.call(e.attributes, k) ? e.attributes[k] : null; },
    /* Un div colapsable lleva `hidden`; el estado plegado vive ahí. */
    hidden: false
  };
  elements[id] = e;
  return e;
}

global.document = {
  activeElement: null,
  getElementById: (id) => elements[id] || null,
  createElement: () => ({
    className: '', style: {}, value: '', parentNode: null,
    setAttribute(){}, select(){}, setSelectionRange(){}
  }),
  addEventListener(ev, fn){ docHandlers[ev] = fn; },
  body: { appendChild(){}, removeChild(){} }
};

/* --- Cargar los módulos bajo prueba --------------------------------------- */

const loadModule = (rel) =>
  eval(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));

loadModule('js/core/utils.js');       // updateCounter/alertMsg/esc reales
loadModule('js/download-modal.js');
loadModule('js/convert-panel.js');

/* Se sustituyen solo los efectos de borde (Blob/URL y portapapeles nativo):
   el resto de `Vitale.utils` se prueba de verdad. */
globalThis.Vitale.utils.downloadFile = (name, content) => {
  downloads.push([name, content]);
};
globalThis.Vitale.utils.copyToClipboard = async (text) => {
  clipboardCalls.push(text);
  return true;
};

globalThis.Vitale.siteDetector = { updateFormatBadge(){}, prepareHTML: (raw) => ({
  html: raw, wasMHTML: false, info: ''
}) };
globalThis.Vitale.platform = { renderUploadCard(){} };
globalThis.Vitale.mdream = { isLoaded: () => true, convert: () => '# Convertido' };
globalThis.Vitale.charset = {};

[ 'mdOutput', 'outputCounter', 'inputCounter', 'filenameInput', 'filenamePreview',
  'downloadModal', 'btnCancelDownload', 'btnConfirmDownload', 'convertAlert',
  'convertInfo', 'htmlInput', 'fileInput', 'uploadCard', 'btnConvert',
  'btnClear', 'btnCopyMd', 'btnDownloadMd', 'btnToggleInput', 'inputCollapse'
].forEach(makeEl);

globalThis.Vitale.downloadModal.setup();
globalThis.Vitale.convertPanel.setup();

/* --- Utilidades de la prueba ---------------------------------------------- */

function reset(){
  downloads.length = 0;
  clipboardCalls.length = 0;
  elements.convertAlert.className = '';
  elements.convertAlert.innerHTML = '';
}

/** Estado tras una conversión: el texto está en la superficie de salida. */
function setOutput(text){
  elements.mdOutput.textContent = text;  // en un <textarea> real: texto por defecto
  elements.mdOutput.value = text;        // lo que el usuario ve
}

/** Simula que el usuario edita dentro de la superficie de salida. */
function editOutput(text){
  elements.mdOutput.value = text;
}

const alertText = () => String(elements.convertAlert.innerHTML);

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

/* --- #3: guardar usa el texto ACTUAL ------------------------------------- */

async function guardar(){
  await check('#3: guardar descarga el texto EDITADO, no el original', () => {
    reset();
    setOutput('# Original');
    editOutput('# Editado\n\nNueva línea');
    elements.filenameInput.value = 'nota';

    Vitale.downloadModal.confirm();

    assert.strictEqual(downloads.length, 1, 'debería descargar una vez');
    assert.strictEqual(downloads[0][0], 'nota.md', 'nombre del archivo');
    assert.strictEqual(
      downloads[0][1], '# Editado\n\nNueva línea',
      'descargó el Markdown original y descartó las ediciones'
    );
  });

  await check('#3: sin ediciones el contenido llega intacto', () => {
    reset();
    setOutput('# Original\n\ncontenido de verdad');
    elements.filenameInput.value = 'nota';

    Vitale.downloadModal.confirm();

    assert.strictEqual(downloads[0][1], '# Original\n\ncontenido de verdad');
  });
}

/* --- #5: los guardas de vacío y de error se conservan -------------------- */

async function guardas(){
  await check('#5: salida vacía → no descarga y avisa', () => {
    reset();
    setOutput('');
    elements.filenameInput.value = 'nota';

    Vitale.downloadModal.confirm();

    assert.deepStrictEqual(downloads, [], 'no debería descargar nada');
    assert.match(alertText(), /No hay Markdown/, 'debería avisar');
  });

  await check('#5: marcador ❌ → no descarga y avisa', () => {
    reset();
    setOutput('❌ Error: boom');
    elements.filenameInput.value = 'nota';

    Vitale.downloadModal.confirm();

    assert.deepStrictEqual(downloads, [], 'no debería descargar un mensaje de error');
    assert.match(alertText(), /No hay Markdown/, 'debería avisar');
  });
}

/* --- #4: copiar usa el texto ACTUAL -------------------------------------- */

async function copiar(){
  await check('#4: copiar lleva el texto EDITADO', async () => {
    reset();
    setOutput('# Original');
    editOutput('# Editado');

    await elements.btnCopyMd.handlers.click();

    assert.deepStrictEqual(
      clipboardCalls, ['# Editado'],
      'copió el Markdown original y descartó las ediciones'
    );
  });

  await check('#4: salida vacía → no copia y avisa', async () => {
    reset();
    setOutput('');

    await elements.btnCopyMd.handlers.click();

    assert.deepStrictEqual(clipboardCalls, [], 'no debería copiar nada');
    assert.match(alertText(), /No hay Markdown/, 'debería avisar');
  });
}

/* --- #1 y #6: la conversión escribe en la superficie y el contador la sigue */

async function convertir(){
  await check('#1: convertir deja el Markdown en la superficie editable', async () => {
    reset();
    setOutput('');
    elements.htmlInput.value = '<p>hola</p>';

    await elements.btnConvert.handlers.click();

    assert.strictEqual(
      elements.mdOutput.value, '# Convertido',
      'la superficie editable quedó vacía: el texto se escribió fuera de .value'
    );
    assert.strictEqual(
      elements.outputCounter.textContent, '12 caracteres',
      'el contador no reflejó el Markdown convertido'
    );
  });
}

/* --- #6: el contador sigue el texto mientras se escribe ------------------ */

async function contadorAlTeclear(){
  await check('#6: editar la salida actualiza el contador', () => {
    reset();
    elements.mdOutput.value = 'x'.repeat(20);

    assert.strictEqual(
      typeof elements.mdOutput.handlers.input, 'function',
      'falta el listener "input" que refresca el contador'
    );

    elements.mdOutput.handlers.input();

    assert.strictEqual(elements.outputCounter.textContent, '20 caracteres');
  });
}

/* --- Sin control de pegar dedicado --------------------------------------- */

/* El botón Pegar solo pegaba si el navegador concedía clipboard-read; si no,
   caía a un aviso que pedía pegar a mano. Un control que a veces no hace nada
   es peor que ningún control: el pegado nativo ya funciona en el campo.
   La prueba cubre los DOS lados del retiro, porque el stub del DOM taparía el
   primero: si el handler sigue vivo, `getElementById('btnPaste')` resuelve el
   stub y el botón "existe" para el test aunque no exista en la página. */
async function sinPegar(){
  await check('#7: ningún botón Pegar queda en el DOM', () => {
    assert.strictEqual(
      document.getElementById('btnPaste'), null,
      'el stub #btnPaste sigue en el DOM simulado: el handler todavía lo busca'
    );
  });

  await check('#7: los controles de entrada que sí funcionan siguen ahí', () => {
    assert.strictEqual(
      typeof elements.btnClear.handlers.click, 'function',
      'Limpiar debe seguir registrado'
    );
    assert.strictEqual(
      typeof elements.btnConvert.handlers.click, 'function',
      'Convertir debe seguir registrado'
    );
  });
}

/* --- Campo de entrada plegable ------------------------------------------- */

/* El campo de Entrada arranca colapsado: el usuario que ya trae el archivo por
   el panel de carga no necesita el textarea a la vista, y dejarlo abierto
   empujaba la caja de resultado. El toggle es manual, sin persistencia. */
async function entradaPlegable(){
  await check('#8: el campo de entrada arranca colapsado', () => {
    assert.strictEqual(
      elements.btnToggleInput.getAttribute('aria-expanded'), 'false',
      'el toggle debe declarar el estado colapsado'
    );
    assert.strictEqual(
      elements.inputCollapse.hidden, true,
      'el contenido de entrada debe arrancar oculto'
    );
  });

  await check('#8: el toggle expande el campo', () => {
    elements.btnToggleInput.handlers.click();
    assert.strictEqual(
      elements.btnToggleInput.getAttribute('aria-expanded'), 'true',
      'tras el click el toggle debe declarar expandido'
    );
    assert.strictEqual(
      elements.inputCollapse.hidden, false,
      'tras el click el contenido debe quedar visible'
    );
  });

  await check('#8: el toggle vuelve a colapsar el campo', () => {
    elements.btnToggleInput.handlers.click();
    assert.strictEqual(
      elements.btnToggleInput.getAttribute('aria-expanded'), 'false',
      'un segundo click debe volver a colapsar'
    );
    assert.strictEqual(
      elements.inputCollapse.hidden, true,
      'un segundo click debe volver a ocultar el contenido'
    );
  });
}

async function main(){
  await guardar();
  await guardas();
  await copiar();
  await convertir();
  await contadorAlTeclear();
  await sinPegar();
  await entradaPlegable();

  console.log('\n  ' + pass + ' ok, ' + fail + ' fallos\n');
  if(fail) process.exit(1);
}

main();
