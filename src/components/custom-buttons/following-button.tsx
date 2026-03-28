/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  GestureResponderEvent,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';

import {colors} from '../../config/theme';

import {DarkButton, LightButton} from './custom-buttons';

interface FollowingButtonProps {
  following: boolean;
  onPressFollowing?:
    | ((event: GestureResponderEvent) => void)
    | null
    | undefined;
  onPressFollow?: ((event: GestureResponderEvent) => void) | null | undefined;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
}

function FollowingButton({
  following,
  onPressFollowing,
  onPressFollow,
  style,
  loading = false,
}: FollowingButtonProps) {
  return following ? (
    <LightButton
      style={styles.lightButton}
      text="Siguiendo"
      onPress={onPressFollowing}
      textStyle={styles.buttonTextFollowing}
      loading={loading}
    />
  ) : (
    <DarkButton
      text="Seguir"
      onPress={onPressFollow}
      style={styles.darkButton}
      textStyle={styles.buttonTextFollow}
      loading={loading}
    />
  );
}

const styles = StyleSheet.create({
  lightButton: {
    width: responsiveWidth(30),
    height: responsiveHeight(4.1),
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    alignSelf: 'center',
  },
  darkButton: {
    width: responsiveWidth(30),
    height: responsiveHeight(4.1),
    borderRadius: 4,
    alignSelf: 'center',
  },
  buttonTextFollow: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonTextFollowing: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default FollowingButton;
