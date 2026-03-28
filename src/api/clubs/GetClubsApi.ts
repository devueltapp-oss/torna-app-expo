import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {GetClubsResponse} from '@/config/types';

export const getClubsApi = async (
  token: string,
  region?: string,
): Promise<GetClubsResponse[]> => {
  const APIURL = `${API_URL}/club`;
  try {
    const res = await axios.get<GetClubsResponse[]>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: region ? {region} : undefined,
    });
    return res.data;
  } catch (error: any) {
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};
