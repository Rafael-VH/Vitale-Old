/* ============================================================================
   VITALE — Core: lectura de archivos con detección de charset
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.charset = (function(){

  const SUPPORTED = [
    'utf-8','utf8','iso-8859-1','latin1','windows-1252','windows-1251',
    'shift_jis','euc-jp','gbk','big5','koi8-r'
  ];

  /**
   * Lee un File y devuelve su contenido como string, detectando el charset
   * a partir del <meta charset> del HTML. Fallback a UTF-8.
   */
  async function readFileSmart(file){
    const buffer = await file.arrayBuffer();

    let preview = '';
    try{
      preview = new TextDecoder('utf-8').decode(buffer.slice(0, 4096));
    }catch(e){}

    let charset = 'utf-8';
    const m = preview.match(/<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i);
    if(m && m[1]){
      const detected = m[1].toLowerCase();
      if(SUPPORTED.includes(detected)){
        charset = detected === 'utf8' ? 'utf-8' : detected;
      }
    }

    try{
      return new TextDecoder(charset, { fatal: false }).decode(buffer);
    }catch(e){
      return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    }
  }

  return { readFileSmart };
})();