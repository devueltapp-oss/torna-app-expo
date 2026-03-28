import * as React from 'react';
import Svg, {SvgProps, Path} from 'react-native-svg';

const ComeBack = (props: SvgProps) => (
  <Svg xmlns="http://www.w3.org/2000/svg" width={13} height={20} fill="none">
    <Path
      fill="#475569"
      {...props}
      d="M12.51 1.87 10.73.1.84 10l9.9 9.9 1.77-1.77L4.38 10l8.13-8.13Z"
    />
  </Svg>
);
export default ComeBack;
