/* ============================================================================
   VITALE — Control de tema (auto / claro / oscuro)
   ----------------------------------------------------------------------------
   Tres modos, `auto` por defecto, ciclo auto → light → dark → auto.
   `auto` se representa por la AUSENCIA de data-theme en <html>.
   El glifo del botón refleja el modo ELEGIDO, no el esquema resuelto:
   un usuario en `auto` ve el glifo automático, no un sol.
   El script pre-paint de <head> restaura el atributo antes del primer
   pintado; este módulo es el único dueño del comportamiento.
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.theme = (function(){

  const KEY = 'vitale.theme';
  const MODES = ['auto', 'light', 'dark'];

  const LABELS = { auto: 'Automático', light: 'Claro', dark: 'Oscuro' };

  const GLYPHS = {
    // círculo medio rellenado — "que decida el sistema"
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>',
    // sol
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    // luna
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>'
  };

  function read(){
    try {
      const m = localStorage.getItem(KEY);
      return MODES.indexOf(m) > -1 ? m : 'auto';
    } catch(e){ return 'auto'; }
  }

  function write(mode){
    try { localStorage.setItem(KEY, mode); } catch(e){ /* persistencia rota, no la app */ }
  }

  function apply(mode){
    const el = document.documentElement;
    if(mode === 'auto') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', mode);
  }

  function next(mode){
    return MODES[(MODES.indexOf(mode) + 1) % MODES.length];
  }

  function render(mode){
    const btn = document.getElementById('themeToggle');
    if(!btn) return;
    const n = next(mode);
    btn.innerHTML = GLYPHS[mode];
    btn.setAttribute('aria-label', 'Tema: ' + LABELS[mode] + '. Cambiar a ' + LABELS[n] + '.');
  }

  function init(){
    const btn = document.getElementById('themeToggle');
    if(!btn) return;
    btn.hidden = false; // nace hidden en el HTML: sin JS no hay nada que alternar
    let mode = read();
    apply(mode);
    render(mode);
    btn.addEventListener('click', function(){
      mode = next(mode);
      write(mode);
      apply(mode);
      render(mode);
    });
  }

  return { KEY, MODES, init };
})();
