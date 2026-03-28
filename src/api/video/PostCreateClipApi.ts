import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import { API_URL } from '@/utils/constants';
import { normalizeApiResponse } from '@/utils';

export interface ClipResponse {
  clipId: string;
  clipUrl: string;
  thumbnailUrl?: string | null;
  recordingUrl: string;
  start: number;
  end: number;
  duration: number;
}

export interface CreateClipRequest {
  recordingUrl: string;
  start: number;
  end: number;
  gameId: string;
}

export const postCreateClipApi = async (
  token: string,
  recordingUrl: string,
  start: number,
  end: number,
  gameId: string,
): Promise<ClipResponse> => {
  const APIURL = `${API_URL}/video/clip`;
  try {
    // Asegurar que start y end sean enteros
    const startInt = Math.floor(start);
    const endInt = Math.floor(end);
    
    const res = await axios.post<ClipResponse>(
      APIURL,
      {
        recordingUrl,
        start: startInt,
        end: endInt,
        gameId,
      } as CreateClipRequest,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const normalized = normalizeApiResponse<ClipResponse>(res.data);
    return normalized;
  } catch (error: any) {
    crashlytics().recordError(error);

    // Extraer mensaje de error del backend si está disponible
    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Error al crear el clip. Por favor, intenta nuevamente.';

    // Crear un error con mensaje descriptivo
    const customError = new Error(errorMessage);
    (customError as any).status = error?.response?.status || 500;
    throw customError;
  }
};
