import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import { API_URL } from '@/utils/constants';
import { normalizeApiResponse } from '@/utils';
import { ClipResponse } from './PostCreateClipApi';

export const getClipsByGameApi = async (
  token: string,
  gameId: string,
): Promise<ClipResponse[]> => {
  const APIURL = `${API_URL}/video/game/${gameId}/clips`;
  try {
    const res = await axios.get<ClipResponse[]>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const normalized = normalizeApiResponse<ClipResponse[]>(res.data);
    
    // Asegurar que siempre retornamos un array
    const clipsArray = Array.isArray(normalized) ? normalized : [];
    return clipsArray;
  } catch (error: any) {
    crashlytics().recordError(error);

    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Error al obtener los clips. Por favor, intenta nuevamente.';

    const customError = new Error(errorMessage);
    (customError as any).status = error?.response?.status || 500;
    throw customError;
  }
};
