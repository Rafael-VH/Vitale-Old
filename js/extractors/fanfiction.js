/* ============================================================================
   VITALE — Extractor: Fanfiction.net
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractors.register('fanfiction', {
  label: 'Fanfiction',
  domains: ['fanfiction.net'],
  selectors: ['#storycontent'],
  // Regex específico: en algunos MHTML el innerHTML de #storycontent trae
  // residuos que el regex limpia mejor que el selector.
  custom: function(html){
    const m = html.match(
      /<div[^>]*id="storycontent"[^>]*>([\s\S]*?)<\/div>\s*(?:<hr|<div\s+align="center"|<div class="drop_m")/i
    );
    return m && m[1] && m[1].length > 200 ? '<div>' + m[1] + '</div>' : null;
  }
});