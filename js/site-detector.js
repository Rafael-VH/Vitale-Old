/* ============================================================================
   VITALE — Detector de sitio de origen
   ----------------------------------------------------------------------------
   Extrae la URL original del MHTML y clasifica el sitio consultando el
   registry de extractores. Si el dominio no está cubierto, devuelve 'unknown'.
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.siteDetector = (function(){

  /**
   * Extrae la URL original del MHTML.
   * Prueba: Snapshot-Content-Location → Content-Location → canonical → og:url.
   */
  function extractOriginUrl(mhtml){
    if(!mhtml) return null;

    const snapMatch = mhtml.match(/^Snapshot-Content-Location:\s*(\S+)/im);
    if(snapMatch) return snapMatch[1].trim();

    const locMatches = mhtml.match(/Content-Location:\s*(\S+)/gi) || [];
    for(const line of locMatches){
      const m = line.match(/Content-Location:\s*(\S+)/i);
      if(m && /^https?:\/\//i.test(m[1])) return m[1].trim();
    }

    const canonicalMatch = mhtml.match(
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
    );
    if(canonicalMatch) return canonicalMatch[1];

    const ogUrlMatch = mhtml.match(
      /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i
    );
    if(ogUrlMatch) return ogUrlMatch[1];

    return null;
  }

  /**
   * Devuelve la clave del sitio a partir de una URL.
   * Consulta el registry: los extractores registran sus dominios.
   */
  function detectSiteFromUrl(url){
    if(!url) return 'unknown';
    try{
      const host = new URL(url).hostname.toLowerCase();
      const map = Vitale.extractors.allDomains();

      if(map[host]) return map[host];

      for(const [domain, key] of Object.entries(map)){
        if(host === domain || host.endsWith('.' + domain)) return key;
      }
    }catch(e){}
    return 'unknown';
  }

  /** Actualiza el pill del sitio detectado en la barra de estado. */
  function updateSiteBadge(siteKey){
    const badge = document.getElementById('siteBadge');
    if(!badge) return;

    if(!siteKey || siteKey === 'unknown'){
      badge.style.display = 'none';
      badge.textContent = '—';
      return;
    }

    const label = Vitale.extractors.labelOf(siteKey);
    badge.textContent = '🌐 ' + label;
    badge.style.display = '';
  }

  /**
   * Prepara la entrada completa: MHTML → HTML → extracción por sitio.
   * Devuelve el objeto con html final y metadatos para la UI.
   */
  function prepareHTML(rawInput){
    if(!rawInput || !rawInput.trim()) throw new Error('La entrada está vacía.');

    if(Vitale.mhtml.looksLikeMHTML(rawInput)){
      const extracted = Vitale.mhtml.extractHtmlFromMHTML(rawInput);
      if(!extracted || !extracted.html){
        throw new Error('Se detectó MHTML pero no se encontró ninguna parte text/html dentro.');
      }

      const originUrl = extractOriginUrl(rawInput);
      const siteKey = detectSiteFromUrl(originUrl);
      const originalLen = extracted.html.length;
      const result = Vitale.extractorBase.extractMainContent(extracted.html, siteKey);
      const wasFiltered = result.html.length < originalLen;

      const siteLabel = siteKey !== 'unknown' ? ` [${siteKey}]` : '';
      const methodLabel = {
        'site-selector': ' · extractor específico',
        'site-custom':   ' · extractor específico',
        'generic':       ' · extractor genérico',
        'none':          ''
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

    const originUrl = extractOriginUrl(rawInput);
    const siteKey = detectSiteFromUrl(originUrl);
    const result = Vitale.extractorBase.extractMainContent(rawInput, siteKey);
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

  /** Actualiza los badges de formato y sitio según el contenido actual. */
  function updateFormatBadge(){
    const raw = document.getElementById('htmlInput').value;
    const badge = document.getElementById('formatBadge');

    if(!raw.trim()){
      badge.textContent = 'Sin datos';
      badge.className = 'pill';
      updateSiteBadge('unknown');
      return;
    }

    if(Vitale.mhtml.looksLikeMHTML(raw)){
      badge.textContent = '📦 MHTML detectado';
      badge.className = 'pill pill-warn';
    }else{
      badge.textContent = '📄 HTML';
      badge.className = 'pill pill-accent';
    }

    const originUrl = extractOriginUrl(raw);
    const siteKey = detectSiteFromUrl(originUrl);
    updateSiteBadge(siteKey);
  }

  return { extractOriginUrl, detectSiteFromUrl, updateSiteBadge, prepareHTML, updateFormatBadge };
})();