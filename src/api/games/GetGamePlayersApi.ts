import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {PlayersResponse} from '@/config/types';

export const getGamePlayersApi = async (
  token: string,
  gameId: string,
): Promise<PlayersResponse[]> => {
  const APIURL = `${API_URL}/game/${gameId}/players`;
  try {
    const res = await axios.get<PlayersResponse[]>(APIURL, {
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
