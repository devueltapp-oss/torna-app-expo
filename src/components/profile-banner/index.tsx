import {useCallback, useState} from 'react';
import {Avatar, VStack, HStack} from '@gluestack-ui/themed';
import {StyleSheet, View} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import {useFocusEffect, useNavigation} from '@react-navigation/native';

import {
  FollowingRequestButton,
  LightButton,
  PressableOpacityScaled,
} from '../custom-buttons';
import AvatarImageDefault from '../avatar-image-default';

import {STRINGS} from '@/config/strings';
import {LocationIcon} from '@/assets/icons';
import {colors} from '@/config/theme';
import {useAuth} from '@/contexts/authContext';
import {getStateLabel} from '@/utils/venezuelaStates';

type ProfileBanerProps = {
  avatarUrl: string;
  username: string;
  name: string;
  bio: string;
  location: string;
  isFollowing: boolean;
  followings: number;
  followers: number;
  userId: string;
  optionEditProfileBool?: boolean;
  navigationFollows?: boolean;
  showFollowButton?: boolean;
  profileData?: any; // Datos completos del perfil para pasar a edición
  onInviteFriend?: () => void;
};

function ProfileBanner({
  avatarUrl,
  username,
  name,
  bio,
  location,
  isFollowing,
  followings,
  followers,
  userId,
  optionEditProfileBool = false,
  navigationFollows = true,
  showFollowButton = true,
  profileData,
  onInviteFriend,
}: ProfileBanerProps) {
  const [currentFollowers, setCurrentFollowers] = useState(followers);
  const navigation = useNavigation<any>();
  const {firebaseUser} = useAuth();

  useFocusEffect(
    useCallback(() => {
      setCurrentFollowers(followers);
    }, [followers]),
  );

  const handleGoToEditProfile = () => {
    navigation.navigate('screens.editProfile' as never, {
      profileData: profileData,
    });
  };

  const handleGoToDeactivateAccount = () => {
    navigation.navigate('screens.deactivateAccount' as never);
  };

  const handleGoToFollow = () => {
    if (navigationFollows) {
      navigation.navigate('screens.discover-follow-followers', {
        index: 0,
        userId,
      });
    }
  };

  const handleGoToFollowers = () => {
    if (navigationFollows) {
      navigation.navigate('screens.discover-follow-followers', {
        index: 1,
        userId,
      });
    }
  };

  const handleFollow = (following: boolean) => {
    if (following) {
      setCurrentFollowers(currentFollowers + 1);
    } else {
      setCurrentFollowers(currentFollowers - 1);
    }
  };

  return (
    <View style={styles.profileHeader}>
      <View style={styles.info}>
        <Avatar size="lg">
          <AvatarImageDefault
            source={{uri: avatarUrl}}
            alt={username}
            fallbackText={name}
            borderRadius={2}
          />
        </Avatar>
        <View style={styles.nameContainer}>
          <Text style={styles.name} bold>
            {name}
          </Text>
          <Text style={[styles.username, styles.textColorNeutral]}>
            {username}
          </Text>
        </View>
        <View style={styles.actionsContainer}>
          {optionEditProfileBool ? (
            <LightButton
              text="Editar perfil"
              onPress={handleGoToEditProfile}
              style={styles.buttonToEditable}
            />
          ) : (
            showFollowButton &&
            firebaseUser.uid !== userId && (
              <FollowingRequestButton
                userId={userId}
                isFollowing={isFollowing}
                style={styles.button}
                callback={handleFollow}
              />
            )
          )}
        </View>
      </View>
      <VStack space="md" style={styles.infoSection}>
        {bio && bio.trim() ? (
          <Text style={[styles.bio]}>{bio}</Text>
        ) : (
          optionEditProfileBool && (
            <Text style={[styles.bio, styles.placeholderText]}>
              Agrega una descripción a tu perfil
            </Text>
          )
        )}
        {location && location.trim() ? (
          <View style={styles.locationContainer}>
            <LocationIcon />
            <Text style={[styles.location, styles.textColorNeutral]}>
              {getStateLabel(location)}
            </Text>
          </View>
        ) : (
          optionEditProfileBool && (
            <View style={styles.locationContainer}>
              <LocationIcon />
              <Text style={[styles.location, styles.placeholderText]}>
                Agrega tu ubicación
              </Text>
            </View>
          )
        )}
        {/* Botón "Reta a tu amigo" oculto temporalmente */}
        {/* {onInviteFriend && optionEditProfileBool && (
          <View style={styles.inviteButtonContainer}>
            <PressableOpacityScaled
              onPress={onInviteFriend}
              pressedScale={0.93}
              style={() => styles.inviteButton}>
              <Text style={styles.inviteButtonText} bold>
                Reta a tu amigo
              </Text>
            </PressableOpacityScaled>
          </View>
        )} */}
        <View style={styles.row}>
          <HStack space="md">
            <PressableOpacityScaled
              onPress={() => handleGoToFollow()}
              pressedScale={0.925}>
              <Text style={styles.textColorNeutral}>
                <Text style={styles.followText} bold>
                  {followings}
                </Text>{' '}
                {STRINGS.following}
              </Text>
            </PressableOpacityScaled>
            <PressableOpacityScaled
              onPress={() => handleGoToFollowers()}
              pressedScale={0.925}>
              <Text style={styles.textColorNeutral}>
                <Text style={styles.followText} bold>
                  {currentFollowers}
                </Text>{' '}
                {STRINGS.followers}
              </Text>
            </PressableOpacityScaled>
          </HStack>
        </View>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  nameContainer: {
    flex: 2,
    paddingLeft: 8,
    paddingRight: 4,
  },
  actionsContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  button: {
    marginVertical: 10,
    marginHorizontal: 5,
  },
  profileHeader: {
    backgroundColor: colors.neutral100,
    padding: 20,
    paddingBottom: 24,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 20,
    color: colors.dark,
    lineHeight: 24,
  },
  username: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 20,
  },
  infoSection: {
    marginTop: 12,
  },
  bio: {
    color: colors.dark,
    fontSize: 15,
    lineHeight: 20,
    minHeight: 20,
  },
  placeholderText: {
    color: colors.neutral400,
    fontStyle: 'italic',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 20,
  },
  location: {
    paddingLeft: 8,
    fontSize: 14,
    lineHeight: 18,
  },
  followText: {
    fontWeight: 'bold',
    color: colors.dark,
  },
  textColorNeutral: {
    color: colors.neutral500,
  },
  buttonToEditable: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    alignSelf: 'flex-end',
  },
  inviteButtonContainer: {
    marginTop: 12,
    marginBottom: 4,
  },
  inviteButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    width: '100%',
  },
  inviteButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ProfileBanner;
