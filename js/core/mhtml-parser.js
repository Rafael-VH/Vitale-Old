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
   * Decodifica quoted-printable acumulando bytes y decodificando como
   * UTF-8 de una sola pasada. Así se preservan los caracteres multi-byte.
   */
  function decodeQuotedPrintable(str){
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

    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
  }

  /** Decodifica base64 a texto UTF-8. */
  function decodeBase64(str){
    try{
      const clean = str.replace(/\s/g, '');
      const bin = atob(clean);
      const bytes = new Uint8Array(bin.length);
      for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
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

      if(encoding === 'base64') body = decodeBase64(body);
      else if(encoding === 'quoted-printable') body = decodeQuotedPrintable(body);

      if(body.length > bestHtml.length) bestHtml = body;
    }

    if(!htmlPartsFound) return null;

    if(boundary){
      const endIdx = bestHtml.indexOf('--' + boundary);
      if(endIdx !== -1) bestHtml = bestHtml.slice(0, endIdx);
    }

    return { html: bestHtml.trim(), parts: parts.length, htmlPartsFound };
  }

  return { looksLikeMHTML, decodeQuotedPrintable, decodeBase64, extractHtmlFromMHTML };
})();