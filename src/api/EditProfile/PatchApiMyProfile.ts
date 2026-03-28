import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';

interface MyProfileData {
  name?: string;
  description?: string;
  address?: string;
  region?: string;
  profilePicture?: string;
  username?: string;
}

export const patchApiMyProfile = async (
  token: string,
  profileData: MyProfileData,
): Promise<MyProfileData> => {
  const APIURL = `${API_URL}/user/me`;
  try {
    const res = await axios.patch<MyProfileData>(APIURL, profileData, {
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
