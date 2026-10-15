/* ============================================================================
   VITALE — Extractores: registry
   ----------------------------------------------------------------------------
   Registro central de extractores por sitio. Cada archivo extractor llama a
   Vitale.extractors.register(nombre, config) al cargarse.

   Config esperada:
   {
     domains:   ['ejemplo.com'],                    // dominios que cubre
     selectors: ['#contenido', '.clase'],           // selectores CSS en orden
     custom:    (html) => '...' | null,             // opcional, extractor propio
     label:     'Ejemplo'                           // nombre legible para el pill
   }
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.extractors = (function(){

  const registry = new Map();

  /** Registra un extractor. Se llama desde cada archivo extractor. */
  function register(name, config){
    if(!name || !config) throw new Error('register requiere nombre y config');
    registry.set(name, Object.assign({ name }, config));
  }

  /** Devuelve la config del extractor o undefined. */
  function get(name){
    return registry.get(name);
  }

  /** ¿Existe un extractor registrado con ese nombre? */
  function has(name){
    return registry.has(name);
  }

  /** Lista de nombres de extractores registrados. */
  function list(){
    return [...registry.keys()];
  }

  /** Todos los dominios cubiertos, para el detector. */
  function allDomains(){
    // Sin prototipo: así ningún host puede colisionar con una propiedad
    // heredada de Object.prototype ("constructor", "__proto__"…).
    const map = Object.create(null);
    for(const [name, cfg] of registry){
      if(cfg.domains){
        for(const d of cfg.domains) map[d] = name;
      }
    }
    return map;
  }

  /** Devuelve la etiqueta legible para el pill del sitio. */
  function labelOf(name){
    const cfg = registry.get(name);
    return (cfg && cfg.label) || (name ? name.charAt(0).toUpperCase() + name.slice(1) : name);
  }

  return { register, get, has, list, allDomains, labelOf };
})();