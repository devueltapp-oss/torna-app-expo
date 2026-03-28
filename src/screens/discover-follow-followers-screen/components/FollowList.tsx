import {useCallback, useState, useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';

import {GetApiFollowing} from '@/api/Following/GetApiFollowing';
import {useAuth} from '@/contexts/authContext';
import {Spinner} from '@/components/Spinner';
import ToastRequest from '@/components/toast';
import {PlayerList} from '@/components/player-list';
import {PlayerItemProps} from '@/components/player-list/player-item';
import {userResponseToPlayerItemProps} from '@/utils';

interface FollowListProps {
  userId?: string;
  emptyMessage?: string;
}

export const FollowList = ({
  userId,
  emptyMessage = 'Aún no sigues a ningún usuario',
}: FollowListProps) => {
  const {getAccessToken, firebaseUser} = useAuth();
  const isFocused = useIsFocused();
  const [followers, setFollowers] = useState<PlayerItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeStatusError, setTypeStatusError] = useState<{error: number}>();

  const getFollowing = useCallback(async () => {
    const accessToken = await getAccessToken();
    try {
      setRefreshing(true);
      const res = await GetApiFollowing(
        accessToken,
        userId || firebaseUser.uid,
      );
      setFollowers(
        res.data.map(f =>
          userResponseToPlayerItemProps({
            ...f.user,
            following: true,
          }),
        ),
      );
    } catch (error) {
      setTypeStatusError({error: error as number});
      console.log('Error in FollowList', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser.uid, userId]);

  useEffect(() => {
    if (isFocused) {
      getFollowing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  return (
    <View style={styles.container}>
      {loading ? (
        <Spinner /> // Display spinner while loading
      ) : (
        <>
          {typeStatusError && (
            <ToastRequest status={typeStatusError} topPercentage={'75%'} />
          )}
          <PlayerList
            data={followers}
            refreshing={refreshing}
            onRefresh={getFollowing}
            emptyMessage={emptyMessage}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
