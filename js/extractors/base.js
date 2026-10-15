/* ============================================================================
   VITALE — Extractores: helpers compartidos
   ----------------------------------------------------------------------------
   Funciones que los extractores usan para aplicar sus selectores y para
   el fallback genérico.
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractorBase = (function(){

  const MIN_CONTENT_LENGTH = 200;

  /**
   * Aplica una lista de selectores CSS al HTML usando DOMParser.
   * Concatena el contenido de TODOS los elementos que coincidan
   * (útil para sitios con varios capítulos en la misma página).
   * Devuelve el HTML combinado o null si ninguno cumple el mínimo.
   */
  function extractBySelectors(html, selectors){
    try{
      const doc = new DOMParser().parseFromString(html, 'text/html');
      for(const selector of selectors){
        const els = doc.querySelectorAll(selector);
        if(els.length === 0) continue;

        let combined = '';
        let totalLen = 0;
        els.forEach(el => {
          const inner = el.innerHTML;
          if(inner && inner.trim()){
            combined += inner + '\n';
            totalLen += inner.length;
          }
        });

        if(totalLen >= MIN_CONTENT_LENGTH){
          return '<div>' + combined + '</div>';
        }
      }
    }catch(e){
      console.warn('extractBySelectors falló:', e);
    }
    return null;
  }

  /**
   * Extractor genérico: patrones amplios que funcionan en cualquier HTML.
   * Usa DOMParser para tolerar comillas simples o dobles y anidamiento real:
   * un regex perezoso cortaría en el primer `</div>` y perdería contenido.
   * Última línea de defensa antes de devolver el HTML completo.
   *
   * `<article>` y `<main>` ya son contenedores semánticos de contenido, así que
   * no se les exige class/id: pedirlo era el falso negativo del bug #9.
   */
  function extractGeneric(html){
    try{
      const doc = new DOMParser().parseFromString(html, 'text/html');
      for(const el of doc.querySelectorAll('article, main, div')){
        const semantic = el.tagName === 'ARTICLE' || el.tagName === 'MAIN';
        const ident = (el.getAttribute('class') || '') + ' ' + (el.id || '');
        if(!semantic && !/(story|chapter|post|article|content)/i.test(ident)) continue;
        const inner = el.innerHTML;
        if(inner && inner.length > 500){
          return '<div>' + inner + '</div>';
        }
      }
    }catch(e){
      console.warn('extractGeneric falló:', e);
    }
    return html;
  }

  /**
   * Aplica un extractor registrado sobre el HTML.
   * Orden: selectores → custom → null.
   * Devuelve { html, method } o null si el extractor no pudo.
   */
  function applyExtractor(html, name){
    const cfg = Vitale.extractors.get(name);
    if(!cfg) return null;

    if(cfg.selectors && cfg.selectors.length){
      const result = extractBySelectors(html, cfg.selectors);
      if(result) return { html: result, method: 'site-selector' };
    }

    if(typeof cfg.custom === 'function'){
      try{
        const result = cfg.custom(html);
        if(result) return { html: result, method: 'site-custom' };
      }catch(e){
        console.warn('Extractor custom falló para', name, e);
      }
    }

    return null;
  }

  /**
   * Cascada completa:
   *   1. Extractor específico del sitio (si se conoce)
   *   2. Extractor genérico
   * Devuelve { html, method }.
   */
  function extractMainContent(html, siteKey){
    if(!html) return { html, method: 'none' };

    if(siteKey && Vitale.extractors.has(siteKey)){
      const result = applyExtractor(html, siteKey);
      if(result) return result;
    }

    const generic = extractGeneric(html);
    const filtered = generic.length < html.length;
    return { html: generic, method: filtered ? 'generic' : 'none' };
  }

  return { extractBySelectors, extractGeneric, applyExtractor, extractMainContent, MIN_CONTENT_LENGTH };
})();