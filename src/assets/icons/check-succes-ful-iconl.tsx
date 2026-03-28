import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"
const CheckSuccesFull = (props: SvgProps) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={100}
    height={100}
    fill="none"
    {...props}
  >
    <Path
      fill="#00875A"
      d="M50 0c27.614 0 50 22.386 50 50s-22.386 50-50 50S0 77.614 0 50 22.386 0 50 0Zm21.585 34.04a3.125 3.125 0 0 0-4.166-.227l-.254.227-25.29 25.29-9.04-9.04a3.125 3.125 0 0 0-4.648 4.166l.228.254 11.25 11.25a3.125 3.125 0 0 0 4.166.228l.254-.228 27.5-27.5a3.125 3.125 0 0 0 0-4.42Z"
    />
  </Svg>
)
export default  CheckSuccesFull
