import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {createAxiosInstance} from '@/api';
import {API_URL} from '@/utils/constants';
import {PlayerListResponse, UserResponse} from '@/config/types';
import {normalizeApiResponse} from '@/utils';

export const getPlayers = async (token: string) => {
  const url = `${API_URL}/user/players`;
  try {
    const res = await axios.get<PlayerListResponse[]>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  } catch (error: any) {
    console.log('GetPlayers error:', error);
    crashlytics().recordError(error);
    throw error;
  }
};

export const getUserById = async (id: string, token: string) => {
  try {
    const res = await createAxiosInstance(token).get<UserResponse>(
      `/user/${id}`,
    );

    return normalizeApiResponse<UserResponse>(res.data);
  } catch (error) {
    throw error;
  }
};

export const deactivateCurrentUser = async (token: string, reason: string) => {
  try {
    const api = createAxiosInstance(token);
    const response = await api.post('/user/me/deactivate', {reason});
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteCurrentUser = async (token: string) => {
  const api = createAxiosInstance(token);
  await api.delete('/user/me');
};
