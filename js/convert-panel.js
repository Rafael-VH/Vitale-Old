/* ============================================================================
   VITALE — Panel "Convertir HTML"
   ----------------------------------------------------------------------------
   Toda la lógica del tab principal: carga de archivo, drag&drop, pegado,
   conversión y limpieza.
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.convertPanel = (function(){

  let processing = false;

  // Timer del debounce del badge de formato (ver scheduleBadgeUpdate)
  let badgeTimer = null;
  const BADGE_DELAY_MS = 150;

  // Elementos que se asignan en setup()
  let htmlInput, fileInput, uploadCard, btnConvert;

  /** Marca el panel de carga como "archivo cargado" y muestra el nombre. */
  function markLoaded(fileName){
    uploadCard.classList.add('loaded');
    document.getElementById('uploadTitleText').innerHTML = '<span class="hl">Archivo cargado</span>';
    document.getElementById('uploadSubText').textContent = 'Pulsa "Convertir" para procesarlo';

    const fn = document.getElementById('fileNameDisplay');
    fn.textContent = '📄 ' + fileName;
    fn.classList.add('show');
  }

  /** Restaura el panel de carga a su estado inicial. */
  function resetCard(){
    uploadCard.classList.remove('loaded');
    Vitale.platform.renderUploadCard();

    const fn = document.getElementById('fileNameDisplay');
    fn.textContent = '';
    fn.classList.remove('show');
  }

  /** Limpia la salida de la conversión anterior. */
  function clearOutput(){
    document.getElementById('mdOutput').value = '';
    Vitale.utils.updateCounter('mdOutput', 'outputCounter');
    document.getElementById('convertInfo').textContent = '';
    Vitale.utils.setDownloadEnabled(false);
  }

  /** Lee un archivo y prepara el panel para convertir. */
  async function loadFile(file){
    if(file.size > 10 * 1024 * 1024){
      if(!confirm(`El archivo pesa ${(file.size/1024/1024).toFixed(1)} MB. ` +
                  `Puede tardar bastante. ¿Continuar?`)) return;
    }

    Vitale.utils.alertMsg('convertAlert',
      `⏳ Leyendo <b>${Vitale.utils.esc(file.name)}</b> (${(file.size/1024).toFixed(1)} KB)…`, 'info');

    try{
      const text = await Vitale.charset.readFileSmart(file);
      htmlInput.value = text;
      Vitale.utils.updateCounter('htmlInput', 'inputCounter');
      Vitale.siteDetector.updateFormatBadge();
      markLoaded(file.name);
      clearOutput();

      if(Vitale.mhtml.looksLikeMHTML(text)){
        const siteKey = Vitale.siteDetector.detectSiteFromUrl(
          Vitale.siteDetector.extractOriginUrl(text)
        );
        const siteMsg = siteKey !== 'unknown'
          ? `🌐 <b>Sitio reconocido:</b> <code>${Vitale.utils.esc(siteKey)}</code> — se usará su extractor específico.<br>`
          : `🌐 Sitio no reconocido: se usará el extractor genérico.<br>`;
        Vitale.utils.alertMsg('convertAlert',
          `📦 <b>MHTML detectado:</b> <code>${Vitale.utils.esc(file.name)}</code>.<br>${siteMsg}`,
          siteKey !== 'unknown' ? 'ok' : 'info');
      }else{
        Vitale.utils.alertMsg('convertAlert',
          `✅ HTML cargado: <b>${Vitale.utils.esc(file.name)}</b> (${file.size.toLocaleString()} bytes).`,
          'ok');
      }
    }catch(err){
      Vitale.utils.alertMsg('convertAlert', '❌ Error leyendo el archivo: ' + Vitale.utils.esc(err.message), 'err');
    }
  }

  /** Ejecuta la conversión completa. */
  async function convert(){
    if(processing) return;
    if(!Vitale.mdream.isLoaded()){
      return Vitale.utils.alertMsg('convertAlert', '⏳ El motor aún se está cargando…', 'warn');
    }

    const raw = htmlInput.value;
    if(!raw.trim()){
      return Vitale.utils.alertMsg('convertAlert', '⚠️ Pega o carga un archivo primero.', 'warn');
    }
    if(raw.length > 3_000_000){
      if(!confirm(`El HTML tiene ${(raw.length/1e6).toFixed(1)} MB de texto. ` +
                  `La conversión puede tardar varios segundos. ¿Continuar?`)) return;
    }

    processing = true;
    btnConvert.disabled = true;
    Vitale.utils.setDownloadEnabled(false);
    const originalText = btnConvert.textContent;
    btnConvert.innerHTML = '<span class="spinner"></span>Convirtiendo…';

    await new Promise(r => setTimeout(r, 30));

    try{
      const prepared = Vitale.siteDetector.prepareHTML(raw);
      const md = Vitale.mdream.convert(prepared.html);

      document.getElementById('mdOutput').value = md;
      Vitale.utils.updateCounter('mdOutput', 'outputCounter');

      const reduction = raw.length > 0 ? (100 - md.length/raw.length*100) : 0;
      let infoMsg = `✅ Convertido: ${raw.length.toLocaleString()} → ${md.length.toLocaleString()} ` +
                    `caracteres (${reduction.toFixed(1)}% de reducción).`;
      if(prepared.wasMHTML) infoMsg = `📦 ${prepared.info}\n✅ Markdown: ${md.length.toLocaleString()} caracteres.`;
      else if(prepared.info) infoMsg = `📄 ${prepared.info}\n✅ Markdown: ${md.length.toLocaleString()} caracteres.`;
      document.getElementById('convertInfo').textContent = infoMsg;

      Vitale.utils.alertMsg('convertAlert',
        prepared.wasMHTML
          ? '📦 MHTML convertido correctamente. Ya puedes descargar el .md.'
          : '✅ Conversión completada. Ya puedes descargar el .md.',
        'ok');

      if(md && md.length > 0) Vitale.utils.setDownloadEnabled(true);
    }catch(err){
      document.getElementById('mdOutput').value = '❌ Error: ' + err.message;
      Vitale.utils.updateCounter('mdOutput', 'outputCounter');
      Vitale.utils.alertMsg('convertAlert', '❌ ' + Vitale.utils.esc(err.message), 'err');
      Vitale.utils.setDownloadEnabled(false);
    }finally{
      processing = false;
      btnConvert.disabled = false;
      btnConvert.textContent = originalText;
    }
  }

  /**
   * Difiere la actualización del badge de formato.
   * `updateFormatBadge` corre cuatro regex sobre el texto completo (hasta 3 MB):
   * repetirlo en cada tecla bloquea el hilo ~8 ms por pulsación. El contador de
   * caracteres NO se difiere: es O(1) y debe sentirse instantáneo.
   */
  function scheduleBadgeUpdate(){
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => {
      badgeTimer = null;
      Vitale.siteDetector.updateFormatBadge();
    }, BADGE_DELAY_MS);
  }

  /** Conecta todos los eventos del panel. */
  function setup(){
    htmlInput  = document.getElementById('htmlInput');
    fileInput  = document.getElementById('fileInput');
    uploadCard = document.getElementById('uploadCard');
    btnConvert = document.getElementById('btnConvert');

    // Contador (inmediato) y badge de formato (diferido al dejar de teclear)
    htmlInput.addEventListener('input', () => {
      Vitale.utils.updateCounter('htmlInput', 'inputCounter');
      scheduleBadgeUpdate();
    });
    Vitale.utils.updateCounter('htmlInput', 'inputCounter');
    Vitale.siteDetector.updateFormatBadge();

    // El resultado es editable: el contador sigue lo que se escribe dentro,
    // igual que en el campo de entrada. updateCounter ya lee `.value`.
    document.getElementById('mdOutput').addEventListener('input', () => {
      Vitale.utils.updateCounter('mdOutput', 'outputCounter');
    });

    // Input de archivo
    fileInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if(f) loadFile(f);
      fileInput.value = '';
    });

    // Drag & drop
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
      if(f) loadFile(f);
    });

    // Botón Limpiar
    document.getElementById('btnClear').addEventListener('click', () => {
      htmlInput.value = '';
      document.getElementById('mdOutput').value = '';
      resetCard();
      Vitale.utils.updateCounter('htmlInput', 'inputCounter');
      Vitale.utils.updateCounter('mdOutput', 'outputCounter');
      Vitale.siteDetector.updateFormatBadge();
      Vitale.utils.clearAlert('convertAlert');
      document.getElementById('convertInfo').textContent = '';
      Vitale.utils.setDownloadEnabled(false);
    });

    // Botón Convertir
    btnConvert.addEventListener('click', convert);

    // Botón Copiar Markdown
    document.getElementById('btnCopyMd').addEventListener('click', async () => {
      const md = document.getElementById('mdOutput').value;
      if(!md || !md.trim() || md.startsWith('❌')){
        return Vitale.utils.alertMsg('convertAlert', '⚠️ No hay Markdown que copiar.', 'warn');
      }
      const ok = await Vitale.utils.copyToClipboard(md);
      Vitale.utils.alertMsg('convertAlert',
        ok ? '✅ Markdown copiado.' : '⚠️ No se pudo copiar. Selecciónalo manualmente.',
        ok ? 'ok' : 'warn');
    });

    // Botón Descargar → abre el modal
    document.getElementById('btnDownloadMd').addEventListener('click', Vitale.downloadModal.open);
  }

  return { setup };
})();