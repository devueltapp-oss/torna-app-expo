import {useState, useEffect} from 'react';

import {useAuth} from '@/contexts/authContext';
import {getB2FileInfoApi, getB2StreamUrlApi} from '@/api/video/FilesApi';

export interface UseVideoInfoReturn {
  streamUrl: string | null;
  durationSeconds: number | null;
  isLoading: boolean;
  error: string | null;
}

export const useVideoInfo = (fileKey: string | null): UseVideoInfoReturn => {
  const {getAccessToken} = useAuth();
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileKey) {
      setStreamUrl(null);
      setDurationSeconds(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getAccessToken();
        const [info, stream] = await Promise.all([
          getB2FileInfoApi(token, fileKey),
          getB2StreamUrlApi(token, fileKey),
        ]);
        if (!cancelled) {
          setDurationSeconds(info.duration);
          setStreamUrl(stream.url);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Error loading video info');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fileKey, getAccessToken]);

  return {streamUrl, durationSeconds, isLoading, error};
};
