import React, {forwardRef, Fragment, useMemo, useCallback, memo} from 'react';
import {View, Image, StyleSheet, Pressable, Animated, Text as RNText} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';

import {AvatarGroup} from '../avatar-group';
import {useFadeAnimation} from '../../animations';
import {wrapText} from '../../utils';
import {EyeIcon} from '../../assets/icons';
import GamePlayer from '../game-player';

import {colors} from '@/config/theme';

export const MATCH_IMAGE_HEIGHT = 200;

type MatchParticipant = {
  id: string;
  username: string;
  name: string;
  profilePicture: string;
};

type OnPressPayload =
  | {type: 'match'; matchId: string}
  | {type: 'club'; clubId: string}
  | {
      type: 'upcoming';
      match: {
        id: string;
        imageUrl: string;
        users: MatchParticipant[];
        clubName: string;
        floor: string;
        clubId?: string;
        badgeLabel?: string;
        badgeColor?: string;
        badgeSubLabel?: string;
        previewMode?: 'video' | 'versus';
        isLive: boolean;
        viewers?: number;
        startsIn?: string;
        startAt?: string;
      };
    };

interface CardProps {
  id: string;
  imageUrl: string;
  viewers?: number;
  users: MatchParticipant[];
  clubName: string;
  floor: string;
  clubId?: string;
  onPress?: (payload: OnPressPayload) => void;
  showVideoPlayer: boolean;
  previewMode?: 'video' | 'versus';
  currentUserId?: string | null;
  badgeLabel?: string;
  badgeColor?: string;
  badgeSubLabel?: string;
  isLive?: boolean;
  startsIn?: string;
  startAt?: string;
}

const MatchCard = forwardRef<View, CardProps>(
  (
    {
      id,
      imageUrl,
      viewers,
      users,
      clubName,
      floor,
      clubId,
      onPress,
      showVideoPlayer,
      previewMode = 'video',
      currentUserId,
      badgeLabel = 'EN VIVO',
      badgeColor = colors.danger,
      badgeSubLabel,
      isLive = true,
      startsIn,
      startAt,
    },
    ref,
  ) => {
    const {fadeIn, fadeOut, opacityValue} = useFadeAnimation();

    const safeUsers: MatchParticipant[] = users ?? [];

    const handleCardPress = () => {
      if (isLive) {
        onPress?.({type: 'match', matchId: id});
      } else {
        onPress?.({
          type: 'upcoming',
          match: {
            id,
            imageUrl,
            users: safeUsers,
            clubName,
            floor,
            clubId,
            badgeLabel,
            badgeColor,
            badgeSubLabel,
            previewMode,
            isLive,
            viewers,
            startsIn,
            startAt,
          },
        });
      }
    };

    const buildTitle = useCallback(() => {
      let title = '';

      safeUsers.forEach((user, i) => {
        if (i === safeUsers.length - 1) {
          title = title.concat(user.username);
        } else {
          const separator = i === safeUsers.length - 2 ? ' y ' : ', ';
          title = title.concat(user.username, separator);
        }
      });

      return title;
    }, [safeUsers]);

    const versusParticipants = useMemo(() => {
      if (safeUsers.length === 0) {
        return {left: null, right: null};
      }

      const participants = safeUsers.filter(u => u != null);
      if (participants.length === 0) {
        return {left: null, right: null};
      }

      const currentUserIndex = participants.findIndex(
        player => player.id === currentUserId,
      );

      if (currentUserIndex !== -1 && participants.length > 1) {
        const [currentUser] = participants.splice(currentUserIndex, 1);
        return {
          left: participants[0],
          right: currentUser,
        };
      }

      return {
        left: participants[0] ?? null,
        right: participants[1] ?? null,
      };
    }, [currentUserId, safeUsers]);

    return (
      <Pressable
        onPressIn={fadeIn}
        onPressOut={fadeOut}
        onPress={handleCardPress}
      >
        <Animated.View
          style={{
            ...styles.cardContainer,
            opacity: opacityValue,
          }}>
          <View style={styles.card} ref={ref}>
            <View style={[styles.badgeContainer, {backgroundColor: badgeColor}]}>
              <Text style={styles.badgeText} bold>
                {badgeLabel}
              </Text>
              {badgeSubLabel ? (
                <Text style={styles.badgeSubText}>{badgeSubLabel}</Text>
              ) : null}
            </View>
            {previewMode === 'video' && showVideoPlayer ? (
              <GamePlayer
                gameId={id}
                viewers={viewers!}
                showControls={false}
                style={styles.image}
                initialVolume={0}
                playUntilSecond={3}
                showErrorOverlay={false}
              />
            ) : previewMode === 'versus' ? (
              <View style={styles.versusContainer}>
                <View style={styles.versusColumn}>
                  {versusParticipants.left ? (
                    <>
                      <AvatarGroup
                        size={1}
                        avatarSize="lg"
                        borderColor={colors.primary}
                        users={[
                          {
                            ...versusParticipants.left,
                            avatarUrl: versusParticipants.left.profilePicture,
                            following: false,
                          },
                        ]}
                      />
                      <RNText style={styles.versusName} numberOfLines={1}>
                        {versusParticipants.left.username}
                      </RNText>
                    </>
                  ) : (
                    <RNText style={styles.versusPlaceholder}>Pendiente</RNText>
                  )}
                </View>
                <View style={styles.versusCenter}>
                  <RNText style={styles.versusLabel}>VS</RNText>
                </View>
                <View style={styles.versusColumn}>
                  {versusParticipants.right ? (
                    <>
                      <AvatarGroup
                        size={1}
                        avatarSize="lg"
                        borderColor={colors.primary}
                        users={[
                          {
                            ...versusParticipants.right,
                            avatarUrl: versusParticipants.right.profilePicture,
                            following: false,
                          },
                        ]}
                      />
                      <RNText style={styles.versusName} numberOfLines={1}>
                        {versusParticipants.right.username}
                      </RNText>
                    </>
                  ) : (
                    <RNText style={styles.versusPlaceholder}>Por confirmar</RNText>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.imageFallback}>
                <Image
                  source={{uri: imageUrl}}
                  style={styles.image}
                  alt={clubName}
                />
              </View>
            )}

            {typeof viewers === 'number' && viewers > 0 && (
              <LinearGradient
                style={styles.viewersContainer}
                colors={['transparent', '#000']}>
                <Fragment>
                  <View style={{marginRight: 10}}>
                    <EyeIcon
                      fill={colors.secondary}
                      scaleX={1.15}
                      scaleY={1.15}
                    />
                  </View>
                  <Text
                    style={
                      styles.viewersText
                    }>{`${viewers} espectadores`}</Text>
                </Fragment>
              </LinearGradient>
            )}
          </View>
          <View style={styles.footer}>
            <AvatarGroup
              users={safeUsers.map(u => ({
                ...u,
                avatarUrl: u.profilePicture,
                following: false,
              }))}
            />
            <Text style={styles.usersText} bold>
              {wrapText(buildTitle())}
            </Text>
          </View>
          <View style={styles.clubInfoContainer}>
            <Pressable
              disabled={!clubId}
              onPress={event => {
                event?.stopPropagation?.();
                if (clubId) {
                  onPress?.({type: 'club', clubId});
                }
              }}
              style={({pressed}) => [
                styles.clubBadge,
                pressed && styles.clubBadgePressed,
              ]}>
              <Text style={styles.clubName}>
              {floor ? `${clubName} - ${floor}` : clubName}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  versusContainer: {
    width: '100%',
    height: MATCH_IMAGE_HEIGHT,
    backgroundColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  versusColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  versusCenter: {
    width: 80,
    alignItems: 'center',
  },
  versusLabel: {
    color: colors.neutral50,
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  versusName: {
    color: colors.neutral50,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  versusPlaceholder: {
    color: colors.neutral400,
    fontSize: 12,
  },
  imageFallback: {
    width: '100%',
    height: MATCH_IMAGE_HEIGHT,
    backgroundColor: 'black',
  },
  cardContainer: {
    marginBottom: 16,
  },

  clubInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clubBadge: {
    backgroundColor: 'rgba(214, 255, 126, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  clubBadgePressed: {
    backgroundColor: 'rgba(214, 255, 126, 0.3)',
  },
  footer: {
    flexDirection: 'row',
    paddingVertical: 10,
    overflow: 'hidden',
  },

  card: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderRadius: 5,
    zIndex: 1,
  },
  badgeText: {
    color: colors.neutral50,
    fontSize: 14,
  },
  badgeSubText: {
    color: colors.neutral100,
    fontSize: 10,
  },
  image: {
    width: '100%',
    height: MATCH_IMAGE_HEIGHT,
  },
  infoContainer: {
    padding: 10,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  eyeIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
  },
  viewersText: {
    fontSize: 14,
    color: colors.tint,
  },
  usersText: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 16,
    flex: 1,
    flexWrap: 'wrap',
    color: colors.neutral900,
  },
  courtContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  courtBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    marginRight: 10,
  },
  courtText: {
    color: 'green',
  },
  locationText: {
    fontSize: 14,
  },
  floorText: {
    fontSize: 12,
    color: colors.neutral900,
  },
  clubName: {
    color: colors.neutral500,
    fontSize: 14,
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
    textDecorationColor: colors.secondary,
  },
});

export default memo(MatchCard);
