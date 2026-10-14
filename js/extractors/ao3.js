/* ============================================================================
   VITALE — Extractor: Archive of Our Own (AO3)
   ----------------------------------------------------------------------------
   Estructura típica:
     #workskin
       #chapters
         .chapter[id="chapter-N"]
           .userstuff.module   ← texto del capítulo
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractors.register('ao3', {
  label: 'AO3',
  domains: ['archiveofourown.org'],
  // Con querySelectorAll, si hay varios capítulos en la página
  // (p.ej. ?view_full_work=true) se concatenan todos.
  selectors: [
    '#chapters .userstuff.module',
    '#chapters .userstuff',
    '#workskin .userstuff.module',
    '.userstuff.module',
    '.userstuff'
  ]
});