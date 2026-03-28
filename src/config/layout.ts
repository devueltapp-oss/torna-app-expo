export const measureTabBar = ({
  numberOfTabs,
  indicatorWidth,
  windowWidth,
}: {
  numberOfTabs: number;
  indicatorWidth: number;
  windowWidth: number;
}) => {
  const tabBarWidth = windowWidth / numberOfTabs;
  const indicatorOffset = (tabBarWidth - indicatorWidth) / 2;

  return {
    tabBarWidth,
    indicatorOffset,
  };
};
