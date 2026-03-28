import {
  Avatar,
  Button,
  ButtonText,
  HStack,
  Text,
  View,
} from '@gluestack-ui/themed';
import { EvilIcons } from '@expo/vector-icons';
import {StyleSheet} from 'react-native';
import {useState, useEffect} from 'react';
import {useIsFocused} from '@react-navigation/native';

import {Spinner} from '../Spinner';
import AvatarImageDefault from '../avatar-image-default';

import {colors} from '@/config/theme';
import PostApiFollowing from '@/api/Following/PostApiFollowing';
import PostApiUnfollowers from '@/api/unfollowing/UnfollowingApi';
import {useAuth} from '@/contexts/authContext';

export interface PlayerItemProps {
  username: string;
  name: string;
  location: string;
  avatarUrl: string;
  following: boolean;
  userId: string;
  disabled?: boolean;
}

export const PlayerItem = ({
  username,
  name,
  location,
  avatarUrl,
  following,
  userId,
  disabled = false,
}: PlayerItemProps) => {
  const {getAccessToken, firebaseUser} = useAuth();
  const isFocused = useIsFocused();
  const [follow, setFollow] = useState(following);
  const [load, setLoad] = useState(false);
  useEffect(() => {
    setFollow(following);
  }, [following]);
  useEffect(() => {
    setFollow(following);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const toggleFollow = () => {
    follow ? apiUnfollowers() : apiFollowing();
    setFollow(prevFollow => !prevFollow);
  };

  const apiFollowing = async () => {
    if (load) {
      return;
    }
    setLoad(true);
    try {
      const accessToken = await getAccessToken();
      await PostApiFollowing(accessToken, userId);
    } catch (e) {
      console.log('Error en apiFollowing:', e);
    } finally {
      setLoad(false);
    }
  };

  const apiUnfollowers = async () => {
    if (load) {
      return;
    }
    setLoad(true);
    try {
      const accessToken = await getAccessToken();
      await PostApiUnfollowers(accessToken, userId);
    } catch (e) {
      console.log('Error en apiUnfollowers:', e);
    } finally {
      setLoad(false);
    }
  };

  return (
    <HStack padding="$4" style={styles.container}>
      <Avatar opacity={disabled ? 0.5 : 1}>
        <AvatarImageDefault
          source={{uri: avatarUrl}}
          alt={username}
          fallbackText={name}
        />
      </Avatar>
      <View style={styles.userInfoContainer}>
        <Text fontWeight="bold" opacity={disabled ? 0.6 : 1}>
          {username}
        </Text>

        <View style={styles.miniDescriptionContainer}>
          <Text
            size="sm"
            color={colors.tintMuted}
            style={styles.miniDescription}>
            {name}
          </Text>
          <Text
            size="sm"
            color={colors.tintMuted}
            style={styles.miniDescription}>
            <EvilIcons name="location" size={20} color={colors.tintMuted} />{' '}
            {location}
          </Text>
        </View>
      </View>
      {firebaseUser.uid !== userId && !disabled && (
        <Button
          style={follow ? styles.buttonFollowing : styles.buttonFollow}
          onPress={toggleFollow}>
          <ButtonText
            style={
              follow ? styles.buttonTextFollowing : styles.buttonTextFollow
            }
            bold>
            {load && (
              <Spinner
                showText={false}
                color={follow ? colors.primary : colors.blueGray100}
              />
            )}
            {!load && (follow ? 'Dejar de seguir' : 'Seguir')}
          </ButtonText>
        </Button>
      )}
    </HStack>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  userInfoContainer: {
    marginHorizontal: 8,
    flex: 1,
    justifyContent: 'flex-start',
    gap: 4,
  },
  miniDescriptionContainer: {
    gap: 0,
  },
  miniDescription: {
    justifyContent: 'center',
    flex: 1,
  },
  buttonFollow: {
    width: '34%',
    height: 34,
    borderRadius: 4,
    alignSelf: 'center',
  },
  buttonFollowing: {
    width: '34%',
    height: 34,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    alignSelf: 'center',
  },
  buttonTextFollow: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonTextFollowing: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
