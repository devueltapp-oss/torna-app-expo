import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';

export type ThumbnailResponse = {
  url: string;
};

export const getThumbnailApi = async (
  token: string,
  key: string,
): Promise<ThumbnailResponse> => {
  const APIURL = `${API_URL}/files/thumbnail`;
  try {
    const res = await axios.get<ThumbnailResponse>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {key},
    });
    return res.data;
  } catch (error: any) {
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};
