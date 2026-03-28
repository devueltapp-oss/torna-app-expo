import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';

export type IsFollowingEntry = {
  userId: string;
  isFollowing: boolean;
};

export const getIsFollowingApi = async (
  token: string,
  ids: string[],
): Promise<IsFollowingEntry[]> => {
  const APIURL = `${API_URL}/follow/is-following`;
  try {
    const res = await axios.get<IsFollowingEntry[]>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {ids},
    });
    return res.data;
  } catch (error: any) {
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};
