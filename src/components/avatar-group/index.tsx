import {View, Avatar} from '@gluestack-ui/themed';

import AvatarImageDefault from '../avatar-image-default';

import {User} from '@/config/types';

export type AvatarSecondaryMargin = {
  marginBottom: number;
  marginLeft: number;
};

export type AvatarGroupProps = {
  users: User[];
  size?: number;
  secondaryAvatarMargin?: AvatarSecondaryMargin;
  avatarSize?: 'sm' | 'md' | 'lg';
  borderColor?: string;
  borderWidth?: number;
};

export const AvatarGroup = ({
  users,
  size = 2,
  secondaryAvatarMargin = {
    marginBottom: -15,
    marginLeft: 18,
  },
  avatarSize = 'sm',
  borderColor = '$white',
  borderWidth = 3,
}: AvatarGroupProps) => {
  return (
    <View>
      {users.slice(0, size).map(({avatarUrl, username, name}, key) => (
        <View
          key={`avatar-group-${username}`}
          style={getAvatarGroupStyles(key, secondaryAvatarMargin)}>
          <Avatar borderWidth={borderWidth} borderColor={borderColor} size={avatarSize}>
            <AvatarImageDefault
              fallbackText={name}
              source={{uri: avatarUrl}}
              alt={username}
            />
          </Avatar>
        </View>
      ))}
    </View>
  );
};

const getAvatarGroupStyles = (
  key: number,
  secondaryAvatarMargin: AvatarSecondaryMargin,
) => {
  if (key === 1) {
    return {};
  }

  if (key === 0) {
    return secondaryAvatarMargin;
  }
};
