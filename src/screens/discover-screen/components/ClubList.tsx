import {useCallback} from 'react';
import {
  ListRenderItem,
  FlatList,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';

import {ClubItem} from './ClubItem';

import {ClubUser} from '@/config/types';
import FullViewMessage from '@/components/full-view-message';

export interface ClubListProps {
  data?: ClubUser[];
  style?: StyleProp<ViewStyle>;
  onPressClub?: (club: ClubUser) => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onFollowChange?: (clubId: string, isFollowing: boolean) => void;
}

export const ClubList = ({
  data,
  style,
  onPressClub,
  loading,
  refreshing,
  onRefresh,
  onFollowChange,
}: ClubListProps) => {
  const renderItem: ListRenderItem<ClubUser> = useCallback(
    ({item}) => {
      const handleOnPress = onPressClub ? () => onPressClub(item) : null;
      return (
        <ClubItem
          name={item.name}
          location={item.location}
          imageUrl={item.imageUrl}
          logoUrl={item.logoUrl}
          following={item.isFollowing}
          id={item.id}
          onPress={handleOnPress}
          onFollowChange={onFollowChange}
        />
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, onFollowChange],
  );

  const emptyComponent = (
    <>
      {!loading && <FullViewMessage message="No hay un club cerca de aquí" />}
    </>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      style={style}
      contentContainerStyle={(!data || data?.length === 0) && styles.flex}
      ListEmptyComponent={emptyComponent}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
