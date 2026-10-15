/* ============================================================================
   VITALE — Carga del motor mdream
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.mdream = (function(){

  let htmlToMarkdown = null;
  let loaded = false;

  // Fuentes ordenadas del motor. Se intentan en orden hasta obtener una válida.
  // Versión fijada por seguridad de suministro (no se adoptan releases nuevas sin control).
  const SOURCES = [
    'https://cdn.jsdelivr.net/npm/@mdream/js@2.0.3/+esm',
    'https://esm.sh/@mdream/js@2.0.3'
  ];

  /** Carga mdream desde el CDN. Actualiza el estado visual. */
  async function load(){
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    dot.classList.add('loading');

    for(const url of SOURCES){
      try{
        const core = await import(url);
        if(typeof core.htmlToMarkdown !== 'function') throw new Error('htmlToMarkdown no disponible');

        htmlToMarkdown = core.htmlToMarkdown;
        loaded = true;
        dot.classList.remove('loading');
        dot.classList.add('ready');
        txt.textContent = 'Vitale listo';
        return;
      }catch(err){
        // Fuente no disponible o inválida: se intenta la siguiente.
      }
    }

    dot.classList.remove('loading');
    txt.textContent = '❌ Error al cargar: no se pudo cargar el motor desde ninguna fuente';
  }

  function isLoaded(){ return loaded; }

  /**
   * Convierte HTML a Markdown con validación de resultado.
   * Lanza errores descriptivos en caso de fallo.
   */
  function convert(html){
    if(!loaded) throw new Error('El motor aún se está cargando. Espera 1-2 segundos.');
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

  return { load, isLoaded, convert };
})();