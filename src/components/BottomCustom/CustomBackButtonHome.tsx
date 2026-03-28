import {
  TouchableOpacity,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import {useNavigation} from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import {Avatar} from '@gluestack-ui/themed';
import {SvgProps} from 'react-native-svg';

import AvatarImageDefault from '../avatar-image-default';

import {colors} from '@/config/theme';
import auth from '@/mocks/profile.json';
import {SCREEN_HEIGHT} from '@/utils/constants';
import Torna from '@/assets/icons/torna-icon';
import ComeBack from '@/assets/icons/come-back-icon';
import Settings from '@/assets/icons/setting-icon';

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
};

const CustomBackButtonHome = ({
  textBack,
  textCenter,
  boolImageTorna,
  style,
  backIconStyle,
  backButtonStyle,
  showProfileIcon = true,
  showNotificationIcon = true,
  showEditProfileIcon = false,
}: CustomHeaderProps) => {
  const navigation = useNavigation<any>();

  const handleGoToNotifications = () => {
    navigation.navigate('screens.notifications');
  };

  const handleGoToProfile = () => {
    navigation.navigate('screens.profile');
  };

  const handleEditProfileIcon = () => {
    navigation.navigate('screens.editProfile');
  };

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
              onPress={() => navigation.goBack()}
              style={[styles.button, backButtonStyle]}>
              <ComeBack {...backIconStyle} />
              <Text style={styles.textBack}>{textBack}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.textCenter} bold>
          {textCenter}
        </Text>
      </View>

      <View style={styles.restContainer}>
        <View style={styles.profileAndNotificationsContainer}>
          {showNotificationIcon && (
            <TouchableOpacity onPress={handleGoToNotifications}>
              <Icon name="notifications-outline" size={28} color={'black'} />
            </TouchableOpacity>
          )}

          {showProfileIcon && (
            <TouchableOpacity onPress={handleGoToProfile}>
              <Avatar
                bgColor="red"
                size="sm"
                borderColor={colors.primary}
                borderWidth={1}>
                <AvatarImageDefault
                  alt="avatar-images"
                  source={{uri: auth.profile.avatarUrl}}
                  fallbackText={auth.profile.name}
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
    color: colors.neutral500,
  },
  iconBack: {
    tintColor: colors.neutral500,
  },
  logoTorna: {
    width: 108,
    height: 32,
  },
  textCenter: {
    color: 'black',
    fontWeight: '700',
    fontSize: 20,
  },
  iconSetting: {
    width: 24,
    height: 24,
  },
});

export default CustomBackButtonHome;
