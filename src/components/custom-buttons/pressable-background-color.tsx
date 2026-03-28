import {Pressable, PressableStateCallbackType} from 'react-native';

import {PressableOpacityProps} from './pressable-opacity';

import {colors} from '@/config/theme';

export type PressableBackgroundColorProps = PressableOpacityProps & {
  normalColor?: string;
  pressedColor?: string;
};

function PressableBackgroundColor({
  onPress,
  children,
  style,
  pressedColor = colors.tintMuted,
  normalColor = 'transparent',
}: PressableBackgroundColorProps) {
  const s = ({pressed}: PressableStateCallbackType) => ({
    backgroundColor: pressed ? pressedColor : normalColor,
    ...style,
  });
  return (
    <Pressable onPress={onPress} style={s}>
      {({pressed}) =>
        typeof children === 'function' ? children(pressed) : children
      }
    </Pressable>
  );
}

export default PressableBackgroundColor;
