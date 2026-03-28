import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {GetUpcomingGamesResponse} from '@/config/types';
import {normalizeApiResponse} from '@/utils';

export const getUpcomingGamesApi = async (token: string, userId: string, untilDate?: Date) => {
  if (!untilDate) {
    untilDate = new Date();
    untilDate.setMonth(untilDate.getMonth() + 2);
  }
  const APIURL = `${API_URL}/game/${userId}/upcoming?scheduledStartAt=${untilDate.toISOString()}`;
  try {
    const res = await axios.get<GetUpcomingGamesResponse>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return normalizeApiResponse<GetUpcomingGamesResponse>(res.data);
  } catch (error: any) {
    console.log(JSON.stringify(error));
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};
