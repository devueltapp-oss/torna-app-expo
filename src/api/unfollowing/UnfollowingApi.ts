/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';

const PostApiUnfollowers = async (token: string, uid: string) => {
  try {
    const APIURL = `${API_URL}/follow/unfollow`;
    await axios.post(
      APIURL,
      {userId: uid},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  } catch (error: any) {
    console.log('Error en PostApiUnFollowers', error);
    crashlytics().recordError(error);
    throw error.response.status;
  }
};

export default PostApiUnfollowers;
