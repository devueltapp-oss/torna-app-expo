import {FlatList, ListRenderItem, StyleSheet, View} from 'react-native';
import {useCallback, useMemo} from 'react';

import FullViewMessage from '../full-view-message';

import {PlayerItem, PlayerItemProps} from './player-item';

import {Spinner} from '@/components/Spinner';

export type PlayerListProps = {
  data: PlayerItemProps[];
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string;
  loading?: boolean;
  /**
   * Identificador del usuario actual para excluirlo de la lista.
   */
  currentUserId?: string;
  /**
   * Opcionalmente forzar la presencia del usuario actual mostrando un item inhabilitado.
   */
  keepCurrentUserVisible?: boolean;
};

export const PlayerList = ({
  data,
  refreshing,
  onRefresh,
  emptyMessage = 'Parece que ya sigues a todos tus amigos',
  loading = false,
  currentUserId,
  keepCurrentUserVisible = false,
}: PlayerListProps) => {
  const normalizedData = useMemo(() => {
    if (!currentUserId) {
      return data;
    }

    const filtered = data.filter(item => item.userId !== currentUserId);

    if (!keepCurrentUserVisible) {
      return filtered;
    }

    const currentUser = data.find(item => item.userId === currentUserId);
    if (!currentUser) {
      return filtered;
    }

    return [
      {
        ...currentUser,
        name: currentUser.name || currentUser.username,
        username: currentUser.username || 'Tú',
        disabled: true,
      },
      ...filtered,
    ];
  }, [currentUserId, data, keepCurrentUserVisible]);

  const renderItem: ListRenderItem<
    PlayerItemProps & {disabled?: boolean}
  > = useCallback(({item}) => {
    return (
      <PlayerItem
        userId={item.userId}
        username={item.username}
        name={item.name}
        location={item.location}
        avatarUrl={item.avatarUrl}
        following={item.following}
        disabled={item.disabled}
      />
    );
  }, []);

  const emptyComponent = (
    <>{!loading && <FullViewMessage message={emptyMessage} />}</>
  );

  return (
    <View style={styles.container}>
      {loading && <Spinner />}
      <FlatList
        data={normalizedData}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={emptyComponent}
        contentContainerStyle={
          normalizedData.length === 0 && styles.container
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
