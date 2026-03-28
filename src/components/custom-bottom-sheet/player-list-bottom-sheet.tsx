import {forwardRef, useCallback} from 'react';
import {ListRenderItem, StyleSheet} from 'react-native';
import {BottomSheetFlatList, BottomSheetModal} from '@gorhom/bottom-sheet';

import UserItem from '../user-item';
import FullViewMessage from '../full-view-message';
import {Spinner} from '../Spinner';

import CustomBottomSheet from '.';

import {colors} from '@/config/theme';
import {User} from '@/config/types';

type PlayerListBottomSheetProps = {
  players: User[];
  onDismiss?: () => void;
  error?: boolean;
  isLoading?: boolean;
  onUserItemPress?: () => void;
};

const PlayerListBottomSheet = forwardRef<
  BottomSheetModal,
  PlayerListBottomSheetProps
>(
  (
    {players, onDismiss, error = false, isLoading = false, onUserItemPress},
    ref,
  ) => {
    const renderPlayers: ListRenderItem<User> = useCallback(
      ({item}) => <UserItem user={item} onPress={onUserItemPress} />,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );
    const ErrorMessage = (
      <FullViewMessage
        message="Ha ocurrido un error al obtener los usuarios"
        containerStyle={styles.attatchToTheTop}
      />
    );

    return (
      <CustomBottomSheet ref={ref} title="Jugadores" onDismiss={onDismiss}>
        {isLoading && <Spinner containerStyle={styles.attatchToTheTop} />}
        {!isLoading && !error && (
          <BottomSheetFlatList
            data={players}
            keyExtractor={item => item.username}
            renderItem={renderPlayers}
            contentContainerStyle={styles.playersListContainer}
            ListEmptyComponent={ErrorMessage}
          />
        )}
        {error && ErrorMessage}
      </CustomBottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  playersListContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  attatchToTheTop: {
    alignItems: 'stretch',
    height: 'auto',
    flex: 0,
    marginTop: 16,
  },
});

export default PlayerListBottomSheet;
