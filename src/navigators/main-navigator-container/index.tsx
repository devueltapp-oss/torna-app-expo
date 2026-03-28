import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';

import MainNavigator from '../main-navigator';

import AuthDialog from '@/components/auth-dialog/auth-dialog';
import {useOneSignal} from '@/contexts/oneSignalContext';

export function MainNavigatorContainer() {
  const {onReady} = useOneSignal();

  return (
    <NavigationContainer onReady={onReady}>
      <BottomSheetModalProvider>
        <MainNavigator />
        <AuthDialog />
      </BottomSheetModalProvider>
    </NavigationContainer>
  );
}
