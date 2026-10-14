/* ============================================================================
   VITALE — Extractor: Blogger
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractors.register('blogger', {
  label: 'Blogger',
  domains: ['blogspot.com'],
  selectors: ['.post-body.entry-content', '.post-body']
});