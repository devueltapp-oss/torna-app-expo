import {StyleProp, ViewStyle} from 'react-native';
import {useEffect, useState} from 'react';

import FollowingButton from './following-button';

import {useAuth} from '@/contexts/authContext';
import {unfollowUser, followUser} from '@/utils/request';

interface FollowingRequestButtonProps {
  userId: string;
  isFollowing: boolean;
  style?: StyleProp<ViewStyle>;
  callback?: (isFollowing: boolean) => void;
}

function FollowingRequestButton({
  userId,
  isFollowing,
  style,
  callback,
}: FollowingRequestButtonProps) {
  const {getAccessToken} = useAuth();
  const [following, setFollowing] = useState(isFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFollowing(isFollowing);
  }, [isFollowing]);

  const handleFollowUser = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    const accessToken = await getAccessToken();
    if (following) {
      try {
        await unfollowUser(userId, accessToken);
        // Si la operación fue exitosa, actualizar el estado
        setFollowing(false);
        if (callback) {
          callback(false);
        }
      } catch (e) {
        console.error('Error al dejar de seguir:', e);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await followUser(userId, accessToken);
        // Si la operación fue exitosa, actualizar el estado
        setFollowing(true);
        if (callback) {
          callback(true);
        }
      } catch (e) {
        console.error('Error al seguir:', e);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <FollowingButton
      onPressFollowing={handleFollowUser}
      onPressFollow={handleFollowUser}
      following={following}
      style={style}
      loading={loading}
    />
  );
}

export default FollowingRequestButton;
