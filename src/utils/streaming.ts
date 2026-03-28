/**
 * Utilidades para manejo de URLs de streaming
 */

/**
 * Valida si una URL es válida para streaming HLS
 */
export function isValidHLSUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    if (typeof url !== 'string') {
      return false;
    }

    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      return false;
    }

    const parsedUrl = new URL(normalizedUrl);
    
    // Debe ser HTTPS (requerido por iOS)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return false;
    }

    // No debe ser RTMP (no compatible con react-native-video)
    if (normalizedUrl.toLowerCase().startsWith('rtmp://')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Formatea la URL de streaming para asegurar compatibilidad
 * Agrega /playlist.m3u8 si no está presente y es necesario
 */
export function formatStreamingUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  let processedUrl = url.trim();

  // Si es una ruta relativa (comienza con /), construir URL completa de Wowza
  if (processedUrl.startsWith('/')) {
    const baseUrl = 'https://www.wowzacontrol.com/public';
    processedUrl = `${baseUrl}${processedUrl}`;
  }

  // Si ya termina en .m3u8, está bien
  if (processedUrl.endsWith('.m3u8')) {
    return processedUrl;
  }

  // Si es una URL de Wowza sin el archivo .m3u8, agregarlo
  if (processedUrl.includes('wowza') && !processedUrl.includes('.m3u8')) {
    const formattedUrl = processedUrl.endsWith('/') 
      ? `${processedUrl}playlist.m3u8` 
      : `${processedUrl}/playlist.m3u8`;
    
    return formattedUrl;
  }

  // Asumir que es una URL válida sin extensión (algunos servicios no la usan)
  return processedUrl;
}

/**
 * Obtiene la URL de streaming desde un objeto Game
 * y la valida/formatea antes de usarla
 */
export function getValidStreamUrl(streamUrl: string | null | undefined): string | null {
  if (!streamUrl) {
    return null;
  }

  const normalizedUrl = typeof streamUrl === 'string' ? streamUrl.trim() : '';
  if (!normalizedUrl) {
    return null;
  }

  if (!isValidHLSUrl(normalizedUrl)) {
    return null;
  }

  const formatted = formatStreamingUrl(normalizedUrl);

  if (
    formatted &&
    (formatted.toLowerCase().includes('/playlist.m3u8') ||
      formatted.toLowerCase().endsWith('.m3u8'))
  ) {
    return formatted;
  }

  if (formatted) {
    const withPlaylist = formatted.endsWith('/')
      ? `${formatted}playlist.m3u8`
      : `${formatted}/playlist.m3u8`;
    return withPlaylist;
  }

  return formatted;
}

/**
 * Extrae información útil de la URL para debugging
 */
export function getStreamInfo(url: string | null | undefined): {
  isValid: boolean;
  protocol: string | null;
  host: string | null;
  path: string | null;
  isHLS: boolean;
} {
  if (!url) {
    return {
      isValid: false,
      protocol: null,
      host: null,
      path: null,
      isHLS: false,
    };
  }

  try {
    const parsedUrl = new URL(url);
    return {
      isValid: isValidHLSUrl(url),
      protocol: parsedUrl.protocol,
      host: parsedUrl.host,
      path: parsedUrl.pathname,
      isHLS: url.includes('.m3u8') || url.includes('hls'),
    };
  } catch {
    return {
      isValid: false,
      protocol: null,
      host: null,
      path: null,
      isHLS: false,
    };
  }
}

/**
 * Test URLs para desarrollo
 */
export const TEST_STREAM_URLS = {
  // Big Buck Bunny - Stream de prueba público
  bigBuckBunny: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  
  // Apple's HLS test streams
  appleBasic: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
  
  // Otro stream de prueba
  sintel: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
};

