import React from 'react';
import {FlatList, ListRenderItem, StyleSheet} from 'react-native';
import {useCallback} from 'react';

import LocationButton from '@/components/location-button';
import {SCREEN_WIDTH} from '@/utils/constants';

export type Location = {
  id: string;
  name: string;
  image: string;
  value: string;
};

type LocationListProps = {
  locations: Location[];
  onPressLocation?: (location: Location) => void;
};

function LocationList({locations, onPressLocation}: LocationListProps) {
  const handleOnPress = (location: Location) => {
    if (onPressLocation) {
      onPressLocation(location);
    }
  };
  const renderItem: ListRenderItem<Location> = useCallback(
    ({item}) => (
      <LocationButton
        name={item.name}
        image={item.image}
        onPress={() => handleOnPress(item)}
        style={styles.button}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <FlatList
      data={locations}
      renderItem={renderItem}
      contentContainerStyle={styles.buttonsContainer}
      keyExtractor={item => item.id}
      numColumns={1}
      horizontal={false}
    />
  );
}

const styles = StyleSheet.create({
  columnWrapper: {
    justifyContent: 'space-between',
  },
  buttonsContainer: {
    paddingVertical: SCREEN_WIDTH * 0.065,
    paddingHorizontal: SCREEN_WIDTH * 0.065,
    gap: SCREEN_WIDTH * 0.065,
  },
  button: {
    // width: SCREEN_WIDTH * 0.4025,
    height: SCREEN_WIDTH * 0.4025,
  },
});

export default LocationList;
