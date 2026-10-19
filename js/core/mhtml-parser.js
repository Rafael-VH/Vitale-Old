/* ============================================================================
   VITALE — Core: parser MHTML
   ----------------------------------------------------------------------------
   Detecta y extrae la parte text/html de un archivo MHTML.
   ========================================================================== */

window.Vitale = window.Vitale || {};

Vitale.mhtml = (function(){

  /** Comprueba si el texto parece un MHTML mirando solo las primeras 2KB. */
  function looksLikeMHTML(text){
    if(!text) return false;
    const head = text.slice(0, 2000);
    return /From:\s*<Saved by Blink>/i.test(head) ||
           /Content-Type:\s*multipart\/related/i.test(head) ||
           /^From:\s*.*\r?\n.*MIME-Version:\s*1\.0/im.test(head);
  }

  /**
   * Decodifica bytes con el charset que declara la parte. TextDecoder lanza
   * RangeError si el label no es válido, así que caemos a UTF-8 en vez de
   * romper la conversión entera.
   */
  function safeDecode(bytes, charset){
    try{
      return new TextDecoder(charset || 'utf-8', { fatal: false }).decode(bytes);
    }catch(e){
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    }
  }

  /**
   * Decodifica quoted-printable acumulando bytes y decodificando de una sola
   * pasada con el charset declarado por la parte (por defecto UTF-8). Así se
   * preservan los multi-byte de UTF-8 y también los bytes altos de
   * windows-1252/iso-8859-1 (antes se forzaba UTF-8 → mojibake).
   */
  function decodeQuotedPrintable(str, charset){
    const cleaned = str.replace(/=\r?\n/g, '');
    const bytes = [];

    for(let i = 0; i < cleaned.length; i++){
      if(cleaned[i] === '=' && i + 2 < cleaned.length){
        const hex = cleaned.substring(i + 1, i + 3);
        if(/^[0-9A-Fa-f]{2}$/.test(hex)){
          bytes.push(parseInt(hex, 16));
          i += 2;
          continue;
        }
      }
      bytes.push(cleaned.charCodeAt(i) & 0xFF);
    }

    return safeDecode(new Uint8Array(bytes), charset);
  }

  /** Decodifica base64 a texto usando el charset declarado por la parte. */
  function decodeBase64(str, charset){
    try{
      const clean = str.replace(/\s/g, '');
      const bin = atob(clean);
      const bytes = new Uint8Array(bin.length);
      for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return safeDecode(bytes, charset);
    }catch(e){
      return str;
    }
  }

  /**
   * Extrae la parte HTML más grande de un MHTML.
   * Devuelve { html, parts, htmlPartsFound } o null.
   */
  function extractHtmlFromMHTML(mhtml){
    if(!mhtml) return null;

    let boundary = null;
    const bMatch = mhtml.match(/boundary\s*=\s*"([^"]+)"/i) ||
                   mhtml.match(/boundary\s*=\s*([^\s;]+)/i);
    if(bMatch) boundary = bMatch[1];

    if(!boundary){
      const idx = mhtml.search(/<!DOCTYPE html|<html[\s>]/i);
      if(idx !== -1) return { html: mhtml.slice(idx), parts: 1, htmlPartsFound: 1 };
      return null;
    }

    const delim = '--' + boundary;
    const parts = mhtml.split(delim).slice(1);

    let htmlPartsFound = 0;
    let bestHtml = '';

    for(const part of parts){
      let headerEnd = part.indexOf('\r\n\r\n');
      let sepLen = 4;
      if(headerEnd === -1){ headerEnd = part.indexOf('\n\n'); sepLen = 2; }
      if(headerEnd === -1) continue;

      const headers = part.slice(0, headerEnd);
      let body = part.slice(headerEnd + sepLen);
      if(!/Content-Type:\s*text\/html/i.test(headers)) continue;
      htmlPartsFound++;

      const encMatch = headers.match(/Content-Transfer-Encoding:\s*(\S+)/i);
      const encoding = encMatch ? encMatch[1].toLowerCase() : '';

      // El charset declarado en el Content-Type de ESTA parte manda sobre el
      // del archivo completo: en MHTML cada parte puede traer el suyo.
      const ctLine = headers.match(/Content-Type:\s*([^\r\n]+)/i);
      const csMatch = ctLine && ctLine[1].match(/charset\s*=\s*"?([\w-]+)/i);
      const charset = csMatch ? csMatch[1].toLowerCase() : 'utf-8';

      if(encoding === 'base64') body = decodeBase64(body, charset);
      else if(encoding === 'quoted-printable') body = decodeQuotedPrintable(body, charset);

      if(body.length > bestHtml.length) bestHtml = body;
    }

    if(!htmlPartsFound) return null;

    const endIdx = bestHtml.indexOf('--' + boundary);
    if(endIdx !== -1) bestHtml = bestHtml.slice(0, endIdx);

    return { html: bestHtml.trim(), parts: parts.length, htmlPartsFound };
  }

  // decodeBase64 se queda interno: lo usa extractHtmlFromMHTML para las partes
  // base64, pero ningún otro módulo lo consume directamente.
  return { looksLikeMHTML, decodeQuotedPrintable, extractHtmlFromMHTML };
})();