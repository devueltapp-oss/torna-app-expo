import React, {useCallback} from 'react';
import {SafeAreaView} from '@gluestack-ui/themed';
import {StyleSheet, useWindowDimensions} from 'react-native';
import {TabView, SceneMap, TabBar} from 'react-native-tab-view';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {PlayerListScreen} from './PlayerListScreen';
import {LocationListScreen} from './LocationListScreen';

import {STRINGS} from '@/config/strings';
import {colors} from '@/config/theme';
import {measureTabBar} from '@/config/layout';
import CustomHeader from '@/components/header/CustomHeader';
import {DiscoverNavigatorParamList} from '@/navigators/discover-navigator';

const INDICATOR_WIDTH = 150;

const DiscoverScreen = ({
  navigation,
  route,
}: NativeStackScreenProps<DiscoverNavigatorParamList, 'screens.discover'>) => {
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();

  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    {key: 'first', title: STRINGS.clubs},
    {key: 'second', title: STRINGS.players},
  ]);

  const FirstRoute = useCallback(
    () => <LocationListScreen navigation={navigation} route={route} />,
    [navigation, route],
  );

  const renderScene = SceneMap({
    first: FirstRoute,
    second: PlayerListScreen,
  });

  const {indicatorOffset} = measureTabBar({
    numberOfTabs: 2,
    indicatorWidth: INDICATOR_WIDTH,
    windowWidth: layout.width,
  });

  const containerStyles = {
    flex: 1,
    // Paddings to handle safe area
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <SafeAreaView style={containerStyles}>
      <CustomHeader boolImageTorna />

      <TabView
        navigationState={{index, routes}}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{width: layout.width}}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={[styles.indicatorStyle, {left: indicatorOffset}]}
            style={styles.tabBar}
            inactiveColor={colors.neutral500}
            activeColor={colors.primary}
            labelStyle={styles.tabBarLabel}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  indicatorStyle: {
    backgroundColor: colors.primary,
    width: INDICATOR_WIDTH,
    height: 4,
    borderRadius: 2,
  },
  tabBar: {
    backgroundColor: 'white',
    borderBottomWidth: 2,
    borderBottomColor: colors.separator,
    elevation: 0,
    height: 40,
  },
  tabBarLabel: {
    textTransform: 'none',
    fontSize: 16,
    fontWeight: 'bold',
    margin: 0,
    flex: 1,
  },
});

export default DiscoverScreen;
