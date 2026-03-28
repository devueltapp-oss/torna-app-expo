import {useEffect, useState} from 'react';
import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import LocationList, {Location} from './components/LocationList';

import {getLocations} from '@/utils/request';
import {DiscoverNavigatorParamList} from '@/navigators/discover-navigator';

export function LocationListScreen({
  navigation,
}: NativeStackScreenProps<DiscoverNavigatorParamList, 'screens.discover'>) {
  const [locations, setLocations] = useState<Location[]>([]);
  useEffect(() => {
    getLocations()
      .then(l => setLocations(l))
      .catch(error => console.log(error));
  }, []);

  return (
    <LocationList
      locations={locations}
      onPressLocation={location =>
        navigation.navigate('screens.clubList', {
          location: location.value,
        })
      }
    />
  );
}
