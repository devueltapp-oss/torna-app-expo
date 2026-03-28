import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import { API_URL } from '@/utils/constants';

export const deleteClipApi = async (
  token: string,
  clipId: string,
): Promise<void> => {
  const APIURL = `${API_URL}/video/clip/${clipId}`;
  try {
    await axios.delete(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error: any) {
    crashlytics().recordError(error);

    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Error al eliminar el clip. Por favor, intenta nuevamente.';

    const customError = new Error(errorMessage);
    (customError as any).status = error?.response?.status || 500;
    throw customError;
  }
};
