import {useState, useCallback} from 'react';
import {useAuth} from '@/contexts/authContext';
import {
  createHighlightApi,
  Highlight,
} from '@/api/highlights';

export interface UseCreateHighlightReturn {
  createHighlight: (
    gameId: string,
    recordingUrl: string,
    start: number,
    end: number,
    title?: string,
  ) => Promise<Highlight | null>;
  isCreating: boolean;
  error: string | null;
  highlight: Highlight | null;
}

export const useCreateHighlight = (): UseCreateHighlightReturn => {
  const {firebaseUser, getAccessToken} = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);

  const createHighlight = useCallback(
    async (
      gameId: string,
      recordingUrl: string,
      start: number,
      end: number,
      title?: string,
    ): Promise<Highlight | null> => {
      if (!firebaseUser) {
        setError('Debes estar autenticado para crear highlights');
        return null;
      }

      setIsCreating(true);
      setError(null);

      try {
        const token = await getAccessToken();
        const result = await createHighlightApi(token, {
          gameId,
          recordingUrl,
          start,
          end,
          title,
        });
        setHighlight(result);
        return result;
      } catch (err: any) {
        const errorMessage =
          err?.message || 'Error al crear el highlight. Intenta nuevamente.';
        setError(errorMessage);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [firebaseUser, getAccessToken],
  );

  return {createHighlight, isCreating, error, highlight};
};
