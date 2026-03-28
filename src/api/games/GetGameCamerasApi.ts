import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {normalizeApiResponse} from '@/utils';

export interface GameCamera {
  id: string;
  identifier: string;
  streamingUrl: string | null;
  description: string | null;
  isPrimary: boolean;
  cameraNumber: number;
}

export const getGameCamerasApi = async (
  token: string,
  gameId: string,
): Promise<GameCamera[]> => {
  try {
    const res = await axios.get<GameCamera[]>(
      `${API_URL}/game/${gameId}/cameras`,
      {
        headers: {Authorization: `Bearer ${token}`},
      },
    );
    const data = normalizeApiResponse<GameCamera[]>(res.data);
    return Array.isArray(data) ? data : [];
  } catch (error: any) {
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};
