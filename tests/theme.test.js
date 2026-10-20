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

   Las aserciones 1–3 son el RED de este change (hoy fallan). La 4 pasa hoy y
   se declara guard permanente: no es RED, es el check que impide que un
   `var()` apunte a un token que nadie declaró.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

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

console.log('\n  ' + pass + ' ok, ' + fail + ' fallos\n');
if(fail) process.exit(1);
