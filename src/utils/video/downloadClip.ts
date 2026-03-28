/**
 * Descarga un clip de video desde una URL
 * Nota: Esta función retorna la URL del clip para usar directamente con react-native-video
 * Para guardar localmente, se puede usar la librería react-native-fs si está disponible
 * @param clipUrl - URL del clip a descargar
 * @param clipId - ID del clip
 * @returns URL del clip (por ahora retorna la misma URL, puede extenderse para descarga local)
 */
export const downloadClip = async (
  clipUrl: string,
  clipId: string,
): Promise<string> => {
  // Por ahora retornamos la URL directamente
  // En el futuro se puede implementar descarga local usando react-native-fs
  // o similar si se requiere almacenamiento offline
  return clipUrl;
};
