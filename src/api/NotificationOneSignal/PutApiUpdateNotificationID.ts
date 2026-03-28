/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';
import {API_URL} from '@/utils/constants';

const PutApiUpdateNotificationID = async (
  token: string,
  notificationID: string,
) => {
  const APIURL = `${API_URL}/user/update-notification-id`;
  
  console.log('📤 OneSignal API: Enviando notification ID al backend', {
    url: APIURL,
    notificationID: notificationID ? notificationID.substring(0, 20) + '...' : 'null',
    hasToken: !!token,
  });

  try {
    const res = await axios.put(
      APIURL,
      {notificationID: notificationID},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    console.log('✅ OneSignal API: Notification ID actualizado exitosamente', {
      status: res.status,
      data: res.data,
    });

    return res;
  } catch (error: any) {
    console.error('❌ OneSignal API: Error al actualizar notification ID', {
      status: error?.response?.status,
      message: error?.response?.data?.message || error?.message,
      data: error?.response?.data,
    });
    crashlytics().recordError(error);
    throw error;
  }
};

export default PutApiUpdateNotificationID;
