/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';
import {API_URL} from '@/utils/constants';

import {GetGamesLiveResponse, GetGamesLiveResponsePaginated} from '@/config/types';
import {normalizeApiResponse} from '@/utils';

export const GetLivesApi = async (token: string) => {
  const APIURL = `${API_URL}/game/live`;
  try {
    const res = await axios.get<GetGamesLiveResponse[]>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const normalizedData = normalizeApiResponse<GetGamesLiveResponsePaginated>(res.data);

    return Array.isArray(normalizedData.data) ? normalizedData.data : [];
  } catch (error: any) {
    crashlytics().recordError(error);
    console.log('se produjo un error en GetLivesApi', error);
    console.log(error);
    throw error.response.status;
  }
};
