import React from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';

import {useFadeAnimation} from '@/animations';

export type PressableOpacityProps = {
  onPress?: ((event: GestureResponderEvent) => void) | null | undefined;
  children?: React.ReactNode | ((pressed: boolean) => React.ReactNode);
  style?: (pressed: boolean) => StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

function PressableOpacity({
  onPress,
  children,
  style,
  containerStyle,
}: PressableOpacityProps) {
  const {fadeIn, fadeOut, opacityValue} = useFadeAnimation();
  const styles = (pressed: boolean) => {
    if (style) {
      return style(pressed);
    }
  };

  return (
    <Pressable
      onPressIn={fadeIn}
      onPressOut={fadeOut}
      onPress={onPress}
      style={containerStyle}>
      {({pressed}) => (
        <Animated.View style={[styles(pressed), {opacity: opacityValue}]}>
          {typeof children === 'function' ? children(pressed) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}

export default PressableOpacity;
