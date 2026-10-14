/* ============================================================================
   VITALE — Extractor: Wikipedia
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractors.register('wikipedia', {
  label: 'Wikipedia',
  domains: ['wikipedia.org'],
  selectors: [
    '#mw-content-text .mw-parser-output',
    '#mw-content-text'
  ]
});