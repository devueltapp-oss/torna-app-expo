import {BottomSheetBackdrop, BottomSheetModal} from '@gorhom/bottom-sheet';
import {forwardRef, useCallback, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from '@gluestack-ui/themed';

import {colors} from '@/config/theme';

interface CustomBottomSheetProps {
  title: string;
  snapPoints?: Array<number | string>;
  children?: React.ReactNode;
  onDismiss?: () => void;
}

const CustomBottomSheet = forwardRef<BottomSheetModal, CustomBottomSheetProps>(
  ({title, children, onDismiss, snapPoints = ['45%', '85%', '95%']}, ref) => {
    const snap = useMemo(() => snapPoints, [snapPoints]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          appearsOnIndex={1}
          disappearsOnIndex={-1}
          {...props}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        snapPoints={snap}
        enablePanDownToClose={true}
        handleIndicatorStyle={styles.line}
        backdropComponent={renderBackdrop}
        ref={ref}
        onDismiss={onDismiss}>
        <View style={styles.contentContainer}>
          <Text style={styles.header} bold>
            {title}
          </Text>
          {children}
        </View>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: 'grey',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 15,
    color: colors.dark,
  },
  line: {
    backgroundColor: '#94A3B8',
    width: 40,
  },
});

export default CustomBottomSheet;
