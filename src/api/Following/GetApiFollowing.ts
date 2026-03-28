/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {FollowResponse} from '@/config/types';
import {normalizeApiResponse} from '@/utils';

export const GetApiFollowing = async (token: string, uid: string) => {
  const APIURL = `${API_URL}/follow/following/${uid}`;
  try {
    const res = await axios.get<FollowResponse>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return normalizeApiResponse<FollowResponse>(res.data);
  } catch (error: any) {
    console.log('error in GetApiFollowing', error);
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};
