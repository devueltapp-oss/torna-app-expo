/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {UserResponse} from '@/config/types';
import {normalizeApiResponse} from '@/utils';

export const getApiProfileData = async (token: string) => {
  const APIURL = `${API_URL}/user/me`;
  console.log('api:', APIURL);
  try {
    const res = await axios.get<UserResponse>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return normalizeApiResponse<UserResponse>(res.data);
  } catch (error: any) {
    console.log(JSON.stringify(error));
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};
