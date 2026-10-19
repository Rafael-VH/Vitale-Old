/* ============================================================================
   VITALE — Extractor: Fanfiction.net
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractors.register('fanfiction', {
  label: 'Fanfiction',
  domains: ['fanfiction.net'],
  // Sin `custom`: `selectors` corre antes y aquel paso exigía el mismo umbral
  // (200 chars), así que nunca podía aportar nada. Ver tests/extractor-reachability.test.js.
  selectors: ['#storycontent']
});