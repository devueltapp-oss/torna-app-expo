import { useState, useEffect } from 'react';
import { getClipsByGameApi } from '@/api/video/GetClipsByGameApi';
import { ClipResponse } from '@/api/video/PostCreateClipApi';
import { useAuth } from '@/contexts/authContext';

export interface UseGameClipsReturn {
  clips: ClipResponse[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useGameClips = (
  gameId: string | undefined,
): UseGameClipsReturn => {
  const { firebaseUser, getAccessToken } = useAuth();
  const [clips, setClips] = useState<ClipResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClips = async () => {
    if (!gameId || !firebaseUser) {
      setError('ID de partido o usuario no válido');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const clipsData = await getClipsByGameApi(token, gameId);
      setClips(clipsData);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Error al cargar los clips';
      setError(errorMessage);
      setClips([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, firebaseUser]);

  return {
    clips,
    isLoading,
    error,
    refetch: fetchClips,
  };
};
