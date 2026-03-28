import {useCallback} from 'react';
import {FlatList, ListRenderItem, StyleSheet, View} from 'react-native';

import {MatchTileMemo} from '@/components/match-tile';
import {Game, User} from '@/config/types';
import {msToHhmmss, timeAgo} from '@/utils';
import FullViewMessage from '@/components/full-view-message';
import {Spinner} from '@/components/Spinner';

type VideoListProps = {
  data: Game[];
  handleOnPressPlayers?: ((users: User[]) => void) | null | undefined;
  handleOnPressGame?: ((game: string) => void) | null | undefined;
  loading?: boolean;
  scrollEnabled?: boolean;
};

function VideoList({
  data,
  handleOnPressPlayers,
  handleOnPressGame,
  loading = false,
  scrollEnabled = true,
}: VideoListProps) {
  const renderItem: ListRenderItem<Game> = useCallback(({item}) => {
    return (
      <MatchTileMemo
        gameId={item.id}
        imageUrl={item.cover}
        users={item.players}
        onLive={item.onLive}
        caption={item.caption}
        duration={msToHhmmss(item.duration)}
        timestamp={timeAgo(item.createdAt)}
        hideTimestamp={item.onLive}
        handleOnPressPlayers={handleOnPressPlayers}
        showAllUsersNames
        onPress={handleOnPressGame}
      />
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conditionalFlex = useCallback(
    () => ({flex: data.length < 1 ? 1 : 0}),
    [data],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Spinner />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={[
        styles.container,
        data.length === 0 ? styles.emptyFlex : null,
      ]}
      scrollEnabled={scrollEnabled}
      ListEmptyComponent={
        <FullViewMessage message="No hay videos disponibles" />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  emptyFlex: {
    flex: 1,
  },
});

export default VideoList;
