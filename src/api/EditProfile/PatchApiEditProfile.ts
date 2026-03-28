/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';

interface ProfileData {
  name?: string;
  description?: string;
  address?: string;
  region?: string;
  profilePicture?: string;
  username?: string; // Username es requerido por el backend para validación
}

export const patchApiProfileData = async (
  token: string,
  id: string,
  profileData: ProfileData,
) => {
  const APIURL = `${API_URL}/user/${id}`;
  
  try {
    const res = await axios.patch<ProfileData>(APIURL, profileData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  } catch (error: any) {
    console.error('Error actualizando perfil:', error.response?.status, error.response?.data);
    crashlytics().recordError(error);
    throw error.response?.status || error;
  }
};
