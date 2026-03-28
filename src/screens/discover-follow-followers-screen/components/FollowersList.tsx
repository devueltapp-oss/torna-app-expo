import {useState, useEffect} from 'react';
import {useIsFocused} from '@react-navigation/native';

import GetApiFollowers from '@/api/Followers/GetApiFollowers';
import {useAuth} from '@/contexts/authContext';
import {Spinner} from '@/components/Spinner';
import ToastRequest from '@/components/toast';
import {PlayerList} from '@/components/player-list';
import {PlayerItemProps} from '@/components/player-list/player-item';
import {userResponseToPlayerItemProps} from '@/utils';

interface FollowersListProps {
  userId?: string;
  emptyMessage?: string;
}

export function FollowersList({
  userId,
  emptyMessage = 'Oops, aún no tienes seguidores',
}: FollowersListProps) {
  const {getAccessToken, firebaseUser} = useAuth();
  const isFocused = useIsFocused();
  const [followers, setFollowers] = useState<PlayerItemProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [typeStatusError, setTypeStatusError] = useState<{error: number}>();

  const getFollowers = async () => {
    setRefreshing(true);
    const accessToken = await getAccessToken();
    try {
      const res = await GetApiFollowers(
        accessToken,
        userId || firebaseUser.uid,
      );
      setFollowers(
        res.data.map(f =>
          userResponseToPlayerItemProps({
            ...f.follower,
            following: f.isFollowing,
          }),
        ),
      );
    } catch (error) {
      console.log('Error in FollowersToList', error);
      setTypeStatusError({error: error as number});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (isFocused) {
      getFollowers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  return (
    <>
      {loading ? (
        <Spinner />
      ) : (
        <>
          {typeStatusError && (
            <ToastRequest status={typeStatusError} topPercentage={'75%'} />
          )}
          <PlayerList
            data={followers}
            refreshing={refreshing}
            onRefresh={getFollowers}
            emptyMessage={emptyMessage}
          />
        </>
      )}
    </>
  );
}
