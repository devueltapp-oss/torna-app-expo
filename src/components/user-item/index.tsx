import {Avatar, Text} from '@gluestack-ui/themed';
import {StyleSheet, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';

import {FollowingRequestButton, PressableOpacity} from '../custom-buttons';
import AvatarImageDefault from '../avatar-image-default';

import {User} from '@/config/types';
import {colors} from '@/config/theme';
import {useAuth} from '@/contexts/authContext';
import {MainNavigatorParamList} from '@/navigators/main-navigator';

interface UserItemProps {
  user: User;
  onPress?: () => void;
}

function UserItem({user, onPress}: UserItemProps) {
  const navigation: NavigationProp<MainNavigatorParamList> = useNavigation();
  const {firebaseUser} = useAuth();
  const onAvatarPress = () => {
    if (onPress) {
      onPress();
    }
    navigation.navigate('screens.userProfile', {
      userId: user.id,
    });
  };

  return (
    <PressableOpacity onPress={onAvatarPress}>
      <View style={styles.container}>
        <Avatar
          borderWidth={1}
          style={{borderRadius: 50, height: 40, width: 40}}
          borderColor={colors.neutral400}
          size="md">
          <AvatarImageDefault
            fallbackText={user.username}
            source={{uri: user.avatarUrl}}
            alt={user.username}
          />
        </Avatar>
        <View style={styles.textContainer}>
          <Text style={styles.usernameText} bold>
            {user.username}
          </Text>
          <Text style={styles.nameText}>{user.name}</Text>
        </View>
        {firebaseUser.uid !== user.id && (
          <FollowingRequestButton
            isFollowing={user.following}
            userId={user.id}
          />
        )}
      </View>
    </PressableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 10,
    gap: 4,
  },
  usernameText: {
    fontSize: 16,
    lineHeight: 18.4,
    fontWeight: 'bold',
    color: colors.dark,
  },
  nameText: {
    fontSize: 16,
    lineHeight: 18.4,
    color: colors.neutral500,
  },
  button: {
    flex: 0,
    width: 115,
  },
});

export default UserItem;
