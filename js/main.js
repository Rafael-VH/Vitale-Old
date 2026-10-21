/* ============================================================================
   VITALE — Bootstrap
   ----------------------------------------------------------------------------
   Punto de entrada. Carga el motor e inicializa los paneles.
   Este archivo debe cargarse ÚLTIMO en index.html.
   ========================================================================== */

window.Vitale = window.Vitale || {};

(function(){

  /** Arranca la aplicación. */
  function init(){
    // Textos y badges según plataforma
    Vitale.platform.renderBadge();
    Vitale.platform.renderAssistSteps();

    // Conectar paneles
    Vitale.downloadModal.setup();
    Vitale.convertPanel.setup();
    Vitale.assistPanel.setup();
    Vitale.theme.init();

    // Estado inicial
    Vitale.utils.setDownloadEnabled(false);
    Vitale.siteDetector.updateSiteBadge('unknown');

    // Cargar motor (asíncrono, no bloquea)
    Vitale.mdream.load();

    // Log de extractores registrados (útil en desarrollo)
    console.log('[Vitale] Extractores registrados:', Vitale.extractors.list());
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();