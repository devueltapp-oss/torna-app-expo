import * as React from 'react';
import Svg, {SvgProps, Path} from 'react-native-svg';

const PauseIcon = (props: SvgProps) => {
  const fill = props.fill || 'white';
  return (
    <Svg
      width={19}
      height={24}
      viewBox="0 0 19 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        d="M12.1224 1.33333C12.1224 0.596954 12.7255 0 13.4694 0H17.5102C18.2541 0 18.8571 0.596954 18.8571 1.33333V22.6667C18.8571 23.403 18.2541 24 17.5102 24H13.4694C12.7255 24 12.1224 23.403 12.1224 22.6667V1.33333Z"
        fill={fill}
      />
      <Path
        d="M0 1.33333C0 0.596954 0.603045 0 1.34694 0H5.38776C6.13165 0 6.73469 0.596954 6.73469 1.33333V22.6667C6.73469 23.403 6.13165 24 5.38776 24H1.34694C0.603045 24 0 23.403 0 22.6667V1.33333Z"
        fill={fill}
      />
    </Svg>
  );
};

export default PauseIcon;
