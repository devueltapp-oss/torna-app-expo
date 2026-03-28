import {forwardRef, useCallback} from 'react';
import {ListRenderItem, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {BottomSheetFlatList, BottomSheetModal} from '@gorhom/bottom-sheet';

import CustomBottomSheet from '.';
import {VENEZUELA_STATES, VenezuelaState} from '@/utils/venezuelaStates';
import {colors} from '@/config/theme';
import {SCREEN_HEIGHT} from '@/utils/constants';

interface StateSelectorBottomSheetProps {
  onDismiss?: () => void;
  onSelectState: (state: VenezuelaState) => void;
  selectedState?: VenezuelaState | null;
}

export const StateSelectorBottomSheet = forwardRef<
  BottomSheetModal,
  StateSelectorBottomSheetProps
>(({onDismiss, onSelectState, selectedState}, ref) => {
  const renderState: ListRenderItem<VenezuelaState> = useCallback(
    ({item}) => {
      const isSelected = selectedState?.value === item.value;
      return (
        <TouchableOpacity
          style={[styles.stateItem, isSelected && styles.stateItemSelected]}
          onPress={() => onSelectState(item)}>
          <Text
            style={[
              styles.stateText,
              isSelected && styles.stateTextSelected,
            ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    },
    [onSelectState, selectedState],
  );

  return (
    <CustomBottomSheet
      ref={ref}
      title="Selecciona un estado"
      onDismiss={onDismiss}
      snapPoints={[SCREEN_HEIGHT * 0.6]}>
      <View style={styles.wrapper}>
        <BottomSheetFlatList
          data={VENEZUELA_STATES}
          keyExtractor={item => item.value}
          renderItem={renderState}
          contentContainerStyle={styles.container}
          style={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </CustomBottomSheet>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    flex: 1,
    alignSelf: 'stretch',
  },
  list: {
    width: '100%',
    flex: 1,
    alignSelf: 'stretch',
  },
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    alignSelf: 'stretch',
  },
  stateItem: {
    width: '100%',
    alignSelf: 'stretch',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.neutral50,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  stateItemSelected: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  stateText: {
    fontSize: 16,
    color: colors.neutral900,
    width: '100%',
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  stateTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  separator: {
    height: 8,
  },
});

