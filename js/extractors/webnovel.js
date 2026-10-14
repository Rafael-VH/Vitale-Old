/* ============================================================================
   VITALE — Extractor: Webnovel
   ----------------------------------------------------------------------------
   Webnovel ha cambiado su estructura varias veces. Probamos varios
   contenedores en orden de fiabilidad.
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractors.register('webnovel', {
  label: 'Webnovel',
  domains: ['webnovel.com'],
  selectors: [
    '.cha-content',
    '.cha-words',
    '#chapter-content',
    '.chapter-content'
  ]
});