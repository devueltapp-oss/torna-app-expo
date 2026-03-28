/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {StatusBar, View} from 'react-native';

import LoginScreen from '@/screens/login-screen';
import SignUpScreen from '@/screens/signup-screen';
import TabNavigator from '@/navigators/tab-navigator';
import OnBoardingScreen from '@/screens/onboarding-screen';
import StreamManagerScreen from '@/screens/stream-manager-screen';
import ProfileScreen from '@/screens/profile-screen';
import EditProfileScreen from '@/screens/edit-profile-screen';
import GameScreen from '@/screens/game-screen';
import ShipmentSuccessful from '@/screens/signup-screen/components/ShipmentSuccessful';
import SignupPersonalData from '@/screens/signup-screen/components/SignupPersonalData';
import discoverScreen_followers_follow from '@/screens/discover-follow-followers-screen';
import ForgotPasswordScreen from '@/screens/forgot-password-screen';
import SendedEmailForgotPasswordScreen from '@/screens/forgot-password-screen/sended-email-screen';
import SplashScreen from '@/screens/splash-screen';
import {useOneSignal} from '@/contexts/oneSignalContext';
import {useHandleNotification} from '@/navigators/main-navigator/useHandleNotification';
import {UserProfileScreen} from '@/screens/user-profile-screen';
import DeactivateAccountScreen from '@/screens/deactivate-account-screen';
import MatchPreviewScreen from '@/screens/match-preview-screen';
import ClubScreen from '@/screens/club-screen';
import ReserveCourtScreen from '@/screens/club-reserve-screen';
import type {ClubCourt} from '@/screens/club-screen/components/CourtList';
import MatchResultRegistrationScreen from '@/screens/match-result-registration-screen';
import { HighlightEditorScreen } from '@/screens/highlight-editor-screen';
import MyHighlightsScreen from '@/screens/my-highlights-screen';
import VideoEditorScreen from '@/screens/video-editor-screen';

export type MainNavigatorParamList = {
  'screens.splash': undefined;
  'navigator.tabs': undefined;
  'screens.login': undefined;
  'screens.signup': undefined;
  'screens.shipmentSuccesfull': undefined;
  'screens.signupPersonalData': {
    email: string;
    password: string;
    username: string;
  };
  'screens.onboarding': undefined;
  'screens.streamManager': undefined;
  'screens.notifications': undefined;
  'screens.profile': undefined;
  'screens.editProfile': {
    profileData?: any; // Datos del perfil para evitar llamada API innecesaria
  };
  'screens.gameScreen': {
    gameId: string;
  };
  'screens.matchPreview': {
    match: {
      id: string;
      imageUrl: string;
      users: Array<{
        id: string;
        username: string;
        name: string;
        profilePicture: string;
      }>;
      clubName: string;
      floor: string;
      clubId?: string;
      badgeLabel?: string;
      badgeColor?: string;
      badgeSubLabel?: string;
      previewMode?: 'video' | 'versus';
      isLive: boolean;
      viewers?: number;
      startsIn?: string;
      startAt?: string;
    };
  };
  'screens.club': {
    clubId: string;
  };
  'screens.reserveCourt': {
    clubId: string;
    court: ClubCourt;
  };
  'screens.discover-follow-followers': {
    index?: number;
    userId?: number;
  };
  'screens.forgotPassword': undefined;
  'screens.sendedEmailForgotPassword': undefined;
  'screens.userProfile': {
    userId: string;
  };
  'screens.deactivateAccount': undefined;
  'screens.matchResultRegistration': {
    gameId: string,
  };
  'screens.highlightEditor': {
    gameId: string;
  };
  'screens.myHighlights': undefined;
  'screens.videoEditor': {
    b2FileName?: string;
  };
};

const Stack = createNativeStackNavigator<MainNavigatorParamList>();

function MainNavigator() {
  useHandleNotification();
  const {setLoadingNotificacion} = useOneSignal();

  useEffect(() => {
    setTimeout(() => {
      setLoadingNotificacion(false);
    }, 0);
  }, []);

  return (
    <>
      <View>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      </View>

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerShadowVisible: false,
          headerBackTitleVisible: false,
        }}>

        <Stack.Screen
          name="screens.splash"
          component={SplashScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens.login"
          component={LoginScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens.signup"
          component={SignUpScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens.discover-follow-followers"
          component={discoverScreen_followers_follow}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens.signupPersonalData"
          component={SignupPersonalData}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens.shipmentSuccesfull"
          component={ShipmentSuccessful}
        />

        <Stack.Screen name="navigator.tabs" component={TabNavigator} />

        <Stack.Screen name="screens.onboarding" component={OnBoardingScreen} />

        <Stack.Screen name="screens.profile" component={ProfileScreen} />

        <Stack.Screen
          name="screens.streamManager"
          component={StreamManagerScreen}
          options={{
            headerShown: true,
            headerTitle: 'Stream Manager',
          }}
        />

        <Stack.Screen
          name="screens.editProfile"
          component={EditProfileScreen}
        />

        <Stack.Screen
          name="screens.userProfile"
          component={UserProfileScreen}
        />

        <Stack.Screen
          name="screens.gameScreen"
          component={GameScreen}
          options={({route}) => ({
            headerShown: false,
            gameId: (route.params as any).gameId,
          })}
        />
        <Stack.Screen
          name="screens.matchPreview"
          component={MatchPreviewScreen}
        />
        <Stack.Screen name="screens.club" component={ClubScreen} />
        <Stack.Screen
          name="screens.reserveCourt"
          component={ReserveCourtScreen}
        />
        <Stack.Screen 
          name="screens.matchResultRegistration" 
          component={MatchResultRegistrationScreen} 
        />
        <Stack.Screen
          name="screens.highlightEditor"
          component={HighlightEditorScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens.myHighlights"
          component={MyHighlightsScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens.videoEditor"
          component={VideoEditorScreen}
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="screens.forgotPassword"
          component={ForgotPasswordScreen}
        />

        <Stack.Screen
          name="screens.sendedEmailForgotPassword"
          component={SendedEmailForgotPasswordScreen}
        />
        <Stack.Screen
          name="screens.deactivateAccount"
          component={DeactivateAccountScreen}
        />
      </Stack.Navigator>
    </>
  );
}

export default MainNavigator;
