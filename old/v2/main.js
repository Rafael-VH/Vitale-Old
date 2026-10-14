/* ============================================================================
   VITALE — Lógica principal
   ----------------------------------------------------------------------------
   Índice:
   1.  Detección de plataforma
   2.  Carga del motor mdream
   3.  Utilidades generales
   4.  Modal de descarga
   5.  Parser MHTML
   6.  Detección de sitio de origen
   7.  Extractores de contenido principal (por sitio + genérico)
   8.  Detección de charset y lectura de archivos
   9.  Conversión segura a Markdown
   10. Tabs
   11. Tab "Convertir HTML"
   12. Tab "Obtener de URL"
   13. Inicialización
   ========================================================================== */


/* ============================================================
   1. DETECCIÓN DE PLATAFORMA
   ============================================================ */
function detectPlatform(){
  const ua = navigator.userAgent || '';
  if(/android/i.test(ua)) return 'android';
  if(/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'desktop';
}
const PLATFORM = detectPlatform();

function renderPlatformBadge(){
  const b = document.getElementById('platformBadge');
  const icons = { android:'🤖 Android', ios:'🍎 iOS', desktop:'💻 Escritorio' };
  b.textContent = icons[PLATFORM];

  if(PLATFORM !== 'desktop'){
    document.getElementById('uploadTitleText').innerHTML =
      'Toca para <span class="hl">seleccionar un archivo</span>';
    document.getElementById('uploadSubText').textContent =
      'Se abrirá el selector de archivos del sistema';
  }
}

function renderAssistSteps(){
  const el = document.getElementById('assistSteps');
  const step = (n, html) =>
    `<div class="step"><div class="step-num">${n}</div><div class="step-body">${html}</div></div>`;

  if(PLATFORM === 'android'){
    el.innerHTML =
      step(1, 'Pulsa <b>"Copiar URL"</b>. Copia el enlace sin abrirlo, evitando que Android lo redirija a la app.') +
      step(2, 'Abre Chrome o Firefox, pega la URL y pulsa Enter.') +
      step(3, 'En el menú <kbd>⋮</kbd>, elige <b>"Descargar página"</b>. Se guardará como <code>.mhtml</code>.') +
      step(4, 'Vuelve aquí, pulsa <b>"Ir a pegar HTML"</b> y usa el panel de carga para seleccionar el archivo.') +
      step(5, 'Pulsa <b>"Convertir a Markdown"</b> y luego <b>"Descargar .md"</b>.');
  } else if(PLATFORM === 'ios'){
    el.innerHTML =
      step(1, 'Pulsa <b>"Copiar URL"</b>.') +
      step(2, 'Abre Safari, pega la URL y pulsa Enter.') +
      step(3, 'Compartir (⎋) → <b>"Opciones"</b> → <b>"Página web"</b> → <b>"Guardar en Archivos"</b>.') +
      step(4, 'Vuelve aquí, pulsa <b>"Ir a pegar HTML"</b> y usa el panel de carga para seleccionar el archivo.') +
      step(5, 'Pulsa <b>"Convertir a Markdown"</b> y luego <b>"Descargar .md"</b>.');
  } else {
    el.innerHTML =
      step(1, 'Pulsa <b>"Copiar URL"</b> o <b>"Intentar abrir"</b>.') +
      step(2, 'En la pestaña nueva, pulsa <kbd>Ctrl</kbd>+<kbd>U</kbd> (o clic derecho → <b>Ver código fuente</b>).') +
      step(3, 'Pulsa <kbd>Ctrl</kbd>+<kbd>A</kbd> → <kbd>Ctrl</kbd>+<kbd>C</kbd>.') +
      step(4, 'Vuelve aquí, pulsa <b>"Ir a pegar HTML"</b> y pega con <kbd>Ctrl</kbd>+<kbd>V</kbd>.') +
      step(5, 'Pulsa <b>"Convertir a Markdown"</b> y luego <b>"Descargar .md"</b>.');
  }
}


/* ============================================================
   2. CARGA DEL MOTOR MDREAM
   ============================================================ */
let htmlToMarkdown;
let mdreamLoaded = false;
let processing = false;

async function loadMdream(){
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  dot.classList.add('loading');

  try{
    const core = await import('https://cdn.jsdelivr.net/npm/@mdream/js@latest/+esm');
    htmlToMarkdown = core.htmlToMarkdown;
    if(typeof htmlToMarkdown !== 'function') throw new Error('htmlToMarkdown no disponible');

    mdreamLoaded = true;
    dot.classList.remove('loading');
    dot.classList.add('ready');
    txt.textContent = 'Vitale listo';
  }catch(err){
    dot.classList.remove('loading');
    txt.textContent = '❌ Error al cargar: ' + err.message;
  }
}


/* ============================================================
   3. UTILIDADES GENERALES
   ============================================================ */
function esc(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

let _alertTimer = null;
function alertMsg(id, msg, type){
  const a = document.getElementById(id);
  a.className = 'alert show alert-' + type;
  a.innerHTML = msg;

  if(_alertTimer){
    clearTimeout(_alertTimer);
    _alertTimer = null;
  }

  if(type === 'ok'){
    _alertTimer = setTimeout(() => {
      a.className = 'alert';
      _alertTimer = null;
    }, 8000);
  }
}

function updateCounter(inputId, counterId){
  const el = document.getElementById(inputId);
  const c  = document.getElementById(counterId);
  if(!el || !c) return;

  let len = 0;
  if(typeof el.value === 'string') len = el.value.length;
  else if(typeof el.textContent === 'string') len = el.textContent.length;

  c.textContent = len.toLocaleString() + ' caracteres';
}

async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(e){}

  try{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }catch(e){
    return false;
  }
}

function downloadFile(filename, content, mime='text/markdown'){
  const contentWithBom = '\uFEFF' + content;
  const bytes = new TextEncoder().encode(contentWithBom);
  const blob = new Blob([bytes], { type: mime + ';charset=utf-8' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function setDownloadEnabled(enabled){
  document.getElementById('btnDownloadMd').disabled = !enabled;
}


/* ============================================================
   4. MODAL DE DESCARGA
   ============================================================ */
const downloadModal = document.getElementById('downloadModal');
const filenameInput = document.getElementById('filenameInput');
const filenamePreview = document.getElementById('filenamePreview');
const DEFAULT_FILENAME = 'vitale';

function sanitizeFilename(name){
  return (name || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\.md$/i, '')
    .trim()
    .slice(0, 80);
}

function updateFilenamePreview(){
  const base = sanitizeFilename(filenameInput.value) || DEFAULT_FILENAME;
  filenamePreview.textContent = base + '.md';
}

function openDownloadModal(){
  const md = document.getElementById('mdOutput').textContent;
  if(!md || !md.trim() || md.startsWith('❌')){
    return alertMsg('convertAlert', '⚠️ No hay Markdown que descargar.', 'warn');
  }

  let suggested = DEFAULT_FILENAME;
  const fileNameDisplay = document.getElementById('fileNameDisplay').textContent;
  if(fileNameDisplay){
    const original = fileNameDisplay.replace(/^📄\s*/, '').trim();
    if(original){
      const base = original.replace(/\.(mhtml?|html?|txt)$/i, '');
      const sanitized = sanitizeFilename(base);
      if(sanitized) suggested = sanitized;
    }
  }

  filenameInput.value = suggested;
  updateFilenamePreview();
  downloadModal.classList.add('show');
  setTimeout(() => { filenameInput.focus(); filenameInput.select(); }, 100);
}

function closeDownloadModal(){
  downloadModal.classList.remove('show');
}

function confirmDownload(){
  const base = sanitizeFilename(filenameInput.value) || DEFAULT_FILENAME;
  const finalName = base + '.md';
  const md = document.getElementById('mdOutput').textContent;
  try{
    downloadFile(finalName, md);
    closeDownloadModal();
    alertMsg('convertAlert',
      `💾 Descarga iniciada como <b>${esc(finalName)}</b>. Revisa tu carpeta de Descargas.`, 'ok');
  }catch(e){
    alertMsg('convertAlert',
      '⚠️ No se pudo descargar: ' + esc(e.message) + '<br>Usa "Copiar" en su lugar.', 'warn');
  }
}

filenameInput.addEventListener('input', updateFilenamePreview);
filenameInput.addEventListener('keydown', e => {
  if(e.key === 'Enter'){ e.preventDefault(); confirmDownload(); }
  if(e.key === 'Escape'){ e.preventDefault(); closeDownloadModal(); }
});
downloadModal.addEventListener('click', e => {
  if(e.target === downloadModal) closeDownloadModal();
});
document.getElementById('btnCancelDownload').addEventListener('click', closeDownloadModal);
document.getElementById('btnConfirmDownload').addEventListener('click', confirmDownload);


/* ============================================================
   5. PARSER MHTML
   ============================================================ */
function looksLikeMHTML(text){
  if(!text) return false;
  const head = text.slice(0, 2000);
  return /From:\s*<Saved by Blink>/i.test(head) ||
         /Content-Type:\s*multipart\/related/i.test(head) ||
         /^From:\s*.*\r?\n.*MIME-Version:\s*1\.0/im.test(head);
}

function decodeQuotedPrintable(str){
  const cleaned = str.replace(/=\r?\n/g, '');
  const bytes = [];

  for(let i = 0; i < cleaned.length; i++){
    if(cleaned[i] === '=' && i + 2 < cleaned.length){
      const hex = cleaned.substring(i + 1, i + 3);
      if(/^[0-9A-Fa-f]{2}$/.test(hex)){
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    bytes.push(cleaned.charCodeAt(i) & 0xFF);
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
}

function decodeBase64(str){
  try{
    const clean = str.replace(/\s/g, '');
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }catch(e){
    return str;
  }
}

function extractHtmlFromMHTML(mhtml){
  if(!mhtml) return null;

  let boundary = null;
  const bMatch = mhtml.match(/boundary\s*=\s*"([^"]+)"/i) ||
                 mhtml.match(/boundary\s*=\s*([^\s;]+)/i);
  if(bMatch) boundary = bMatch[1];

  if(!boundary){
    const idx = mhtml.search(/<!DOCTYPE html|<html[\s>]/i);
    if(idx !== -1) return { html: mhtml.slice(idx), parts: 1, htmlPartsFound: 1 };
    return null;
  }

  const delim = '--' + boundary;
  const parts = mhtml.split(delim).slice(1);

  let htmlPartsFound = 0;
  let bestHtml = '';

  for(const part of parts){
    let headerEnd = part.indexOf('\r\n\r\n');
    let sepLen = 4;
    if(headerEnd === -1){ headerEnd = part.indexOf('\n\n'); sepLen = 2; }
    if(headerEnd === -1) continue;

    const headers = part.slice(0, headerEnd);
    let body = part.slice(headerEnd + sepLen);
    if(!/Content-Type:\s*text\/html/i.test(headers)) continue;
    htmlPartsFound++;

    const encMatch = headers.match(/Content-Transfer-Encoding:\s*(\S+)/i);
    const encoding = encMatch ? encMatch[1].toLowerCase() : '';

    if(encoding === 'base64') body = decodeBase64(body);
    else if(encoding === 'quoted-printable') body = decodeQuotedPrintable(body);

    if(body.length > bestHtml.length) bestHtml = body;
  }

  if(!htmlPartsFound) return null;

  if(boundary){
    const endIdx = bestHtml.indexOf('--' + boundary);
    if(endIdx !== -1) bestHtml = bestHtml.slice(0, endIdx);
  }

  return { html: bestHtml.trim(), parts: parts.length, htmlPartsFound };
}


/* ============================================================
   6. DETECCIÓN DE SITIO DE ORIGEN
   ----------------------------------------------------------------------------
   Un MHTML guarda la URL original en al menos uno de estos sitios:
   - Snapshot-Content-Location (cabecera propietaria de Chrome/Edge)
   - Content-Location (estándar MIME, presente en todas las partes)
   - <link rel="canonical"> o <meta property="og:url"> dentro del HTML

   Con esa URL podemos saber el dominio, y con el dominio podemos elegir
   el extractor específico que mejor funciona para cada sitio.
   ============================================================ */

/**
 * Extrae la URL original del MHTML. Devuelve string o null.
 * Prueba varias fuentes en orden de fiabilidad.
 */
function extractOriginUrl(mhtml){
  if(!mhtml) return null;

  // 1. Snapshot-Content-Location (Chrome, Edge, Brave, Vivaldi)
  const snapMatch = mhtml.match(/^Snapshot-Content-Location:\s*(\S+)/im);
  if(snapMatch) return snapMatch[1].trim();

  // 2. Cualquier Content-Location que sea una URL http/https
  const locMatches = mhtml.match(/Content-Location:\s*(\S+)/gi) || [];
  for(const line of locMatches){
    const m = line.match(/Content-Location:\s*(\S+)/i);
    if(m && /^https?:\/\//i.test(m[1])) return m[1].trim();
  }

  // 3. <link rel="canonical">
  const canonicalMatch = mhtml.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  );
  if(canonicalMatch) return canonicalMatch[1];

  // 4. <meta property="og:url">
  const ogUrlMatch = mhtml.match(
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i
  );
  if(ogUrlMatch) return ogUrlMatch[1];

  return null;
}

/**
 * Mapa dominio → clave de sitio.
 * Cuando un dominio no está en la lista, devolvemos 'unknown'
 * y se usará el extractor genérico.
 *
 * Para añadir un sitio nuevo, solo hay que agregar una entrada aquí
 * y definir sus selectores en SITE_SELECTORS (sección 7).
 */
const SITE_MAP = {
  'fanfiction.net':      'fanfiction',
  'archiveofourown.org': 'ao3',
  'webnovel.com':        'webnovel',
  'royalroad.com':       'royalroad',
  'wikipedia.org':       'wikipedia',
  'substack.com':        'substack',
  'blogspot.com':        'blogger',
};

/**
 * Devuelve la clave del sitio a partir de una URL.
 * Soporta coincidencia exacta y por sufijo de dominio.
 */
function detectSiteFromUrl(url){
  if(!url) return 'unknown';
  try{
    const host = new URL(url).hostname.toLowerCase();

    // Coincidencia exacta
    if(SITE_MAP[host]) return SITE_MAP[host];

    // Coincidencia por sufijo (m.fanfiction.net → fanfiction)
    for(const [domain, key] of Object.entries(SITE_MAP)){
      if(host === domain || host.endsWith('.' + domain)) return key;
    }
  }catch(e){ /* URL malformada */ }
  return 'unknown';
}

/**
 * Actualiza el pill del sitio en la barra de estado.
 * - Si siteKey es 'unknown', oculta el pill.
 * - Si siteKey es válido, muestra el nombre del sitio.
 */
function updateSiteBadge(siteKey){
  const badge = document.getElementById('siteBadge');
  if(!badge) return;

  if(!siteKey || siteKey === 'unknown'){
    badge.style.display = 'none';
    badge.textContent = '—';
    return;
  }

  // Capitalizamos la primera letra para que se vea más pulido
  const label = siteKey.charAt(0).toUpperCase() + siteKey.slice(1);
  badge.textContent = '🌐 ' + label;
  badge.style.display = '';
}


/* ============================================================
   7. EXTRACTORES DE CONTENIDO PRINCIPAL
   ----------------------------------------------------------------------------
   Estrategia en cascada:
     1. Si conocemos el sitio, usar su extractor específico basado en
        selectores CSS (mucho más robusto que regex).
     2. Si el específico falla, probar los regex conocidos (por ejemplo
        el de Fanfiction, que sigue siendo muy fiable).
     3. Fallback final: extractor genérico con regex amplios.
   ============================================================ */

/**
 * Selectores CSS por sitio. El orden importa: se prueban de izquierda
 * a derecha y se usa el primero que devuelva contenido suficiente.
 *
 * Usamos DOMParser para que el navegador parsee el HTML de forma nativa.
 * Es más lento que regex pero muchísimo más robusto ante HTML malformado.
 */
const SITE_SELECTORS = {
  'fanfiction': ['#storycontent'],
  'ao3':        ['#chapters .userstuff', '#workskin', '[role="article"].userstuff'],
  'webnovel':   ['.cha-content', '.cha-words', '#chapter-content', '.chapter-content'],
  'royalroad':  ['.chapter-content', '.chapter-inner'],
  'wikipedia':  ['#mw-content-text .mw-parser-output', '#mw-content-text'],
  'substack':   ['.body.markup', '.available-content .body'],
  'blogger':    ['.post-body.entry-content', '.post-body'],
};

const MIN_CONTENT_LENGTH = 200;   // umbral mínimo para considerar que el selector acertó

/**
 * Intenta extraer contenido usando los selectores CSS del sitio.
 * Devuelve el HTML del primer selector que encuentre con suficiente texto,
 * o null si ninguno funciona.
 */
function extractBySelectors(html, selectors){
  try{
    const doc = new DOMParser().parseFromString(html, 'text/html');
    for(const selector of selectors){
      const el = doc.querySelector(selector);
      if(el){
        const inner = el.innerHTML;
        if(inner && inner.trim().length >= MIN_CONTENT_LENGTH){
          return '<div>' + inner + '</div>';
        }
      }
    }
  }catch(e){
    console.warn('extractBySelectors falló:', e);
  }
  return null;
}

/**
 * Extractor específico para Fanfiction.net usando regex.
 * Se mantiene como fallback del selector #storycontent porque en
 * algunos MHTML el innerHTML viene con residuos del sitio que el
 * regex limpia mejor.
 */
function extractFanfictionRegex(html){
  const m = html.match(
    /<div[^>]*id="storycontent"[^>]*>([\s\S]*?)<\/div>\s*(?:<hr|<div\s+align="center"|<div class="drop_m")/i
  );
  return m && m[1] && m[1].length > 200 ? '<div>' + m[1] + '</div>' : null;
}

/**
 * Extractor genérico. Última línea de defensa: prueba patrones amplios
 * sobre cualquier HTML para quedarse con algo razonable.
 */
function extractGeneric(html){
  // Contenedor típico de artículos
  const genericMatch = html.match(
    /<(article|div)[^>]*(?:class|id)\s*=\s*"[^"]*(?:story|chapter|post|article|content)[^"]*"[^>]*>([\s\S]*?)<\/\1>/i
  );
  if(genericMatch && genericMatch[2] && genericMatch[2].length > 500){
    return '<div>' + genericMatch[2] + '</div>';
  }

  // Fallback final: devolver el HTML completo sin filtrar
  return html;
}

/**
 * Extrae el contenido principal usando toda la cascada.
 * Devuelve { html, method } donde method indica qué estrategia funcionó:
 *   - 'site-selector'  → selector específico del sitio
 *   - 'site-regex'     → regex específico (fanfiction)
 *   - 'generic'        → extractor genérico
 *   - 'none'           → no se pudo filtrar (devuelve original)
 */
function extractMainContent(html, siteKey = 'unknown'){
  if(!html) return { html, method: 'none' };

  // 1. Selector específico del sitio
  const selectors = SITE_SELECTORS[siteKey];
  if(selectors){
    const extracted = extractBySelectors(html, selectors);
    if(extracted) return { html: extracted, method: 'site-selector' };
  }

  // 2. Regex específico de Fanfiction
  if(siteKey === 'fanfiction'){
    const extracted = extractFanfictionRegex(html);
    if(extracted) return { html: extracted, method: 'site-regex' };
  }

  // 3. Extractor genérico
  const generic = extractGeneric(html);
  const filtered = generic.length < html.length;
  return { html: generic, method: filtered ? 'generic' : 'none' };
}

/**
 * Prepara la entrada completa: extrae HTML si es MHTML, detecta el
 * sitio, aplica el extractor adecuado y devuelve metadatos para la UI.
 */
function prepareHTML(rawInput){
  if(!rawInput || !rawInput.trim()) throw new Error('La entrada está vacía.');

  // --- Caso MHTML ---
  if(looksLikeMHTML(rawInput)){
    const extracted = extractHtmlFromMHTML(rawInput);
    if(!extracted || !extracted.html){
      throw new Error('Se detectó MHTML pero no se encontró ninguna parte text/html dentro.');
    }

    const originUrl = extractOriginUrl(rawInput);
    const siteKey = detectSiteFromUrl(originUrl);
    const originalLen = extracted.html.length;
    const result = extractMainContent(extracted.html, siteKey);
    const wasFiltered = result.html.length < originalLen;

    const siteLabel = siteKey !== 'unknown' ? ` [${siteKey}]` : '';
    const methodLabel = {
      'site-selector': ' · extractor específico',
      'site-regex':    ' · regex específico',
      'generic':       ' · extractor genérico',
      'none':          '',
    }[result.method] || '';

    return {
      html: result.html,
      wasMHTML: true,
      wasFiltered,
      siteKey,
      originUrl,
      method: result.method,
      info: `MHTML parseado (${extracted.parts} partes)${siteLabel}${methodLabel}. ` +
            `HTML útil: ${originalLen.toLocaleString()} → ${result.html.length.toLocaleString()} caracteres` +
            (wasFiltered ? ' (solo contenido del capítulo)' : '') + '.'
    };
  }

  // --- Caso HTML plano ---
  const originUrl = extractOriginUrl(rawInput);
  const siteKey = detectSiteFromUrl(originUrl);
  const result = extractMainContent(rawInput, siteKey);
  const wasFiltered = result.html.length < rawInput.length;

  return {
    html: result.html,
    wasMHTML: false,
    wasFiltered,
    siteKey,
    originUrl,
    method: result.method,
    info: wasFiltered
      ? `HTML filtrado (${siteKey}). ${rawInput.length.toLocaleString()} → ${result.html.length.toLocaleString()} caracteres.`
      : null
  };
}

/**
 * Actualiza el badge que indica si la entrada es HTML o MHTML.
 * También actualiza el badge del sitio detectado.
 */
function updateFormatBadge(){
  const raw = document.getElementById('htmlInput').value;
  const badge = document.getElementById('formatBadge');

  if(!raw.trim()){
    badge.textContent = 'Sin datos';
    badge.className = 'pill';
    updateSiteBadge('unknown');
    return;
  }

  if(looksLikeMHTML(raw)){
    badge.textContent = '📦 MHTML detectado';
    badge.className = 'pill pill-warn';
  }else{
    badge.textContent = '📄 HTML';
    badge.className = 'pill pill-accent';
  }

  // Detectar el sitio y actualizar el pill
  const originUrl = extractOriginUrl(raw);
  const siteKey = detectSiteFromUrl(originUrl);
  updateSiteBadge(siteKey);
}


/* ============================================================
   8. LECTURA DE ARCHIVOS CON DETECCIÓN DE CHARSET
   ============================================================ */
async function readFileSmart(file){
  const buffer = await file.arrayBuffer();

  let preview = '';
  try{
    preview = new TextDecoder('utf-8').decode(buffer.slice(0, 4096));
  }catch(e){}

  let charset = 'utf-8';
  const m = preview.match(/<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i);
  if(m && m[1]){
    const detected = m[1].toLowerCase();
    const supported = [
      'utf-8','utf8','iso-8859-1','latin1','windows-1252','windows-1251',
      'shift_jis','euc-jp','gbk','big5','koi8-r'
    ];
    if(supported.includes(detected)) {
      charset = detected === 'utf8' ? 'utf-8' : detected;
    }
  }

  try{
    return new TextDecoder(charset, { fatal: false }).decode(buffer);
  }catch(e){
    return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  }
}


/* ============================================================
   9. CONVERSIÓN SEGURA
   ============================================================ */
function safeHtmlToMarkdown(html){
  if(!mdreamLoaded) throw new Error('El motor aún se está cargando. Espera 1-2 segundos.');
  if(!html || !html.trim()) throw new Error('El HTML está vacío.');

  let result;
  try{
    result = htmlToMarkdown(html);
  }catch(e){
    throw new Error('Error al parsear: ' + (e.message || e));
  }

  if(result === undefined || result === null){
    throw new Error('El HTML no se pudo procesar (¿formato no soportado?).');
  }
  if(typeof result === 'string') return result;
  if(typeof result === 'object' && typeof result.markdown === 'string') return result.markdown;

  throw new Error('Resultado inesperado: ' + typeof result);
}


/* ============================================================
   10. TABS
   ============================================================ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});


/* ============================================================
   11. TAB 1: CONVERTIR HTML
   ============================================================ */
const htmlInput  = document.getElementById('htmlInput');
const fileInput  = document.getElementById('fileInput');
const uploadCard = document.getElementById('uploadCard');
const btnConvert = document.getElementById('btnConvert');

htmlInput.addEventListener('input', () => {
  updateCounter('htmlInput', 'inputCounter');
  updateFormatBadge();
});
updateCounter('htmlInput', 'inputCounter');
updateFormatBadge();

fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if(f) loadHTMLFile(f);
  fileInput.value = '';
});

['dragenter','dragover'].forEach(ev => uploadCard.addEventListener(ev, e => {
  e.preventDefault();
  uploadCard.classList.add('drag');
}));
['dragleave','drop'].forEach(ev => uploadCard.addEventListener(ev, e => {
  e.preventDefault();
  uploadCard.classList.remove('drag');
}));
uploadCard.addEventListener('drop', e => {
  const f = e.dataTransfer.files[0];
  if(f) loadHTMLFile(f);
});

function markUploadCardLoaded(fileName){
  uploadCard.classList.add('loaded');
  document.getElementById('uploadTitleText').innerHTML = '<span class="hl">Archivo cargado</span>';
  document.getElementById('uploadSubText').textContent = 'Pulsa "Convertir a Markdown" para procesarlo';

  const fn = document.getElementById('fileNameDisplay');
  fn.textContent = '📄 ' + fileName;
  fn.classList.add('show');
}

function resetUploadCard(){
  uploadCard.classList.remove('loaded');

  if(PLATFORM !== 'desktop'){
    document.getElementById('uploadTitleText').innerHTML =
      'Toca para <span class="hl">seleccionar un archivo</span>';
    document.getElementById('uploadSubText').textContent =
      'Se abrirá el selector de archivos del sistema';
  } else {
    document.getElementById('uploadTitleText').innerHTML =
      'Suelta tu archivo aquí o <span class="hl">haz clic para elegirlo</span>';
    document.getElementById('uploadSubText').textContent =
      'Compatible con archivos guardados desde el navegador';
  }

  const fn = document.getElementById('fileNameDisplay');
  fn.textContent = '';
  fn.classList.remove('show');
}

async function loadHTMLFile(file){
  if(file.size > 10 * 1024 * 1024){
    if(!confirm(`El archivo pesa ${(file.size/1024/1024).toFixed(1)} MB. ` +
                `Puede tardar bastante. ¿Continuar?`)) return;
  }

  alertMsg('convertAlert',
    `⏳ Leyendo <b>${esc(file.name)}</b> (${(file.size/1024).toFixed(1)} KB)…`, 'info');

  try{
    const text = await readFileSmart(file);
    htmlInput.value = text;
    updateCounter('htmlInput', 'inputCounter');
    updateFormatBadge();         // esto también actualiza el badge del sitio
    markUploadCardLoaded(file.name);

    // Limpiar el resultado previo
    document.getElementById('mdOutput').textContent = '';
    updateCounter('mdOutput', 'outputCounter');
    document.getElementById('convertInfo').textContent = '';
    setDownloadEnabled(false);

    if(looksLikeMHTML(text)){
      const siteKey = detectSiteFromUrl(extractOriginUrl(text));
      const siteMsg = siteKey !== 'unknown'
        ? `🌐 <b>Sitio reconocido:</b> <code>${esc(siteKey)}</code> — se usará su extractor específico.<br>`
        : `🌐 Sitio no reconocido: se usará el extractor genérico.<br>`;
      alertMsg('convertAlert',
        `📦 <b>MHTML detectado:</b> <code>${esc(file.name)}</code>.<br>${siteMsg}`,
        siteKey !== 'unknown' ? 'ok' : 'info');
    }else{
      alertMsg('convertAlert',
        `✅ HTML cargado: <b>${esc(file.name)}</b> (${file.size.toLocaleString()} bytes).`,
        'ok');
    }
  }catch(err){
    alertMsg('convertAlert', '❌ Error leyendo el archivo: ' + esc(err.message), 'err');
  }
}

document.getElementById('btnPaste').addEventListener('click', async () => {
  try{
    const text = await navigator.clipboard.readText();
    if(text){
      htmlInput.value = text;
      updateCounter('htmlInput', 'inputCounter');
      updateFormatBadge();
      resetUploadCard();
      setDownloadEnabled(false);

      document.getElementById('mdOutput').textContent = '';
      updateCounter('mdOutput', 'outputCounter');
      document.getElementById('convertInfo').textContent = '';

      alertMsg('convertAlert', `✅ Pegado (${text.length.toLocaleString()} caracteres).`, 'ok');
      return;
    }
  }catch(e){}

  htmlInput.focus();
  alertMsg('convertAlert',
    '⚠️ Tu navegador no permite leer el portapapeles automáticamente.<br>' +
    'El campo ya está enfocado: mantén pulsado dentro y elige <b>"Pegar"</b>.',
    'warn');
});

document.getElementById('btnClear').addEventListener('click', () => {
  htmlInput.value = '';
  document.getElementById('mdOutput').textContent = '';
  resetUploadCard();
  updateCounter('htmlInput', 'inputCounter');
  updateCounter('mdOutput', 'outputCounter');
  updateFormatBadge();
  document.getElementById('convertAlert').className = 'alert';
  document.getElementById('convertInfo').textContent = '';
  setDownloadEnabled(false);
});

btnConvert.addEventListener('click', async () => {
  if(processing) return;
  if(!mdreamLoaded) return alertMsg('convertAlert', '⏳ El motor aún se está cargando…', 'warn');

  const raw = htmlInput.value;
  if(!raw.trim()) return alertMsg('convertAlert', '⚠️ Pega o carga un archivo primero.', 'warn');

  if(raw.length > 3_000_000){
    if(!confirm(`El HTML tiene ${(raw.length/1e6).toFixed(1)} MB de texto. ` +
                `La conversión puede tardar varios segundos. ¿Continuar?`)) return;
  }

  processing = true;
  btnConvert.disabled = true;
  setDownloadEnabled(false);
  const originalText = btnConvert.textContent;
  btnConvert.innerHTML = '<span class="spinner"></span>Convirtiendo…';

  await new Promise(r => setTimeout(r, 30));

  try{
    const prepared = prepareHTML(raw);
    const md = safeHtmlToMarkdown(prepared.html);

    document.getElementById('mdOutput').textContent = md;
    updateCounter('mdOutput', 'outputCounter');

    const reduction = raw.length > 0 ? (100 - md.length/raw.length*100) : 0;
    let infoMsg = `✅ Convertido: ${raw.length.toLocaleString()} → ${md.length.toLocaleString()} ` +
                  `caracteres (${reduction.toFixed(1)}% de reducción).`;
    if(prepared.wasMHTML) infoMsg = `📦 ${prepared.info}\n✅ Markdown: ${md.length.toLocaleString()} caracteres.`;
    else if(prepared.info) infoMsg = `📄 ${prepared.info}\n✅ Markdown: ${md.length.toLocaleString()} caracteres.`;
    document.getElementById('convertInfo').textContent = infoMsg;

    alertMsg('convertAlert',
      prepared.wasMHTML
        ? '📦 MHTML convertido correctamente. Ya puedes descargar el .md.'
        : '✅ Conversión completada. Ya puedes descargar el .md.',
      'ok');

    if(md && md.length > 0) setDownloadEnabled(true);
  }catch(err){
    document.getElementById('mdOutput').textContent = '❌ Error: ' + err.message;
    updateCounter('mdOutput', 'outputCounter');
    alertMsg('convertAlert', '❌ ' + esc(err.message), 'err');
    setDownloadEnabled(false);
  }finally{
    processing = false;
    btnConvert.disabled = false;
    btnConvert.textContent = originalText;
  }
});

document.getElementById('btnCopyMd').addEventListener('click', async () => {
  const md = document.getElementById('mdOutput').textContent;
  if(!md || !md.trim() || md.startsWith('❌')){
    return alertMsg('convertAlert', '⚠️ No hay Markdown que copiar.', 'warn');
  }
  const ok = await copyToClipboard(md);
  alertMsg('convertAlert',
    ok ? '✅ Markdown copiado.' : '⚠️ No se pudo copiar. Selecciónalo manualmente.',
    ok ? 'ok' : 'warn');
});

document.getElementById('btnDownloadMd').addEventListener('click', openDownloadModal);


/* ============================================================
   12. TAB 2: OBTENER DE URL
   ============================================================ */
function showAssistMessage(type, msg){
  const el = document.getElementById('assistSteps');
  el.querySelectorAll('.assist-dynamic').forEach(n => n.remove());

  const div = document.createElement('div');
  div.className = 'alert alert-' + type + ' show assist-dynamic';
  div.style.margin = '0 0 15px 0';
  div.innerHTML = msg;
  el.insertBefore(div, el.firstChild);
}

document.getElementById('btnCopyUrl').addEventListener('click', async () => {
  const url = document.getElementById('assistUrl').value.trim();
  if(!url) return alert('Introduce una URL.');

  const ok = await copyToClipboard(url);
  if(ok){
    let msg = '📋 <b>URL copiada al portapapeles.</b><br><br>';

    if(PLATFORM === 'android'){
      msg += '1️⃣ Abre Chrome → pega la URL → Enter.<br>' +
             '2️⃣ Menú ⋮ → <b>"Descargar página"</b>.<br>' +
             '3️⃣ Vuelve aquí y usa el panel de carga.';
    } else if(PLATFORM === 'ios'){
      msg += '1️⃣ Abre Safari → pega la URL → Enter.<br>' +
             '2️⃣ Compartir → <b>"Guardar en Archivos"</b>.<br>' +
             '3️⃣ Vuelve aquí y usa el panel de carga.';
    } else {
      msg += '1️⃣ Pega la URL en el navegador.<br>' +
             '2️⃣ <b>Ctrl+U</b> → <b>Ctrl+A</b> → <b>Ctrl+C</b>.<br>' +
             '3️⃣ Vuelve aquí y pulsa <b>"Pegar"</b>.';
    }

    showAssistMessage('ok', msg);
    const el = document.getElementById('assistSteps');
    window.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' });
  }else{
    alert('⚠️ No se pudo copiar. Selecciona el texto del campo manualmente.');
  }
});

document.getElementById('btnOpenPage').addEventListener('click', () => {
  const url = document.getElementById('assistUrl').value.trim();
  if(!url) return alert('Introduce una URL.');

  const opened = window.open(url, '_blank', 'noopener');

  if(!opened){
    alert('⚠️ El navegador bloqueó la apertura. Usa "Copiar URL" y pégala manualmente.');
  } else if(PLATFORM === 'android'){
    setTimeout(() => {
      showAssistMessage('warn',
        '⚠️ Si se abrió la app en lugar del navegador, ciérrala y usa <b>"Copiar URL"</b>. ' +
        'Android asocia ciertos dominios a sus apps por defecto.');
    }, 500);
  }
});

document.getElementById('btnGoConvert').addEventListener('click', () => {
  document.querySelector('.tab-btn[data-tab="tab-convert"]').click();
  setTimeout(() => {
    uploadCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 150);
});


/* ============================================================
   13. INICIALIZACIÓN
   ============================================================ */
renderPlatformBadge();
renderAssistSteps();
loadMdream();
setDownloadEnabled(false);
updateSiteBadge('unknown');   // pill de sitio oculto al arrancar