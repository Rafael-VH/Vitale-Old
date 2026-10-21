/* ============================================================================
   VITALE — Check estático del esquema de color (tema claro).
   ----------------------------------------------------------------------------
   Sin framework:  node tests/theme.test.js
   Sale con código 1 si alguna aserción falla.

   Lee `styles.css` como texto (no hay parser de CSS instalado) y verifica la
   capa de tokens. Cubre el fallo silencioso que motivó este change: la hoja
   tenía un único esquema oscuro escrito a mano, sin media block, y varios
   literales de color fuera de `:root` que sobrevivían a cualquier cambio de
   tema porque nada los vigilaba.

   Las aserciones 1–4 son guards permanentes del esquema claro; la 4 impide que
   un `var()` apunte a un token que nadie declaró.

   El change `theme-toggle` añade cinco guards más (5–9): el bloque explícito
   `:root[data-theme="light"]` existe, declara exactamente lo mismo que el
   bloque automático, el bloque automático no se aplica sobre un oscuro
   explícito, el módulo declara los tres modos, y el markup aplica el modo
   guardado antes del primer pintado. La duplicación es deliberada; sin este
   test se pudre en silencio y el tema claro pasa a depender de CÓMO se llegó
   a él.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const themeJsPath = path.join(__dirname, '..', 'js', 'theme.js');
const themeJs = fs.existsSync(themeJsPath) ? fs.readFileSync(themeJsPath, 'utf8') : '';

// Tokens de color que el diseño decide compartir entre esquemas (design.md §3.1):
// son los de relleno, y oscurecerlos rompería el par relleno+tinta.
const SHARED = new Set(['--accent', '--accent-2', '--success']);

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

const check = (name, fn) => {
  try { fn(); report(name, null); }
  catch(e){ report(name, e); }
};

/** Extrae un bloque balanceado desde la primera ocurrencia de `open`. */
function block(startRe){
  const m = startRe.exec(css);
  if(!m) return null;
  let i = m.index + m[0].length; // justo después del '{'
  let depth = 1;
  while(i < css.length && depth > 0){
    if(css[i] === '{') depth++;
    else if(css[i] === '}') depth--;
    i++;
  }
  return css.slice(m.index, i);
}

/** `--nombre:` declarado, en orden de aparición. */
function declaredTokens(source){
  return [...source.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]);
}

const rootBlock = block(/:root\s*\{/) || '';
const lightBlock = block(/@media\s*\(prefers-color-scheme\s*:\s*light\)\s*\{/);

const rootTokens = new Set(declaredTokens(rootBlock));
const lightTokens = new Set(lightBlock ? declaredTokens(lightBlock) : []);

// Un valor "de color": hex, rgb(a), hsl(a) o un box-shadow. Las dimensiones
// (--radius) no cuentan: no cambian de esquema.
const COLORISH = /#(?:[0-9a-f]{3,8})\b|rgba?\(|hsla?\(|\b\d+px\s+\d+px/;

check('styles.css declara un bloque @media (prefers-color-scheme: light)', () => {
  assert.ok(lightBlock, 'no se encontró @media (prefers-color-scheme: light) { ... }');
});

check('cada token de color de :root tiene valor claro, salvo los tres compartidos', () => {
  assert.ok(rootTokens.size > 0, ':root no declara ningún token');
  const missing = [...rootTokens].filter(t => {
    if(SHARED.has(t)) return false;
    const decl = new RegExp(t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\s*:\\s*([^;\\n}]+)');
    const m = decl.exec(rootBlock);
    if(!m) return false;
    return COLORISH.test(m[1]) && !lightTokens.has(t);
  });
  assert.deepStrictEqual(missing, [],
    'tokens sin re-declarar en claro: ' + missing.join(', '));
});

check('--accent-2-glow y --shadow no existen (tokens muertos)', () => {
  const dead = [/--accent-2-glow\s*:/, /var\(\s*--accent-2-glow\s*\)/,
                /--shadow\s*:/, /var\(\s*--shadow\s*\)/]
    .filter(re => re.test(css))
    .map(String);
  assert.deepStrictEqual(dead, [], 'siguen presentes: ' + dead.join(', '));
});

check('todo var(--x) usado está declarado en :root (guard)', () => {
  const used = [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]);
  assert.ok(used.length > 0, 'no hay ningún var() en la hoja');
  const undeclared = [...new Set(used)].filter(t => !rootTokens.has(t));
  assert.deepStrictEqual(undeclared, [],
    'var() sin token en :root: ' + undeclared.join(', '));
});

// --- theme-toggle: los tres modos y su capa de overrides --------------------

/** Reglas de primer nivel dentro de un bloque: selector -> declaraciones. */
function rules(source){
  const out = new Map();
  for(const m of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
    const sel = m[1].trim().replace(/\s+/g, ' ');
    if(sel.startsWith('@')) continue;
    out.set(sel, m[2].replace(/\s+/g, ' ').trim());
  }
  return out;
}

const DARK_GUARD = /^:root:not\(\[data-theme=["']dark["']\]\)/;
const lightAttrBlock = block(/:root\[data-theme=["']light["']\]\s*\{/);

check('styles.css declara un bloque :root[data-theme="light"]', () => {
  assert.ok(lightAttrBlock, 'no se encontró :root[data-theme="light"] { ... }');
});

check('el bloque claro explícito declara lo mismo que el automático', () => {
  assert.ok(lightBlock, 'falta el bloque @media (prefers-color-scheme: light)');
  assert.ok(lightAttrBlock, 'falta el bloque :root[data-theme="light"]');

  const auto = rules(lightBlock);
  const explicit = rules(lightAttrBlock);
  const KEY_AUTO = ':root:not([data-theme="dark"])';
  const KEY_EXPLICIT = ':root[data-theme="light"]';

  assert.ok(auto.has(KEY_AUTO), 'el bloque automático no declara tokens bajo ' + KEY_AUTO);
  assert.ok(explicit.has(KEY_EXPLICIT), 'el bloque explícito no declara tokens');

  assert.strictEqual(explicit.get(KEY_EXPLICIT), auto.get(KEY_AUTO),
    'los tokens de color difieren entre el bloque automático y el explícito');

  const strip = (map, rootKey) => [...map]
    .filter(([sel]) => sel !== rootKey)
    .map(([sel, decl]) => [sel.split(rootKey).join(':root').trim(), decl]);

  assert.deepStrictEqual(strip(explicit, KEY_EXPLICIT), strip(auto, KEY_AUTO),
    'los overrides de regla difieren entre el bloque automático y el explícito');
});

check('el bloque automático no se aplica sobre un oscuro explícito', () => {
  assert.ok(lightBlock, 'falta el bloque @media (prefers-color-scheme: light)');

  const sels = [...rules(lightBlock).keys()];
  assert.ok(sels.length > 0, 'el bloque automático está vacío');
  assert.ok(sels.some(s => DARK_GUARD.test(s)),
    'ningún selector del bloque automático excluye [data-theme="dark"]');

  const unguarded = sels.filter(s => !DARK_GUARD.test(s));
  assert.deepStrictEqual(unguarded, [],
    'selectores sin guard de oscuro explícito: ' + unguarded.join(', '));
});

check('js/theme.js declara los tres modos y la clave de almacenamiento', () => {
  assert.ok(themeJs, 'no existe js/theme.js');
  assert.ok(/localStorage/.test(themeJs), 'js/theme.js no usa localStorage');
  assert.ok(/['"]vitale\.theme['"]/.test(themeJs), 'js/theme.js no declara la clave vitale.theme');

  const arr = /\[[^\]]*['"]auto['"][^\]]*\]/.exec(themeJs);
  assert.ok(arr, 'js/theme.js no declara una lista de modos que empiece por auto');

  const list = [...arr[0].matchAll(/['"]([a-z]+)['"]/g)].map(m => m[1]);
  assert.deepStrictEqual(list, ['auto', 'light', 'dark'],
    'la lista de modos debe ser exactamente auto, light, dark');
});

check('index.html aplica el modo guardado antes del primer pintado', () => {
  const link = html.indexOf('styles.css');
  assert.ok(link > -1, 'index.html no enlaza styles.css');

  const preHead = html.slice(0, link);
  assert.ok(/localStorage/.test(preHead) && /data-theme/.test(preHead),
    'falta el script pre-paint (localStorage + data-theme) antes del stylesheet');

  const at = html.indexOf('theme-toggle');
  assert.ok(at > -1, 'falta el control .theme-toggle');
  const tag = html.slice(at, html.indexOf('>', at) + 1);
  assert.ok(/aria-label=/.test(tag), 'el control no tiene aria-label');

  const themeIdx = html.indexOf('js/theme.js');
  const mainIdx = html.indexOf('js/main.js');
  assert.ok(themeIdx > -1, 'index.html no carga js/theme.js');
  assert.ok(themeIdx < mainIdx, 'js/theme.js debe cargarse antes de js/main.js');
});

console.log('\n  ' + pass + ' ok, ' + fail + ' fallos\n');
if(fail) process.exit(1);
