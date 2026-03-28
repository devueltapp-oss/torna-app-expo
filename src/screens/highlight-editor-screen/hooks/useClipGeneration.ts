import { useState, useCallback } from 'react';
import { postCreateClipApi, ClipResponse } from '@/api/video/PostCreateClipApi';
import { useAuth } from '@/contexts/authContext';
import { downloadClip } from '@/utils/video/downloadClip';

export interface UseClipGenerationReturn {
  generateClip: (
    recordingUrl: string,
    start: number,
    end: number,
    gameId: string,
  ) => Promise<ClipResponse | null>;
  isGenerating: boolean;
  progress: number;
  error: string | null;
  clipResponse: ClipResponse | null;
}

export const useClipGeneration = (): UseClipGenerationReturn => {
  const { firebaseUser, getAccessToken } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [clipResponse, setClipResponse] = useState<ClipResponse | null>(null);

  const generateClip = useCallback(
    async (
      recordingUrl: string,
      start: number,
      end: number,
      gameId: string,
    ): Promise<ClipResponse | null> => {
      if (!firebaseUser) {
        setError('Debes estar autenticado para generar clips');
        return null;
      }

      setIsGenerating(true);
      setError(null);
      setProgress(0);

      try {
        const token = await getAccessToken();
        
        // Llamar al API para crear el clip
        setProgress(20);
        
        const response = await postCreateClipApi(
          token,
          recordingUrl,
          start,
          end,
          gameId,
        );

        setProgress(60);
        setClipResponse(response);

        // Descargar el clip (por ahora solo retorna la URL)
        setProgress(80);
        try {
          await downloadClip(response.clipUrl, response.clipId);
        } catch (downloadError) {
          // No fallar si downloadClip tiene problemas, ya que solo retorna la URL
        }
        
        setProgress(100);
        return response;
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          'Error al generar el clip. Por favor, intenta nuevamente.';
        setError(errorMessage);
        return null;
      } finally {
        setIsGenerating(false);
        // Resetear progreso después de un breve delay
        setTimeout(() => setProgress(0), 1000);
      }
    },
    [firebaseUser, getAccessToken],
  );

  return {
    generateClip,
    isGenerating,
    progress,
    error,
    clipResponse,
  };
};
