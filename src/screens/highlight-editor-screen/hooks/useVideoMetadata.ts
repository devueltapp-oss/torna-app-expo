import { useState, useEffect } from 'react';
import { getGameByIdApi } from '@/api/games/GetGameApi';
import { GetGameResponse } from '@/config/types';
import { useAuth } from '@/contexts/authContext';

export interface UseVideoMetadataReturn {
  recordingUrl: string | null;
  durationSeconds: number | null;
  game: GetGameResponse | null;
  isLoading: boolean;
  error: string | null;
}

export const useVideoMetadata = (
  gameId: string | undefined,
): UseVideoMetadataReturn => {
  const { firebaseUser, getAccessToken } = useAuth();
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [game, setGame] = useState<GetGameResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGame = async () => {
      if (!gameId || !firebaseUser) {
        setError('ID de partido o usuario no válido');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = await getAccessToken();
        const gameData = await getGameByIdApi(token, gameId);

        setGame(gameData);
        setRecordingUrl(gameData.recordingUrl || null);
        setDurationSeconds(
          gameData.durationSeconds !== null && gameData.durationSeconds !== undefined
            ? Number(gameData.durationSeconds)
            : null,
        );
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          'Error al cargar los datos del partido';
        setError(errorMessage);
        console.error('Error loading game:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGame();
  }, [gameId, firebaseUser, getAccessToken]);

  return {
    recordingUrl,
    durationSeconds,
    game,
    isLoading,
    error,
  };
};
