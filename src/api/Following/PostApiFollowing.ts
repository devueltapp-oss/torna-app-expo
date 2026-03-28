/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';

const PostApiFollowing = async (token: string, id: string) => {
  try {
    const APIURL = `${API_URL}/follow`;
    await axios.post(
      APIURL,
      {userId: id},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch (error: any) {
    console.log('error en postApiFollowing: ', error);
    crashlytics().recordError(error);
    throw error.response.status;
  }
};

export default PostApiFollowing;
