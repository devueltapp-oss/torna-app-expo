import * as React from 'react';
import Svg, {SvgProps, Path} from 'react-native-svg';

const BackArrowIcon = (props: SvgProps) => {
  const fill = props.fill || 'white';

  return (
    <Svg
      width={12}
      height={20}
      viewBox="0 0 12 20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <Path
        d="M11.6751 1.86998L9.89513 0.0999756L0.00512695 9.99998L9.90513 19.9L11.6751 18.13L3.54513 9.99998L11.6751 1.86998Z"
        fill={fill}
      />
    </Svg>
  );
};

export default BackArrowIcon;
