import React, {useEffect} from 'react';
import {SafeAreaView} from '@gluestack-ui/themed';
import {useWindowDimensions} from 'react-native';
import {TabView, SceneMap, TabBar} from 'react-native-tab-view';
import {RouteProp, useRoute} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {FollowersList} from './components/FollowersList';
import {FollowList} from './components/FollowList';

import {colors} from '@/config/theme';
import {measureTabBar} from '@/config/layout';
import CustomHeader from '@/components/header/CustomHeader';
import {useAuth} from '@/contexts/authContext';

// Defines the type of display parameters
type RootStackParamList = {
  'screens.discover-follow-followers': {index: number; userId: string};
};

const FirstRoute = () => {
  const {firebaseUser} = useAuth();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'screens.discover-follow-followers'>
    >();
  const emptyMessage =
    firebaseUser.uid !== route.params.userId
      ? {emptyMessage: 'Este usuario aún no sigue a alguien'}
      : {};
  return <FollowList userId={route.params.userId} {...emptyMessage} />;
};
const SecondRoute = () => {
  const {firebaseUser} = useAuth();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'screens.discover-follow-followers'>
    >();
  const emptyMessage =
    firebaseUser.uid !== route.params.userId
      ? {emptyMessage: 'Este usuario no tiene seguidores'}
      : {};
  return <FollowersList userId={route.params.userId} {...emptyMessage} />;
};

function DiscoverScreenFollowersFollow() {
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  // Get the index parameter of the navigation
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'screens.discover-follow-followers'>
    >();

  const renderScene = SceneMap({
    first: FirstRoute,
    second: SecondRoute,
  });
  const [index, setIndex] = React.useState<number>(route.params?.index || 0);

  useEffect(() => {
    // Sets the active tab according to the received parameter
    if (route.params?.index !== undefined) {
      setIndex(route.params.index);
    }
  }, [route.params?.index]);

  const [routes] = React.useState([
    {key: 'first', title: 'Siguiendo'},
    {key: 'second', title: 'Seguidores'},
  ]);

  const {indicatorOffset} = measureTabBar({
    numberOfTabs: 2,
    indicatorWidth: 160,
    windowWidth: layout.width,
  });

  const containerStyles = {
    flex: 1,
    backgroundColor: colors.background,
    // Paddings to handle safe area
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <SafeAreaView style={containerStyles}>
      <CustomHeader
        boolImageTorna={false}
        textCenter={'Perfil'}
        porcentageProfileMoveLeftText="-8%"
        showNotificationIcon={false}
        showProfileIcon={false}
      />
      <TabView
        navigationState={{index, routes}}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{width: layout.width}}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{
              backgroundColor: colors.primary,
              width: '40%',
              left: indicatorOffset,
            }}
            style={{
              backgroundColor: 'white',
              borderBottomWidth: 1,
              borderBottomColor: colors.muted,
            }}
            inactiveColor={colors.primary}
            activeColor={colors.primary}
            labelStyle={{
              fontFamily: 'Helvetica',
              fontSize: 18,
              fontWeight: 'bold',
              color: '#2D4C75',
              textTransform: 'none',
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}

export default DiscoverScreenFollowersFollow;
