import React from 'react';
import {SvgProps} from 'react-native-svg';

import {
  HouseIcon,
  HouseIconOutline,
  ProfileIcon,
  ProfileIconOutline,
  WorldIcon,
  WorldIconOutline,
} from '../../assets/icons';

interface IconProps {
  focused: boolean;
  color: string;
  size: number;
}

type TabBarIconProps = IconProps & {
  NormalIcon: (props: SvgProps) => React.JSX.Element;
  FocusIcon: (props: SvgProps) => React.JSX.Element;
};

export function TabBarIcon({
  color,
  focused,
  NormalIcon,
  FocusIcon,
}: TabBarIconProps) {
  return focused ? <FocusIcon fill={color} /> : <NormalIcon fill={color} />;
}

export function TabBarHouseIcon(props: IconProps) {
  return (
    <TabBarIcon
      NormalIcon={HouseIconOutline}
      FocusIcon={HouseIcon}
      {...props}
    />
  );
}

export function TabBarWorldIcon(props: IconProps) {
  return (
    <TabBarIcon
      NormalIcon={WorldIconOutline}
      FocusIcon={WorldIcon}
      {...props}
    />
  );
}

export function TabBarProfileIcon(props: IconProps) {
  return (
    <TabBarIcon
      NormalIcon={ProfileIconOutline}
      FocusIcon={ProfileIcon}
      {...props}
    />
  );
}
