import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Dimensions} from 'react-native';

import DiscoverNavigator from '../discover-navigator';

import {Screens} from '@/config/screens';
import HomeScreen from '@/screens/home-screen';
import {colors} from '@/config/theme';
import ProfileScreen from '@/screens/profile-screen';
import {STRINGS} from '@/config/strings';
import {
  TabBarHouseIcon,
  TabBarProfileIcon,
  TabBarWorldIcon,
} from '@/components/tab-bar-icon';
import NotificationScreen from '@/screens/notifications-screen';

const height = Dimensions.get('window').height;

const Tab = createBottomTabNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.tint,
        tabBarStyle: {
          backgroundColor: colors.primary,
          height: height * 0.08 + insets.bottom,
        },
        tabBarItemStyle: {
          marginVertical: 4,
        },
        tabBarIconStyle: {
          flex: 2,
          marginBottom: -8,
        },
        tabBarLabelStyle: {
          flex: 1,
          fontSize: 12,
        },
      }}
      sceneContainerStyle={{
        backgroundColor: colors.background,
      }}>
      <Tab.Screen
        name={Screens.Home}
        component={HomeScreen}
        options={{
          tabBarLabel: STRINGS.home,
          tabBarIcon: TabBarHouseIcon,
        }}
      />
      {/* <Tab.Screen
        name={Screens.Record}
        component={RecordedMatchScreen}
        options={{
          tabBarLabel: STRINGS.record,
          tabBarIcon: ({color, size}) => (
            <Fontisto name="world-o" color={color} size={size} />
          ),
        }}
      /> */}
      <Tab.Screen
        name={Screens.Discover}
        component={DiscoverNavigator}
        options={{
          tabBarLabel: STRINGS.discover,
          tabBarIcon: TabBarWorldIcon,
        }}
      />
      <Tab.Screen
        name={Screens.Profile}
        component={ProfileScreen}
        options={{
          headerShown: false,
          tabBarLabel: STRINGS.profile,
          tabBarIcon: TabBarProfileIcon,
        }}
      />

      <Tab.Screen
        name="screens.notifications"
        component={NotificationScreen}
        options={{
          headerShown: false,
          tabBarItemStyle: {
            display: 'none',
          },
        }}
      />
    </Tab.Navigator>
  );
}

export default TabNavigator;
