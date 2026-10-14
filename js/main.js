/* ============================================================================
   VITALE — Bootstrap
   ----------------------------------------------------------------------------
   Punto de entrada. Carga el motor, inicializa los paneles y conecta los tabs.
   Este archivo debe cargarse ÚLTIMO en index.html.
   ========================================================================== */

window.Vitale = window.Vitale || {};

(function(){

  /** Alterna entre pestañas. */
  function setupTabs(){
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  /** Arranca la aplicación. */
  function init(){
    // Textos y badges según plataforma
    Vitale.platform.renderBadge();
    Vitale.platform.renderAssistSteps();

    // Conectar paneles
    Vitale.downloadModal.setup();
    Vitale.convertPanel.setup();
    Vitale.assistPanel.setup();
    setupTabs();

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