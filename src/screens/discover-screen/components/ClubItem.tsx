import {View, Image, Text} from '@gluestack-ui/themed';
import {GestureResponderEvent, StyleSheet} from 'react-native';

import {colors} from '@/config/theme';
import {LocationIcon} from '@/assets/icons';
import {
  FollowingRequestButton,
  PressableOpacityScaled,
} from '@/components/custom-buttons';
import AvatarImageDefault from '@/components/avatar-image-default';

export interface ClubItemProps {
  name: string;
  location: string;
  imageUrl: string;
  logoUrl: string;
  following: boolean;
  id: string;
  onPress?: ((event: GestureResponderEvent) => void) | null | undefined;
  onFollowChange?: (clubId: string, isFollowing: boolean) => void;
}

export const ClubItem = ({
  name,
  location,
  imageUrl,
  logoUrl,
  following,
  id,
  onPress,
  onFollowChange,
}: ClubItemProps) => {
  const handleFollowChange = (isFollowing: boolean) => {
    if (onFollowChange) {
      onFollowChange(id, isFollowing);
    }
  };

  return (
    <PressableOpacityScaled pressedScale={0.98} onPress={onPress}>
      <View style={styles.item}>
        <View>
          <Image
            style={styles.clubImage}
            source={{uri: imageUrl}}
            alt={`Imagen del club ${name}`}
          />
          <AvatarImageDefault
            style={styles.logo}
            source={{uri: logoUrl}}
            alt={`Logo del club ${name}`}
          />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.textContainer}>
            <Text style={styles.name} bold>
              {name}
            </Text>
            <View style={styles.locationContainer}>
              <LocationIcon fill={colors.primary} />
              <Text style={styles.location}>{location}</Text>
            </View>
          </View>
          <FollowingRequestButton
            isFollowing={following}
            userId={id}
            callback={handleFollowChange}
          />
        </View>
      </View>
    </PressableOpacityScaled>
  );
};

const styles = StyleSheet.create({
  item: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  clubImage: {
    width: '100%',
    height: 150,
    marginRight: 10,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.neutral100,
  },
  textContainer: {
    flex: 1,
  },
  logo: {
    width: 75,
    height: 75,
    borderRadius: 75 / 2,
    marginBottom: 5,
    position: 'absolute',
    top: 10,
    left: 10,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.dark,
  },
  locationContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  location: {
    color: colors.neutral500,
  },
  followingButton: {
    height: 35,
  },
});
