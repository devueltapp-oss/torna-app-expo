import {useCallback, useEffect, useState} from 'react';
import {useIsFocused} from '@react-navigation/native';

import {useAuth} from '@/contexts/authContext';
import {GetApiFollowing} from '@/api/Following/GetApiFollowing';
import {userResponseToPlayerItemProps} from '@/utils';
import {PlayerList} from '@/components/player-list';
import {PlayerItemProps} from '@/components/player-list/player-item';

export function PlayerListScreen() {
  const {getAccessToken, firebaseUser} = useAuth();
  const isFocused = useIsFocused();
  const [players, setPlayers] = useState<PlayerItemProps[]>([]);
  const [loading, setLoading] = useState(true);

  const requestPlayers = useCallback(async () => {
    if (!firebaseUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const accessToken = await getAccessToken();

    try {
      const followingResponse = await GetApiFollowing(accessToken, firebaseUser.uid);
      // FollowResponse tiene estructura { data: FollowDataResponse[], total: number }
      // donde cada FollowDataResponse tiene { user: UserBasicResponse, ... }
      const followingUsers = followingResponse?.data?.map(item => item.user) || [];
      // En la tab "Siguiendo", todos los usuarios ya están siendo seguidos, así que following = true
      setPlayers(followingUsers.map(user => userResponseToPlayerItemProps({...user, following: true})));
    } catch (error) {
      console.error('Error obteniendo usuarios que sigues:', error);
      setPlayers([]);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid]);

  useEffect(() => {
    if (isFocused) {
      requestPlayers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  return (
    <PlayerList
      data={players}
      refreshing={loading}
      onRefresh={requestPlayers}
      emptyMessage="No estás siguiendo a ningún usuario"
    />
  );
}
