import React from 'react';
import {SvgProps} from 'react-native-svg';

import {colors} from '@/config/theme';

interface TouchableIconProps {
  Icon: (props: SvgProps) => React.JSX.Element;
  pressed: boolean;
  style?: SvgProps;
  pressedColor?: string;
  noPressedColor?: string;
  alt?: string;
}

function TouchableIcon({
  Icon,
  pressed,
  style,
  pressedColor = colors.tintMuted,
  noPressedColor = 'white',
  alt = 'icon',
}: TouchableIconProps) {
  return (
    <Icon
      accessibilityLabel={alt}
      fill={pressed ? pressedColor : noPressedColor}
      scaleX={pressed ? 0.75 : 1}
      scaleY={pressed ? 0.75 : 1}
      {...style}
    />
  );
}

export default TouchableIcon;
