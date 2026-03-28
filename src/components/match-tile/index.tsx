import {View, Image, StyleSheet} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import {memo} from 'react';

import {AvatarGroup} from '../avatar-group';
import FloorChip from '../floor-chip';
import {PressableOpacity} from '../custom-buttons';

import {buildTitle, wrapText} from '@/utils';
import {User} from '@/config/types';
import {colors} from '@/config/theme';

export type MatchTileViewProps = {
  timestamp?: string;
  imageUrl: string;
  users: User[];
  caption?: string;
  duration?: string;
  captionLength?: number;
  handleOnPressPlayers?: ((users: User[]) => void) | null | undefined;
  onLive?: boolean;
  hideTimestamp?: boolean;
  showAllUsersNames?: boolean;
};

export type MatchTileProps = MatchTileViewProps & {
  gameId: string;
  onPress?: ((gameId: string) => void) | null | undefined;
};

export const MatchTileView = ({
  timestamp,
  imageUrl,
  users,
  caption,
  duration,
  captionLength = 50,
  handleOnPressPlayers,
  onLive = false,
  hideTimestamp = false,
  showAllUsersNames = false,
}: MatchTileViewProps) => {
  const handleOnPress = () => {
    if (handleOnPressPlayers) {
      handleOnPressPlayers(users);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={{uri: imageUrl}} style={styles.image} alt={caption} />
        {onLive && (
          <View style={styles.onLive}>
            <Text style={styles.onLiveDot} bold>
              •&nbsp;
            </Text>
            <Text style={styles.onLiveText} bold>
              EN VIVO
            </Text>
          </View>
        )}
        {duration && !onLive && (
          <Text style={styles.timeStamp} bold>
            {duration}
          </Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <View style={styles.textContainer}>
          <PressableOpacity
            style={_ => [styles.userTextInfo, !caption && styles.marginBottom]}
            onPress={handleOnPress}>
            <AvatarGroup
              users={users}
              secondaryAvatarMargin={{
                marginBottom: -20,
                marginLeft: 16,
              }}
            />
            <Text style={styles.usernameContainer} textBreakStrategy="simple">
              {showAllUsersNames ? (
                <Text style={styles.username} bold>
                  {wrapText(buildTitle(users.map(user => user.username)))}
                </Text>
              ) : (
                <>
                  <Text style={styles.username} bold>
                    {users[0].username}
                  </Text>
                  {users.length > 1 ? (
                    <>
                      &nbsp;con&nbsp;
                      <Text style={styles.username} bold>
                        otros {users.length}
                      </Text>
                    </>
                  ) : (
                    ''
                  )}
                </>
              )}
              {/* <Text style={styles.username}>{users[0].username}</Text>
              {users.length > 1 ? (
                <>
                  &nbsp;con&nbsp;
                  <Text style={styles.username}>otros {users.length}</Text>
                </>
              ) : (
                ''
              )} */}
            </Text>
          </PressableOpacity>
          {caption && (
            <Text style={styles.caption}>
              {wrapText(caption, captionLength)}
            </Text>
          )}
          <View style={styles.timeAgoContainer}>
            <FloorChip>Pista 3</FloorChip>
            {timestamp && !hideTimestamp && (
              <Text style={styles.timeAgo}>{timestamp}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

export const MatchTile = ({onPress, gameId, ...props}: MatchTileProps) => {
  if (onPress) {
    return (
      <PressableOpacity onPress={() => onPress(gameId)}>
        <MatchTileView {...props} />
      </PressableOpacity>
    );
  } else {
    return <MatchTileView {...props} />;
  }
};

export const MatchTileMemo = memo(MatchTile);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    flexDirection: 'row',
  },
  imageContainer: {
    position: 'relative',
    flex: 0,
    borderRadius: 8,
    overflow: 'hidden',
    maxHeight: 100,
  },
  image: {
    width: 170,
    height: '100%',
    objectFit: 'cover',
  },
  timeStamp: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: 5,
    borderRadius: 4,
    fontWeight: 'bold',
    fontSize: 12,
  },
  onLive: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.danger,
    padding: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    flexDirection: 'row',
  },
  onLiveDot: {
    transform: [{scale: 1.5}, {translateX: 1}],
    color: 'white',
    fontWeight: 'bold',
  },
  onLiveText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  userInfo: {
    paddingLeft: 10,
    flex: 1,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  userTextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 45,
  },
  usernameContainer: {
    marginLeft: 2,
    flex: 1,
    fontSize: 12,
    textAlign: 'left',
    color: colors.dark,
  },
  caption: {
    fontSize: 12,
    marginBottom: 4,
    color: colors.dark,
  },
  timeAgoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeAgo: {
    color: colors.neutral500,
    fontSize: 12,
    marginLeft: 4,
  },
  username: {
    color: colors.neutral900,
    fontWeight: 'bold',
    fontSize: 12,
  },
  menuButton: {
    width: 18,
    height: 18,
  },
  marginBottom: {
    marginBottom: 4,
  },
});
