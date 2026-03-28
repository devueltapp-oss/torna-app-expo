/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import {SafeAreaView} from '@gluestack-ui/themed';
import {StyleSheet} from 'react-native';
import {SceneMap} from 'react-native-tab-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {NotificationList} from './components/NotificationList';

import {STRINGS} from '@/config/strings';
import notifications from '@/mocks/notifications.json';
import CustomHeader from '@/components/header/CustomHeader';
import StyledTabView from '@/components/styled-tab-view';

const FirstRoute = () => (
  <NotificationList emptyTitle="Sin notificaciones por leer" />
); //Enter the array variable to display the notifications
const SecondRoute = () => (
  <NotificationList emptyTitle="Sin notificaciones por leer" />
);
const ThirdRoute = () => (
  <NotificationList emptyTitle="No tienes ningún mensaje leído" />
);

const renderScene = SceneMap({
  first: FirstRoute,
  second: SecondRoute,
  third: ThirdRoute,
});

const NotificationScreen = () => {
  const insets = useSafeAreaInsets();

  const [routes] = React.useState([
    {key: 'first', title: STRINGS.all},
    {key: 'second', title: STRINGS.unread},
    {key: 'third', title: STRINGS.read},
  ]);

  const containerStyles = {
    flex: 1,
    // Paddings to handle safe area
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <SafeAreaView style={containerStyles}>
      <CustomHeader
        textCenter="Notificaciones"
        showNotificationIcon={false}
        showProfileIcon={false}
      />
      <StyledTabView
        renderScene={renderScene}
        routes={routes}
        numberOfTabs={3}
        indicatorWidth={50}
        indicatorStyle={styles.indicatorStyle}
        marginHorizontal={25}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  indicatorStyle: {
    height: 2,
  },
});

export default NotificationScreen;
