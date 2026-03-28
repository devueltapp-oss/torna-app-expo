import {View, StyleSheet} from 'react-native';
import {Text} from '@gluestack-ui/themed';

import {colors} from '@/config/theme';

interface FloorChipProps {
  children: any;
}

const FloorChip = ({children}: FloorChipProps) => {
  return (
    <View style={styles.courtBadge}>
      <Text style={styles.floorText} bold>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  courtBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  floorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.dark,
  },
});

export default FloorChip;
