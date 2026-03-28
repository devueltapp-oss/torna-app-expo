import {
  TouchableOpacity,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  DimensionValue,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import {Avatar, Text} from '@gluestack-ui/themed';
import {SvgProps} from 'react-native-svg';

import AvatarImageDefault from '../avatar-image-default';

import {colors} from '@/config/theme';
import {SCREEN_HEIGHT} from '@/utils/constants';
import Torna from '@/assets/icons/torna-icon';
import ComeBack from '@/assets/icons/come-back-icon';
import Settings from '@/assets/icons/setting-icon';
import LogOutIcon from '@/assets/icons/log-out-icon';
import {logOut} from '@/firebase/auth';
import {useAuth} from '@/contexts/authContext';

type CustomHeaderProps = {
  textBack?: string;
  textCenter?: string;
  boolImageTorna?: boolean;
  showProfileIcon?: boolean;
  showNotificationIcon?: boolean;
  showEditProfileIcon?: boolean;
  style?: StyleProp<ViewStyle>;
  backIconStyle?: SvgProps;
  backButtonStyle?: StyleProp<ViewStyle>;
  showLogaout?: boolean;
  porcentageProfileMoveLeftText?: DimensionValue;
  customGoBack?: () => void;
};

const CustomHeader = ({
  textBack,
  textCenter,
  boolImageTorna,
  style,
  backIconStyle,
  backButtonStyle,
  showProfileIcon = true,
  showNotificationIcon = true,
  showEditProfileIcon = false,
  showLogaout = false,
  porcentageProfileMoveLeftText,
  customGoBack,
}: CustomHeaderProps) => {
  const navigation = useNavigation<any>();
  const {currentUser} = useAuth();
  const handleGoBack = () => {
    if (customGoBack) {
      customGoBack();
    } else {
      navigation.goBack();
    }
  };

  const handleGoToNotifications = () => {
    navigation.navigate('screens.notifications');
  };

  const handleGoToProfile = () => {
    navigation.navigate('screens.profile');
  };

  const handleEditProfileIcon = () => {
    navigation.navigate('screens.editProfile');
  };

  const logaOutSession = () => {
    logOut();
    navigation.navigate('screens.login');
  };

  let moveLeftTextCenterRegister = {};
  if (textCenter === 'Registro') {
    moveLeftTextCenterRegister = {
      marginLeft: '-25%',
    };
  }
  return (
    <View style={[styles.container, style]}>
      <View style={styles.buttonLogoContainer}>
        {boolImageTorna ? (
          <>
            <Torna style={styles.logoTorna} />
            <Text style={styles.textBack}>{textBack}</Text>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={handleGoBack}
              style={[styles.button, backButtonStyle]}>
              <ComeBack {...backIconStyle} />
              <Text style={styles.textBack}>{textBack}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={[styles.titleContainer, moveLeftTextCenterRegister]}>
        <Text
          style={[
            styles.textCenter,
            {marginLeft: porcentageProfileMoveLeftText},
          ]}
          bold>
          {textCenter}
        </Text>
      </View>

      <View style={styles.restContainer}>
        <View style={styles.profileAndNotificationsContainer}>
          {showLogaout && (
            <TouchableOpacity onPress={() => logaOutSession()}>
              <LogOutIcon />
            </TouchableOpacity>
          )}

          {showNotificationIcon && (
            <TouchableOpacity onPress={handleGoToNotifications}>
              <Icon
                name="notifications-outline"
                size={28}
                color={colors.neutral800}
              />
            </TouchableOpacity>
          )}

          {showProfileIcon && (
            <TouchableOpacity onPress={handleGoToProfile}>
              <Avatar size="sm">
                <AvatarImageDefault
                  alt="avatar-images"
                  source={
                    currentUser?.profilePicture &&
                    currentUser.profilePicture.trim() !== ''
                      ? {uri: currentUser.profilePicture}
                      : undefined
                  }
                  fallbackText={
                    currentUser?.name?.trim() ||
                    currentUser?.username?.trim() ||
                    'Usuario'
                  }
                  borderRadius={2}
                />
              </Avatar>
            </TouchableOpacity>
          )}

          {showEditProfileIcon && (
            <TouchableOpacity onPress={handleEditProfileIcon}>
              <Settings style={styles.iconSetting} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: SCREEN_HEIGHT * 0.06,
    backgroundColor: 'white',
    width: '100%',
    paddingHorizontal: 18,
  },
  button: {
    marginLeft: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 44, // Tamaño mínimo recomendado para área táctil en iOS
  },
  icon: {
    width: 24,
  },
  buttonLogoContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restContainer: {
    flexDirection: 'row',
  },
  profileAndNotificationsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  textBack: {
    fontSize: 18,
    color: colors.neutral600,
  },
  iconBack: {
    tintColor: colors.neutral500,
  },
  logoTorna: {
    width: 108,
    height: 32,
  },
  textCenter: {
    color: colors.neutral900,
    fontSize: 20,
  },
  iconSetting: {
    width: 24,
    height: 24,
  },
});

export default CustomHeader;
