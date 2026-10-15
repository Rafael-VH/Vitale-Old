/* ============================================================================
   VITALE — Core: utilidades generales
   ----------------------------------------------------------------------------
   Funciones transversales sin dependencias. Se exponen bajo Vitale.utils.
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.utils = (function(){

  /**
   * Escapa caracteres HTML peligrosos.
   * El `&` va primero para no re-escapar entidades ya generadas.
   * Cubre también comillas, así es seguro si algún día se usa en un atributo.
   */
  function esc(s){
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  /** Timer compartido para autocerrar alertas de éxito. */
  let _alertTimer = null;

  /**
   * Muestra un mensaje en una caja de alerta con color según tipo.
   * Tipos: 'ok' | 'warn' | 'err' | 'info'.
   * Los mensajes de éxito se ocultan solos a los 8s.
   */
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

  /**
   * Actualiza el contador de caracteres de un campo.
   * Soporta textarea/input (.value) y div (.textContent).
   */
  function updateCounter(inputId, counterId){
    const el = document.getElementById(inputId);
    const c  = document.getElementById(counterId);
    if(!el || !c) return;

    let len = 0;
    if(typeof el.value === 'string') len = el.value.length;
    else if(typeof el.textContent === 'string') len = el.textContent.length;

    c.textContent = len.toLocaleString() + ' caracteres';
  }

  /**
   * Copia al portapapeles con fallback para navegadores sin permisos.
   * Devuelve true si tuvo éxito.
   */
  async function copyToClipboard(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(e){}

    let ta = null;
    try{
      ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      return document.execCommand('copy');
    }catch(e){
      return false;
    }finally{
      // En finally: si `select` o `execCommand` lanzan, el nodo se quita igual.
      if(ta && ta.parentNode) ta.parentNode.removeChild(ta);
    }
  }

  /**
   * Descarga contenido como archivo.
   * Prepend BOM UTF-8 para que visores de Android/Windows muestren bien
   * los acentos (sin BOM asumen Latin-1 y se ven "Ã¡", "Ã©"...).
   */
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

  /** Habilita o deshabilita el botón de descarga. */
  function setDownloadEnabled(enabled){
    const btn = document.getElementById('btnDownloadMd');
    if(btn) btn.disabled = !enabled;
  }

  return { esc, alertMsg, updateCounter, copyToClipboard, downloadFile, setDownloadEnabled };
})();