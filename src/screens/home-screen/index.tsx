/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {useCallback, useEffect, useState} from 'react';
import {
  SectionListRenderItem,
  StyleSheet,
  View,
  BackHandler,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import {Heading, SectionList} from '@gluestack-ui/themed';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';

import MatchCard from '@/components/match-card';
import {colors} from '@/config/theme';
import {GetGamesLiveResponse, UpcomingGameData} from '@/config/types';
import CustomHeader from '@/components/header/CustomHeader';
import ToastLogaOut from '@/components/toatsLogOut';
import {useAuth} from '@/contexts/authContext';
import {GetLivesApi} from '@/api/GameLives/GetLivesApi';
import ToastRequest from '@/components/toast';
import FullViewMessageRacket from '@/components/full-view-message-racket';
import { getUpcomingGamesApi } from '@/api/games/GetUpcomingGamesApi';
import { Spinner } from '@/components/Spinner';
import { SCREEN_WIDTH } from '@gorhom/bottom-sheet';
import { RefreshControl } from 'react-native-gesture-handler';
import UpcomingMatchesList from './components/upcoming-matches-list';

interface HomeScreenProps {
  navigation: any;
}

export type MatchParticipant = {
  id: string;
  username: string;
  name: string;
  profilePicture: string;
};

export type HomeMatchCard = {
  id: string;
  imageUrl: string;
  users: MatchParticipant[];
  clubName: string;
  floor: string;
  clubId?: string;
  viewers?: number;
  badgeLabel?: string;
  badgeColor?: string;
  badgeSubLabel?: string;
  previewMode?: 'video' | 'versus';
  startsIn?: string;
  isLive: boolean;
  startAt?: string;
};

function HomeScreen(props: HomeScreenProps): React.JSX.Element | null {
  const [typeStatusError, setTypeStatusError] = useState<any>(null);
  const {firebaseUser, getAccessToken} = useAuth();
  const [count, setcount] = useState<number>(1);
  const [exitShow, setExitShot] = useState<boolean>(false);
  const insets = useSafeAreaInsets();

  type HomeSection = {id?: string, title: string; data: HomeMatchCard[]};

  const [dataHome, setDataHome] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingUpcomingGames, setLoadingUpcomingGames] = useState(true);
  const [upcomingGames, setUpcomingGames] = useState<HomeMatchCard[]>([]);

  useEffect(() => {
    if (!firebaseUser) {
      props.navigation.navigate('screens.login');
    }
  }, [firebaseUser, props.navigation]);

  useFocusEffect(() => {
    const exitApp = () => {
      setcount(count + 1);
      if (count === 1) {
        setExitShot(true);
        setTimeout(() => {
          setExitShot(false);
          setcount(1);
        }, 5000);
      }
      if (count === 2) {
        setcount(1);
        BackHandler.exitApp();
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      exitApp,
    );
    return () => backHandler.remove();
  });

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      getDataHome();
      setLoading(false);
    }, []),
  );

  const getUpcomingGames = async () => {
    if (!firebaseUser?.uid) {
      return;
    }

    setLoadingUpcomingGames(true);

    try {
      const token = await getAccessToken();
      const res = await getUpcomingGamesApi(token, firebaseUser.uid);
      const data = res.data
        .map((game) => createHomeMatchCard(game))
        .sort((a, b) => {
          // Ordenar por fecha: la más cercana primero
          const dateA = a.startAt ? new Date(a.startAt).getTime() : 0;
          const dateB = b.startAt ? new Date(b.startAt).getTime() : 0;
          return dateA - dateB;
        });

      setUpcomingGames(data);
    } catch (error) {
      // No mostrar error si es un error de red o desconexión, solo loguear
      // El banner simplemente no se mostrará si no hay datos
      setUpcomingGames([]);
    } finally {
      setLoadingUpcomingGames(false);
    }
  }

  const formatTimeUntil = (scheduledDate: string): string => {
    const now = new Date();
    const scheduled = new Date(scheduledDate);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 7) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? 'En 1sem' : `En ${weeks}sem`;
    } else if (diffDays > 0) {
      return diffDays === 1 ? 'En 1d' : `En ${diffDays}d`;
    } else if (diffHours > 0) {
      return diffHours === 1 ? 'En 1h' : `En ${diffHours}h`;
    } else if (diffMinutes > 0) {
      return diffMinutes === 1 ? 'En 1min' : `En ${diffMinutes}min`;
    } else {
      return 'Pronto';
    }
  };

  const createHomeMatchCard = (game: UpcomingGameData): HomeMatchCard => {
    const startAt = new Date(game.scheduledStartAt).toISOString();
    const timeUntil = formatTimeUntil(game.scheduledStartAt);
    
    return {
      id: game.id,
      imageUrl:
        'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=60',
      users: game.gamePlayers.map((player) => ({
        id: player.userId,
        username: player.user.username,
        name: player.user.name,
        profilePicture: player.user.profilePicture,
      })),
      clubName: game.camera.cameraConfig.user?.name || 'Club',
      floor: game.camera.cameraConfig.name || 'N/A',
      clubId: game.camera.cameraConfig.user?.id || 'club-palermo',
      badgeLabel: 'Próximamente',
      badgeColor: colors.secondary,
      badgeSubLabel: timeUntil,
      previewMode: 'versus',
      isLive: false,
      startAt,
    };
  }

  const getDataHome = async () => {
    if (!loading) {
      setRefreshing(true);
    }
    getUpcomingGames();

    try {
      const accessToken = await getAccessToken();
      const res = await GetLivesApi(accessToken);
      console.log('live',res)
      if (res.length > 0) {
        const liveMatches: HomeMatchCard[] = res.map((item) => ({
          id: item.id,
          imageUrl:
            item?.cover ||
            'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1170&q=80',
          users: item.gamePlayers.map<MatchParticipant>(u => ({
            id: u.user.id,
            username: u.user.username,
            name: u.user.name ?? u.user.username,
            profilePicture: u.user.profilePicture,
          })),
          clubName:
            item?.club?.name ||
            item?.camera?.cameraConfig?.user?.name ||
            item?.camera?.cameraConfig?.user?.username ||
            'Club sin nombre',
          floor: item?.club?.floor || 'Cancha',
          clubId:
            item?.camera?.cameraConfig?.user?.id ??
            item?.club?.id ??
            undefined,
          viewers: item.viewers || 0,
          badgeLabel: 'EN VIVO',
      badgeColor: colors.danger,
          previewMode: 'versus',
          isLive: true,
        }));

        const sections: HomeSection[] = [];
        if (liveMatches.length > 0) {
          sections.push({title: 'Partidas en vivo', data: liveMatches});
        }

        setDataHome(sections);
      } else {
        setDataHome([]);
      }
    } catch (error: any) {
      setTypeStatusError({error});
    } finally {
      setRefreshing(false);
    }
  };

  type CardPressPayload =
    | {type: 'match'; matchId: string}
    | {type: 'club'; clubId: string}
    | {type: 'upcoming'; match: HomeMatchCard};

  const handleOnPress = (payload: CardPressPayload) => {
    if (payload.type === 'club') {
      props.navigation.navigate('screens.club', {clubId: payload.clubId});
      return;
    }

    if (payload.type === 'match') {
      props.navigation.navigate('screens.gameScreen', {
        gameId: payload.matchId,
      });
      return;
    }

    if (payload.type === 'upcoming') {
      props.navigation.navigate('screens.matchPreview', {
        match: payload.match,
      });
    }
  };

  const renderList = useCallback(() => {
    return dataHome.some(section => section.data.length > 0);
  }, [dataHome]);

  const formatUsers = useCallback(
    (players: MatchParticipant[]) => {
      const currentUserId = firebaseUser?.uid;

      if (!currentUserId) {
        return players;
      }

      const others: MatchParticipant[] = [];
      let currentUser: MatchParticipant | null = null;

      players.forEach(player => {
        if (player.id === currentUserId) {
          currentUser = player;
        } else {
          others.push(player);
        }
      });

      if (currentUser) {
        others.push(currentUser);
      }

      return others;
    },
    [firebaseUser?.uid],
  );

  const renderItem = ({item}: any) => {
    const match = item as HomeMatchCard;
    const isUpcoming = !match.isLive;
    const badgeLabel = isUpcoming
      ? match.badgeSubLabel ?? match.badgeLabel
      : match.badgeLabel;
    const badgeColor = isUpcoming ? '#FFB347' : match.badgeColor;

    return (
      <MatchCard
        id={match.id}
        imageUrl={match.imageUrl}
        viewers={match.viewers}
        users={formatUsers(match.users)}
        clubName={match.clubName}
        floor={match.floor}
        clubId={match.clubId}
        onPress={handleOnPress}
        showVideoPlayer={false}
        previewMode={match.previewMode ?? 'versus'}
        currentUserId={firebaseUser?.uid ?? null}
        badgeLabel={badgeLabel}
        badgeColor={badgeColor}
        badgeSubLabel={isUpcoming ? undefined : match.badgeSubLabel}
        isLive={match.isLive}
        startsIn={match.startsIn}
        startAt={match.startAt}
      />
    );
  };

  // useEffect(() => {
  //   let lenght = 0;
  //   home.forEach(h => {
  //     h.data.forEach(() => {
  //       lenght + 1;
  //     });
  //   });

  //   matchRefs.current = Array(lenght).fill(null);
  // }, []);

  const emptyComponent = (
    <>
      {!loading && (
        <FullViewMessageRacket message="No hay transmisiones en vivo en este momento" />
      )}
    </>
  );

  const containerStyles = {
    flex: 1,
    // gap: 2,
    // Paddings to handle safe area
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <>
      <View style={containerStyles}>
        {exitShow && <ToastLogaOut topPercentage={'88%'} />}
        <CustomHeader boolImageTorna />

        <TouchableOpacity
          style={styles.videoEditorButton}
          onPress={() => props.navigation.navigate('screens.videoEditor')}
          activeOpacity={0.8}>
          <Text style={styles.videoEditorButtonText}>Editor de Video B2</Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={[
            renderList() ? styles.listContainer : styles.flex,
            { paddingBottom: insets.bottom + 20 }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || loading}
              onRefresh={getDataHome}
              enabled={!refreshing && !loading}
            />
          }
        >
          {/* Upcoming Games */}
          {
            !loading && <UpcomingMatchesList loading={loadingUpcomingGames} upcomingMatches={upcomingGames} handleOnPress={handleOnPress} />
          }
          

          {/* Home Data */}
          {
            loading && <Spinner />
          }
          {
            !loading && dataHome.length === 0
              ? emptyComponent
              : (
                dataHome.map((section: HomeSection) => (
                  <View key={section.id || section.title}>
                    <Heading style={styles.headings} marginVertical="$3">
                      {section.title}
                    </Heading>
                    
                    {/* Match Cards */}
                    <View>
                      {
                        section.data.map((card, index) => (
                          <View key={card.id}>{renderItem({item: card, section, index})}</View>
                        ))
                      }
                    </View>
                  </View>
                ))
              )
          }
        </ScrollView>

        {/* <SectionList
          sections={dataHome}
          renderItem={renderItem}
          stickySectionHeadersEnabled={false}
          keyExtractor={item => (item as HomeMatchCard).id}
          contentContainerStyle={
            renderList() ? styles.listContainer : styles.flex
          }
          renderSectionHeader={({section}: any) => (
            <Heading style={styles.headings} marginVertical="$3">
              {(section as HomeSection).title}
            </Heading>
          )}
          refreshing={refreshing}
          onRefresh={getDataHome}
          ListEmptyComponent={emptyComponent}
        /> */}
        {/* {!renderList() && (
          <FullViewMessageRacket message="No hay transmisiones en vivo en este momento" />
        )} */}
      </View>
      {typeStatusError && (
        <ToastRequest status={typeStatusError} topPercentage={'80%'} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    marginVertical: 30,
    backgroundColor: colors.background,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  headings: {
    color: colors.neutral800,
    fontSize: 20,
  },
  upcomingList: {
    gap: 8,
    backgroundColor: colors.background,
  },
  videoEditorButton: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  videoEditorButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  horizontalMatchCard: {
    width: SCREEN_WIDTH * 0.8,
    minWidth: 250,
  },
});

export default HomeScreen;
