/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import '@/bootstrap';

import React from 'react';
import {GluestackUIProvider} from '@gluestack-ui/themed';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {config} from './config/gluestack-ui.config';
import {AuthProvider} from './src/contexts/authContext';

import AuthDialogProvider from '@/components/auth-dialog/auth-dialog-provider';
import {SplashScreenProvider} from '@/contexts/splashScreenContext';
import {OneSignalProvider} from '@/contexts/oneSignalContext';
import {ProfileRefreshProvider} from '@/contexts/profileRefreshContext';
import {MainNavigatorContainer} from '@/navigators/main-navigator-container';

function App(): React.JSX.Element | null {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <GluestackUIProvider config={config}>
          <AuthProvider>
            <ProfileRefreshProvider>
              <AuthDialogProvider>
                <OneSignalProvider>
                  <SplashScreenProvider>
                    <MainNavigatorContainer />
                  </SplashScreenProvider>
                </OneSignalProvider>
              </AuthDialogProvider>
            </ProfileRefreshProvider>
          </AuthProvider>
        </GluestackUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
