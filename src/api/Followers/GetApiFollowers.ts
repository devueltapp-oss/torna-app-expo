import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {FollowerResponse} from '@/config/types';
import {normalizeApiResponse} from '@/utils';

export const GetApiFollowers = async (token: string, id: string) => {
  const APIURL = `${API_URL}/follow/followers/${id}`;
  try {
    const res = await axios.get<FollowerResponse>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return normalizeApiResponse<FollowerResponse>(res.data);
  } catch (error: any) {
    console.log('error in GetApiFollowers', error);
    crashlytics().recordError(error);
    throw error.response.status;
  }
};

export default GetApiFollowers;
