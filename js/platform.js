/* ============================================================================
   VITALE — Detección de plataforma
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.platform = (function(){

  function detect(){
    const ua = navigator.userAgent || '';
    if(/android/i.test(ua)) return 'android';
    if(/iphone|ipad|ipod/i.test(ua)) return 'ios';
    return 'desktop';
  }

  const PLATFORM = detect();

  /**
   * Copia del upload-card, definida UNA sola vez. La usan el arranque
   * (renderBadge) y el reseteo del panel de conversión: así no pueden divergir.
   */
  function uploadCopy(){
    if(PLATFORM === 'desktop'){
      return {
        title: 'Suelta tu archivo aquí o <span class="hl">haz clic para elegirlo</span>',
        sub: 'Compatible con archivos guardados desde el navegador'
      };
    }
    return {
      title: 'Toca para <span class="hl">seleccionar un archivo</span>',
      sub: 'Se abrirá el selector de archivos del sistema'
    };
  }

  /** Escribe la copia del upload-card que corresponde a esta plataforma. */
  function renderUploadCard(){
    const c = uploadCopy();
    document.getElementById('uploadTitleText').innerHTML = c.title;
    document.getElementById('uploadSubText').textContent = c.sub;
  }

  /** Actualiza el pill de plataforma y los textos del upload-card. */
  function renderBadge(){
    const b = document.getElementById('platformBadge');
    const icons = { android:'🤖 Android', ios:'🍎 iOS', desktop:'💻 Escritorio' };
    b.textContent = icons[PLATFORM];
    renderUploadCard();
  }

  /** Rellena los pasos del asistente según plataforma. */
  function renderAssistSteps(){
    const el = document.getElementById('assistSteps');
    const step = (n, html) =>
      `<div class="step"><div class="step-num">${n}</div><div class="step-body">${html}</div></div>`;

    if(PLATFORM === 'android'){
      el.innerHTML =
        step(1, 'Pulsa <b>"Copiar URL"</b>. Copia el enlace sin abrirlo, evitando que Android lo redirija a la app.') +
        step(2, 'Abre Chrome o Firefox, pega la URL y pulsa Enter.') +
        step(3, 'En el menú <kbd>⋮</kbd>, elige <b>"Descargar página"</b>. Se guardará como <code>.mhtml</code>.') +
        step(4, 'Vuelve aquí y toca el panel de carga para seleccionar el archivo.') +
        step(5, 'Pulsa <b>"Convertir"</b> y luego <b>"Descargar"</b>.');
    } else if(PLATFORM === 'ios'){
      el.innerHTML =
        step(1, 'Pulsa <b>"Copiar URL"</b>.') +
        step(2, 'Abre Safari, pega la URL y pulsa Enter.') +
        step(3, 'Compartir (⎋) → <b>"Opciones"</b> → <b>"Página web"</b> → <b>"Guardar en Archivos"</b>.') +
        step(4, 'Vuelve aquí y toca el panel de carga para seleccionar el archivo.') +
        step(5, 'Pulsa <b>"Convertir"</b> y luego <b>"Descargar"</b>.');
    } else {
      el.innerHTML =
        step(1, 'Pulsa <b>"Copiar URL"</b> o <b>"Intentar abrir"</b>.') +
        step(2, 'En la pestaña nueva, pulsa <kbd>Ctrl</kbd>+<kbd>U</kbd> (o clic derecho → <b>Ver código fuente</b>).') +
        step(3, 'Pulsa <kbd>Ctrl</kbd>+<kbd>A</kbd> → <kbd>Ctrl</kbd>+<kbd>C</kbd>.') +
        step(4, 'Vuelve aquí y pega con <kbd>Ctrl</kbd>+<kbd>V</kbd> en el campo de entrada.') +
        step(5, 'Pulsa <b>"Convertir"</b> y luego <b>"Descargar"</b>.');
    }
  }

  return { PLATFORM, renderBadge, renderUploadCard, renderAssistSteps };
})();