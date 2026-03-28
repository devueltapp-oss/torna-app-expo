/* eslint-disable @typescript-eslint/no-explicit-any */
import {Avatar, FlatList, VStack, Text} from '@gluestack-ui/themed';
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {responsiveFontSize} from 'react-native-responsive-dimensions';
import {NavigationProp, useNavigation} from '@react-navigation/native';

import {User} from '@/config/types';
import {colors} from '@/config/theme';
import {PressableOpacityScaled} from '@/components/custom-buttons';
import {MainNavigatorParamList} from '@/navigators/main-navigator';
import AvatarImageDefault from '@/components/avatar-image-default';
import {useAuth} from '@/contexts/authContext';
import FullViewMessage from '@/components/full-view-message';

type PlayerListProps = {
  players: User[];
  /**
   * Si es true, el usuario actual se mostrará en el listado pero sin interacción.
   */
  keepCurrentUserVisible?: boolean;
};

function PlayerList({
  players,
  keepCurrentUserVisible = true,
}: PlayerListProps): React.JSX.Element {
  const navigation: NavigationProp<MainNavigatorParamList> = useNavigation();
  const {firebaseUser} = useAuth();
  const currentUserId = firebaseUser?.uid;

  const normalizedPlayers = useMemo(() => {
    if (!currentUserId) {
      return players;
    }

    return players
      .map(player => {
        const isCurrentUser = player.id === currentUserId;
        if (!isCurrentUser) {
          return player;
        }

        if (!keepCurrentUserVisible) {
          return null;
        }

        return {
          ...player,
          disabled: true,
          isCurrentUser: true,
        };
      })
      .filter(Boolean) as Array<
      User & {disabled?: boolean; isCurrentUser?: boolean}
    >;
  }, [currentUserId, keepCurrentUserVisible, players]);

  const onAvatarPress = (userId: string, disabled?: boolean) => {
    if (disabled) {
      return;
    }
    navigation.navigate('screens.userProfile', {
      userId,
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.subtitle} bold>
        Jugadores
      </Text>
      <FlatList
        horizontal
        data={normalizedPlayers}
        keyExtractor={(item: any) => item.id}
        ListEmptyComponent={
          <FullViewMessage message="No hay jugadores disponibles" />
        }
        renderItem={({item}: {item: any}) => (
          <PressableOpacityScaled
            onPress={() => onAvatarPress(item.id, item.disabled)}
            style={() => (item.disabled ? styles.disabledItem : undefined)}>
            <VStack style={styles.avatar}>
              <View style={styles.avatarWrapper}>
              <Avatar
                key={item.username}
                borderWidth={1}
                borderColor={colors.primary}
                  opacity={item.disabled ? 0.75 : 1}
                size="lg">
                <AvatarImageDefault
                  source={{uri: item.avatarUrl}}
                  alt={item.username}
                  fallbackText={item.username}
                />
              </Avatar>
                {item.isCurrentUser && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Tú</Text>
                  </View>
                )}
              </View>
              <Text
                style={styles.username}
                bold
                color={item.disabled ? colors.neutral500 : colors.neutral900}>
                {item.username}
              </Text>
            </VStack>
          </PressableOpacityScaled>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    alignItems: 'flex-start',
    width: '100%',
    // maxHeight: 150,
    padding: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dark,
    paddingBottom: 10,
  },
  avatar: {
    // flex: 1,
    width: 100,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: responsiveFontSize(1.47),
    color: colors.neutral900,
    paddingTop: 2,
    fontWeight: 'bold',
  },
  disabledItem: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.blueGray100,
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default PlayerList;
