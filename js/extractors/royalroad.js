/* ============================================================================
   VITALE — Extractor: Royal Road
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractors.register('royalroad', {
  label: 'Royal Road',
  domains: ['royalroad.com'],
  selectors: ['.chapter-content', '.chapter-inner']
});