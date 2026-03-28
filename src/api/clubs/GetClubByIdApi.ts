import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {GetClubResponse} from '@/config/types';

export const getClubByIdApi = async (
  token: string,
  clubId: string,
): Promise<GetClubResponse> => {
  const APIURL = `${API_URL}/club/${clubId}`;
  try {
    const res = await axios.get<GetClubResponse>(APIURL, {
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
