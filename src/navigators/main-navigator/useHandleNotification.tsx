/* eslint-disable @typescript-eslint/no-explicit-any */
import {useNavigation} from '@react-navigation/native';
import {useEffect} from 'react';

import {useOneSignal} from '@/contexts/oneSignalContext';

export function useHandleNotification() {
  const navigation = useNavigation<any>();
  const {notification} = useOneSignal();

  useEffect(() => {
    switch (notification?.additionalData?.type) {
      case 'STREAMING_STARTED':
        navigation.navigate('screens.gameScreen', {
          gameId: notification.additionalData.gameId,
        });
        break;
      case 'GAME_FINISHED':
        if (notification.additionalData?.gameId) {
          navigation.navigate('screens.matchResultRegistration', {
            gameId: notification.additionalData.gameId,
          });
        }
        break;
    }
  }, [navigation, notification]);
}
