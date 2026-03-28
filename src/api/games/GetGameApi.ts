import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {GetGameResponse} from '@/config/types';
import {normalizeApiResponse} from '@/utils';

export const getGameByIdApi = async (
  token: string,
  gameId: string,
) => {
  const APIURL = `${API_URL}/game/${gameId}`;
  try {
    const res = await axios.get<GetGameResponse>(
      APIURL,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return normalizeApiResponse<GetGameResponse>(res.data);
  } catch (error: any) {
    console.log(JSON.stringify(error));
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};
