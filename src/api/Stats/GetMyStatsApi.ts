import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {GetStatsMeResponse} from '@/config/types';
import {normalizeApiResponse} from '@/utils';

export const getMyStatsApi = async (
  token: string,
) => {

  const APIURL = `${API_URL}/stats/me`;
  try {
    const res = await axios.get<GetStatsMeResponse>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    // Normalizar respuesta y asegurar que sea un array
    const normalizedData = normalizeApiResponse<GetStatsMeResponse>(res.data);
    return normalizedData;
  } catch (error: any) {
    console.log('Error fetching user stats', JSON.stringify(error));
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};





