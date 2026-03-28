import * as React from 'react';
import Svg, {SvgProps, G, Rect} from 'react-native-svg';

const MenuButtonIcon = (props: SvgProps) => (
  <Svg
    width={4}
    height={17}
    viewBox="0 0 4 17"
    fill="#64748B"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <G clipPath="url(#clip0_2219_203)">
      <Rect x={0.799988} y={11.0332} width={2.4} height={2.4} rx={1.2} />
      <Rect x={0.799988} y={7.2998} width={2.4} height={2.4} rx={1.2} />
      <Rect x={0.799988} y={3.56641} width={2.4} height={2.4} rx={1.2} />
    </G>
  </Svg>
);

export default MenuButtonIcon;
