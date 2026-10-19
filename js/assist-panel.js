/* ============================================================================
   VITALE — Guía "Obtener el HTML" (modal)
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.assistPanel = (function(){

  let modal;
  let lastFocus;   // elemento que abrió la guía, para devolverle el foco al cerrar

  /**
   * Abre la guía y mueve el foco dentro del diálogo.
   * `trigger` es el elemento que la abrió (se le devuelve el foco al cerrar);
   * si no se pasa, se usa el elemento activo en ese momento.
   */
  function open(trigger){
    lastFocus = trigger || document.activeElement;
    modal.classList.add('show');
    // El foco va tras el reflow: un elemento todavía oculto no acepta focus().
    setTimeout(() => {
      const field = document.getElementById('assistUrl');
      if(field && typeof field.focus === 'function') field.focus();
    }, 100);
  }

  /** Cierra la guía y devuelve el foco a quien la abrió. */
  function close(){
    modal.classList.remove('show');
    if(lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  /**
   * Inserta un aviso dinámico en la lista de pasos.
   * Elimina los anteriores para que no se apilen.
   */
  function showMessage(type, msg){
    const el = document.getElementById('assistSteps');
    el.querySelectorAll('.assist-dynamic').forEach(n => n.remove());

    const div = document.createElement('div');
    div.className = 'alert alert-' + type + ' show assist-dynamic';
    div.style.margin = '0 0 15px 0';
    div.innerHTML = msg;
    el.insertBefore(div, el.firstChild);
  }

  /**
   * Normaliza y valida la URL escrita en el campo.
   * Devuelve una URL absoluta http/https, o null si no es segura
   * (bloquea javascript:, data:, vbscript:, file:…). Sin "://" se asume https://,
   * así "sitio.com/capitulo" sigue funcionando.
   */
  function safeUrl(raw){
    const text = (raw || '').trim();
    if(!text) return null;

    let u;
    try{
      u = new URL(text.includes('://') ? text : 'https://' + text);
    }catch(e){
      return null;
    }

    if(u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  }

  function setup(){
    modal = document.getElementById('assistModal');

    // Abrir / cerrar la guía
    document.getElementById('btnAssist').addEventListener('click', e => open(e.currentTarget));
    document.getElementById('btnCloseAssist').addEventListener('click', close);
    modal.addEventListener('click', e => { if(e.target === modal) close(); });
    // Escape se escucha en document: la guía se abre desde un botón de fuera, así
    // que el evento nunca llegaría al modal si el foco no estuviera dentro.
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape' && modal.classList.contains('show')) close();
    });

    // Copiar URL
    document.getElementById('btnCopyUrl').addEventListener('click', async () => {
      const url = safeUrl(document.getElementById('assistUrl').value);
      if(!url){ showMessage('warn', 'Introduce una URL http:// o https:// válida.'); return; }

      const ok = await Vitale.utils.copyToClipboard(url);
      if(ok){
        // Solo confirmación: los pasos por plataforma están definidos en un único
        // lugar (Vitale.platform.renderAssistSteps) y se ven justo debajo.
        showMessage('ok', '📋 <b>URL copiada al portapapeles.</b> Seguí los pasos de abajo.');
        document.getElementById('assistSteps').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }else{
        showMessage('warn', '⚠️ No se pudo copiar. Selecciona el texto del campo manualmente.');
      }
    });

    // Intentar abrir la URL
    document.getElementById('btnOpenPage').addEventListener('click', () => {
      const url = safeUrl(document.getElementById('assistUrl').value);
      if(!url){ showMessage('warn', 'Introduce una URL http:// o https:// válida.'); return; }

      const opened = window.open(url, '_blank', 'noopener');

      if(!opened){
        showMessage('warn', '⚠️ El navegador bloqueó la apertura. Usa "Copiar URL" y pégala manualmente.');
      } else if(Vitale.platform.PLATFORM === 'android'){
        setTimeout(() => {
          showMessage('warn',
            '⚠️ Si se abrió la app en lugar del navegador, ciérrala y usa <b>"Copiar URL"</b>. ' +
            'Android asocia ciertos dominios a sus apps por defecto.');
        }, 500);
      }
    });

    // Ir al panel de carga. Es una navegación, no un simple cierre: el foco va
    // al destino (el campo de pegado), no de vuelta al disparador.
    document.getElementById('btnGoConvert').addEventListener('click', () => {
      close();
      const target = document.getElementById('htmlInput');
      if(target && typeof target.focus === 'function') target.focus();
      document.getElementById('uploadCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  return { setup, open, close };
})();