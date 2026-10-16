/* ============================================================================
   VITALE — Guía "Obtener el HTML" (modal)
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.assistPanel = (function(){

  let modal;

  /** Abre la guía. */
  function open(){ modal.classList.add('show'); }

  /** Cierra la guía. */
  function close(){ modal.classList.remove('show'); }

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
    document.getElementById('btnAssist').addEventListener('click', open);
    document.getElementById('btnCloseAssist').addEventListener('click', close);
    modal.addEventListener('click', e => { if(e.target === modal) close(); });
    modal.addEventListener('keydown', e => { if(e.key === 'Escape') close(); });

    // Copiar URL
    document.getElementById('btnCopyUrl').addEventListener('click', async () => {
      const url = safeUrl(document.getElementById('assistUrl').value);
      if(!url) return alert('Introduce una URL http:// o https:// válida.');

      const ok = await Vitale.utils.copyToClipboard(url);
      if(ok){
        let msg = '📋 <b>URL copiada al portapapeles.</b><br><br>';
        const P = Vitale.platform.PLATFORM;

        if(P === 'android'){
          msg += '1️⃣ Abre Chrome → pega la URL → Enter.<br>' +
                 '2️⃣ Menú ⋮ → <b>"Descargar página"</b>.<br>' +
                 '3️⃣ Vuelve aquí y usa el panel de carga.';
        } else if(P === 'ios'){
          msg += '1️⃣ Abre Safari → pega la URL → Enter.<br>' +
                 '2️⃣ Compartir → <b>"Guardar en Archivos"</b>.<br>' +
                 '3️⃣ Vuelve aquí y usa el panel de carga.';
        } else {
          msg += '1️⃣ Pega la URL en el navegador.<br>' +
                 '2️⃣ <b>Ctrl+U</b> → <b>Ctrl+A</b> → <b>Ctrl+C</b>.<br>' +
                 '3️⃣ Vuelve aquí y pulsa <b>"Pegar"</b>.';
        }

        showMessage('ok', msg);
        document.getElementById('assistSteps').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }else{
        alert('⚠️ No se pudo copiar. Selecciona el texto del campo manualmente.');
      }
    });

    // Intentar abrir la URL
    document.getElementById('btnOpenPage').addEventListener('click', () => {
      const url = safeUrl(document.getElementById('assistUrl').value);
      if(!url) return alert('Introduce una URL http:// o https:// válida.');

      const opened = window.open(url, '_blank', 'noopener');

      if(!opened){
        alert('⚠️ El navegador bloqueó la apertura. Usa "Copiar URL" y pégala manualmente.');
      } else if(Vitale.platform.PLATFORM === 'android'){
        setTimeout(() => {
          showMessage('warn',
            '⚠️ Si se abrió la app en lugar del navegador, ciérrala y usa <b>"Copiar URL"</b>. ' +
            'Android asocia ciertos dominios a sus apps por defecto.');
        }, 500);
      }
    });

    // Ir al panel de carga
    document.getElementById('btnGoConvert').addEventListener('click', () => {
      close();
      document.getElementById('uploadCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  return { setup, open, close };
})();