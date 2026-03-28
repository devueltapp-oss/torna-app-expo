import {View} from 'react-native';

import {colors} from '@/config/theme';

export interface DotProps {
  size: number;
}

export const Dot = ({size = 16}: DotProps) => {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
      }}
    />
  );
};
