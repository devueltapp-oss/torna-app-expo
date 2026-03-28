import {useState, useEffect, useCallback} from 'react';

import {useAuth} from '@/contexts/authContext';
import {listB2FilesApi, B2FileItem} from '@/api/video/FilesApi';

export interface UseB2FilesReturn {
  files: B2FileItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useB2Files = (prefix = ''): UseB2FilesReturn => {
  const {getAccessToken} = useAuth();
  const [files, setFiles] = useState<B2FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const data = await listB2FilesApi(token, prefix);
      setFiles(data);
    } catch (err: any) {
      setError(err?.message || 'Error loading files');
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, prefix]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {files, isLoading, error, refetch: fetchFiles};
};
