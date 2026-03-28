import {Avatar, HStack, Text} from '@gluestack-ui/themed';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {
  responsiveHeight,
  responsiveWidth,
  responsiveFontSize,
} from 'react-native-responsive-dimensions';
import {NavigationProp, useNavigation} from '@react-navigation/native';

import {colors} from '@/config/theme';
import {
  FollowingRequestButton,
  PressableOpacity,
} from '@/components/custom-buttons';
import {Screens} from '@/config/screens';
import AvatarImageDefault from '@/components/avatar-image-default';

interface ClubInfoProps {
  id: string;
  name: string;
  logoUrl: string;
  floor: string;
  location: string;
  isFollowing: boolean;
}

function ClubInfo({
  id,
  name,
  logoUrl,
  floor,
  location,
  isFollowing,
}: ClubInfoProps): React.JSX.Element {
  const navigation: NavigationProp<any> = useNavigation();
  const onPress = () => {
    navigation.navigate(Screens.Discover, {
      screen: 'screens.club',
      params: {
        clubId: id,
      },
    });
  };

  return (
    <PressableOpacity style={() => styles.container} onPress={onPress}>
      <View style={styles.group}>
        <Avatar borderWidth={1} borderColor={colors.primary} size="md">
          <AvatarImageDefault
            source={{uri: logoUrl}}
            alt={name}
            accessibilityLabel={name}
            fallbackText={name}
          />
        </Avatar>
        <View style={styles.nameContainer}>
          <Text style={styles.clubName} bold>
            {name}
          </Text>
          <HStack style={styles.hstack}>
            <View style={styles.courtBadge}>
              <Text style={styles.badgeText} bold>
                {floor}
              </Text>
            </View>
            <Text style={styles.clubLocation}>{location}</Text>
          </HStack>
        </View>
      </View>
      <FollowingRequestButton isFollowing={isFollowing} userId={id} />
    </PressableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginVertical: 14,
  },
  group: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flex: 1,
    paddingLeft: 8,
    paddingRight: 4,
  },
  clubName: {
    fontWeight: 'bold',
    fontSize: responsiveFontSize(1.9),
    color: colors.dark,
  },
  clubLocation: {
    flex: 1,
    fontSize: responsiveFontSize(1.9),
    color: colors.neutral500,
    fontWeight: 'normal',
  },
  button: {
    width: responsiveWidth(25),
    height: responsiveHeight(3.8),
    borderRadius: 4,
  },
  courtBadge: {
    backgroundColor: colors.secondary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  badgeText: {
    fontSize: responsiveFontSize(1.28),
    fontWeight: 'bold',
    color: colors.dark,
  },
  buttonTextFollow: {
    fontSize: responsiveFontSize(1.64),
    color: colors.white,
  },
  buttonTextFollowing: {
    fontSize: responsiveFontSize(1.4),
    color: colors.dark,
  },
  hstack: {
    marginTop: '1.6%',
  },
});

export default ClubInfo;
