/* ============================================================================
   VITALE — Extractor: Substack
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractors.register('substack', {
  label: 'Substack',
  domains: ['substack.com'],
  selectors: ['.body.markup', '.available-content .body']
});