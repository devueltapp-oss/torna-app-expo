/**
 * Formatea segundos a formato MM:SS
 * @param seconds - Duración en segundos
 * @returns String formateado como "MM:SS"
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
