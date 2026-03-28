import {createNativeStackNavigator} from '@react-navigation/native-stack';

import ClubListScreen from '@/screens/club-list-screen';
import DiscoverScreen from '@/screens/discover-screen';
import {colors} from '@/config/theme';
import ClubScreen from '@/screens/club-screen';

export type DiscoverNavigatorParamList = {
  'screens.discover': undefined;
  'screens.clubList': {location: string};
  'screens.club': {clubId: string};
};

const Stack = createNativeStackNavigator<DiscoverNavigatorParamList>();

function DiscoverNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}>
      <Stack.Screen name="screens.discover" component={DiscoverScreen} />
      <Stack.Screen name="screens.clubList" component={ClubListScreen} />
      <Stack.Screen name="screens.club" component={ClubScreen} />
    </Stack.Navigator>
  );
}

export default DiscoverNavigator;
