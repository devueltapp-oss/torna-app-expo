import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';

export type GameResultStatusResponse = {
  hasRegistered: boolean;
  isWinner: boolean | null;
};

export const getGameResultStatusApi = async (
  token: string,
  gameId: string,
): Promise<GameResultStatusResponse> => {
  const APIURL = `${API_URL}/game/${gameId}/result-status`;
  try {
    const res = await axios.get<GameResultStatusResponse>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  } catch (error: any) {
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};
