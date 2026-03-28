import {Avatar, View, Text} from '@gluestack-ui/themed';
import {StyleSheet} from 'react-native';
import {responsiveFontSize} from 'react-native-responsive-dimensions';

import {NotificationType} from '@/config/types';
import {Dot} from '@/components/dot';
import {colors} from '@/config/theme';
import {FollowingButton} from '@/components/custom-buttons';
import {PressableBackgroundColor} from '@/components/custom-buttons';
import AvatarImageDefault from '@/components/avatar-image-default';

export interface NotificationItemProps {
  body: string;
  type: NotificationType;
  username?: string;
  timestamp?: string;
  following?: boolean;
  avatarUrl?: string;
  hasBorder?: boolean;
  hasDot?: boolean;
}

export const NotificationItem = ({
  body,
  username,
  type = 'following',
  timestamp,
  following,
  hasBorder,
  avatarUrl,
  hasDot,
}: NotificationItemProps) => {
  const containerStyles = StyleSheet.flatten([
    styles.container,
    hasBorder
      ? {
          borderBottomWidth: 1,
          borderBottomColor: colors.muted,
        }
      : {},
  ]);

  if (type === 'following') {
    return (
      <PressableBackgroundColor>
        <View style={containerStyles}>
          {hasDot && <Dot size={10} />}
          <View style={styles.innerContainer}>
            <Avatar marginRight="$3" style={{justifyContent: 'center', alignItems: 'center', alignContent: 'center'}}>
              <AvatarImageDefault
                source={{uri: avatarUrl}}
                alt={username}
                fallbackText={username}
                style={{alignSelf: 'center'}}
              />
            </Avatar>
            <View style={styles.textContainer} marginRight="$3">
              <Text style={styles.notificationText}>
                <Text style={styles.bold} bold>
                  {username || ''}
                </Text>{' '}
                {body}
              </Text>
              {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
            </View>

            {following != null && <FollowingButton following={following} />}
          </View>
        </View>
      </PressableBackgroundColor>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  notificationText: {
    color: colors.primary900,
    fontSize: responsiveFontSize(1.65),
    marginRight: '10%',
  },
  bold: {
    fontWeight: 'bold',
    color: colors.neutral900,
    fontSize: responsiveFontSize(1.65),
    lineHeight: 20.3,
  },
  container: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: '2%',
  },
  textContainer: {
    flex: 1,
  },
  timestamp: {
    // fontSize: 14,
    fontSize: responsiveFontSize(1.64),
    marginTop: 8,
    color: colors.tintMuted,
    fontWeight: 'normal',
  },
});
