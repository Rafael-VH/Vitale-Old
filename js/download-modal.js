/* ============================================================================
   VITALE — Modal de descarga
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.downloadModal = (function(){

  const DEFAULT_FILENAME = 'vitale';
  let modal, input, preview, lastFocus;

  function sanitizeFilename(name){
    return (name || '')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\.md$/i, '')
      .trim()
      .slice(0, 80);
  }

  function updatePreview(){
    const base = sanitizeFilename(input.value) || DEFAULT_FILENAME;
    preview.textContent = base + '.md';
  }

  /**
   * Lee el Markdown actual y valida que sea descargable.
   * Devuelve el texto, o null (avisando al usuario) si no lo es.
   */
  function markdownOrWarn(){
    const md = document.getElementById('mdOutput').value;
    if(!md || !md.trim() || md.startsWith('❌')){
      Vitale.utils.alertMsg('convertAlert', '⚠️ No hay Markdown que descargar.', 'warn');
      return null;
    }
    return md;
  }

  function open(evt){
    if(markdownOrWarn() === null) return;

    // `evt` llega tal cual del listener de click (lo cablea convert-panel); si no
    // es un evento, se usa el elemento activo como disparador.
    const trigger = (evt && evt.currentTarget) ||
      (evt && typeof evt.focus === 'function' ? evt : null);
    lastFocus = trigger || document.activeElement;

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

    input.value = suggested;
    updatePreview();
    modal.classList.add('show');
    setTimeout(() => { input.focus(); input.select(); }, 100);
  }

  function close(){
    modal.classList.remove('show');
    if(lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  function confirm(){
    const md = markdownOrWarn();
    if(md === null){ close(); return; }

    const base = sanitizeFilename(input.value) || DEFAULT_FILENAME;
    const finalName = base + '.md';

    try{
      Vitale.utils.downloadFile(finalName, md);
      close();
      Vitale.utils.alertMsg('convertAlert',
        `💾 Descarga iniciada como <b>${Vitale.utils.esc(finalName)}</b>. Revisa tu carpeta de Descargas.`, 'ok');
    }catch(e){
      Vitale.utils.alertMsg('convertAlert',
        '⚠️ No se pudo descargar: ' + Vitale.utils.esc(e.message) + '<br>Usa "Copiar" en su lugar.', 'warn');
    }
  }

  /** Conecta los eventos del modal. Se llama una vez al inicio. */
  function setup(){
    modal = document.getElementById('downloadModal');
    input = document.getElementById('filenameInput');
    preview = document.getElementById('filenamePreview');

    input.addEventListener('input', updatePreview);
    input.addEventListener('keydown', e => {
      if(e.key === 'Enter'){ e.preventDefault(); confirm(); }
    });
    modal.addEventListener('click', e => {
      if(e.target === modal) close();
    });
    // Escape en document: cierra aunque el foco no esté en el input (por ejemplo
    // en un botón del modal tras tabular).
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape' && modal.classList.contains('show')) close();
    });
    document.getElementById('btnCancelDownload').addEventListener('click', close);
    document.getElementById('btnConfirmDownload').addEventListener('click', confirm);
  }

  return { setup, open, close, confirm };
})();