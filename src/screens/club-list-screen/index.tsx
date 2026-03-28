import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StyleSheet, View} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import {useIsFocused} from '@react-navigation/native';
import React from 'react';

import {ClubList} from '../discover-screen/components/ClubList';

import {getClubs} from '@/utils/request';
import {DiscoverNavigatorParamList} from '@/navigators/discover-navigator';
import CustomHeader from '@/components/header/CustomHeader';
import {colors} from '@/config/theme';
import {ClubUser} from '@/config/types';
import {clubResponseToClubUser} from '@/utils';
import {useAuth} from '@/contexts/authContext';
import {Spinner} from '@/components/Spinner';
import ToastRequest from '@/components/toast';

function ClubListScreen(
  props: NativeStackScreenProps<DiscoverNavigatorParamList, 'screens.clubList'>,
) {
  const insets = useSafeAreaInsets();
  const {getAccessToken} = useAuth();
  const [clubs, setClubs] = useState<ClubUser[]>();
  const location = props.route.params.location;
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(true);
  const [typeStatusError, setTypeStatusError] = useState<any>(null);

  const handleOnPressClub = (club: ClubUser) => {
    props.navigation.navigate('screens.club', {
      clubId: club.id,
    });
  };

  const handleFollowChange = (clubId: string, isFollowing: boolean) => {
    setClubs(prevClubs => {
      if (!prevClubs) return prevClubs;
      return prevClubs.map(club =>
        club.id === clubId ? {...club, isFollowing} : club,
      );
    });
  };

  const fetchClubs = async () => {
    if (!loading) {
      setRefreshing(true);
    }

    try {
      const accessToken = await getAccessToken();
      const clubs = await getClubs(location, accessToken);
      
      // Validar que sea un array (getClubs ya garantiza esto, pero validamos por seguridad)
      if (!Array.isArray(clubs)) {
        setClubs([]);
        setTypeStatusError({error: 800});
        return;
      }
      
      setClubs(clubs.map(item => clubResponseToClubUser(item, location)));

      if (clubs.length === 0) {
        setTypeStatusError({error: 800});
      } else {
        setTypeStatusError(null);
      }
    } catch (error) {
      setTypeStatusError({error});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchClubs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const containerStyles = {
    flex: 1,
    // Paddings to handle safe area
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
  const handleGoBack = () => {
    props.navigation.navigate('screens.discover');
  };

  return (
    <>
      {loading ? (
        <Spinner />
      ) : (
        <View style={containerStyles}>
          <CustomHeader textBack="Estados" customGoBack={handleGoBack} />
          {typeStatusError && (
            <>
              <ToastRequest status={typeStatusError} topPercentage={'85%'} />
            </>
          )}
          <View style={styles.container}>
            <Text style={[styles.title, styles.paddingHorizontal]} bold>
              Estado {location}
            </Text>
            <ClubList
              data={clubs}
              style={styles.paddingHorizontal}
              onPressClub={handleOnPressClub}
              loading={loading}
              refreshing={refreshing}
              onRefresh={fetchClubs}
              onFollowChange={handleFollowChange}
            />
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 6,
  },
  paddingHorizontal: {
    paddingHorizontal: 18,
  },
  title: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
});

export default ClubListScreen;
