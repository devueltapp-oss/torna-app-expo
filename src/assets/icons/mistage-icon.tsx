import * as React from "react"
import Svg, {SvgProps, Path} from 'react-native-svg';

const Mistage = (props : SvgProps) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={12}
    height={12}
    fill="none"
    {...props}
  >
    <Path
      fill="#BB3717"
      d="M6 0a6 6 0 1 1 0 12A6 6 0 0 1 6 0Zm0 8a.75.75 0 1 0 0 1.5A.75.75 0 0 0 6 8Zm0-5.5a.5.5 0 0 0-.492.41L5.5 3v3.5l.008.09a.5.5 0 0 0 .984 0L6.5 6.5V3l-.008-.09A.5.5 0 0 0 6 2.5Z"
    />
  </Svg>
)
export default Mistage