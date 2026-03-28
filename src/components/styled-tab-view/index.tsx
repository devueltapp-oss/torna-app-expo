import {
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  ViewStyle,
} from 'react-native';
import {TabView, TabBar, SceneRendererProps} from 'react-native-tab-view';
import {useState} from 'react';

import {measureTabBar} from '@/config/layout';
import {colors} from '@/config/theme';

const INDICATOR_WIDTH = 150;

type Route = {
  key: string;
  title: any;
};

type StyledTabViewProps = {
  routes: Route[];
  renderScene: (
    props: SceneRendererProps & {
      route: Route;
    },
  ) => React.ReactNode;
  numberOfTabs?: number;
  indicatorWidth?: number;
  indicatorStyle?: StyleProp<ViewStyle>;
  marginHorizontal?: number;
};

function StyledTabView({
  routes,
  renderScene,
  numberOfTabs = 2,
  indicatorWidth = INDICATOR_WIDTH,
  indicatorStyle,
  marginHorizontal = 0,
}: StyledTabViewProps) {
  const layout = useWindowDimensions();

  const [index, setIndex] = useState(0);

  const {indicatorOffset} = measureTabBar({
    numberOfTabs: numberOfTabs,
    indicatorWidth: indicatorWidth,
    windowWidth: layout.width - marginHorizontal * 2,
  });

  return (
    <TabView
      navigationState={{index, routes}}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{width: layout.width}}
      sceneContainerStyle={styles.separator}
      renderTabBar={props => (
        <TabBar
          {...props}
          indicatorStyle={[
            styles.indicatorStyle,
            {left: indicatorOffset},
            {width: indicatorWidth},
            indicatorStyle,
          ]}
          style={[styles.tabBar, {marginHorizontal}]}
          inactiveColor={colors.neutral500}
          activeColor={colors.primary}
          labelStyle={styles.tabBarLabel}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  separator: {
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  indicatorStyle: {
    backgroundColor: colors.primary,
    height: 4,
    borderRadius: 2,
  },
  tabBar: {
    backgroundColor: 'white',
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

export default StyledTabView;
