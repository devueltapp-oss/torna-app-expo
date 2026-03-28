/* eslint-disable @typescript-eslint/no-explicit-any */
import {Text, View} from '@gluestack-ui/themed';
import {FlatList, ListRenderItem, ScrollView, Share, StyleSheet, TouchableOpacity} from 'react-native';
import {useCallback, useRef, useState, useEffect, useMemo} from 'react';
import {BottomSheetFlatList, BottomSheetModal} from '@gorhom/bottom-sheet';
import {useFocusEffect} from '@react-navigation/native';

import ProfileBanner from '../profile-banner';

import Popup from './../../components/popup/Popup';

import {MatchTile} from '@/components/match-tile';
import {colors} from '@/config/theme';
import {GetStatsMeResponse, MatchPost, UserResponse} from '@/config/types';
import CustomBottomSheet from '@/components/custom-bottom-sheet';
import {User} from '@/config/types';
import UserItem from '@/components/user-item';
import {useAuth} from '@/contexts/authContext';
import {GetApiFollowing} from '@/api/Following/GetApiFollowing';
import {GetApiFollowers} from '@/api/Followers/GetApiFollowers';
import {Spinner} from '@/components/Spinner';
import ToastRequest from '@/components/toast';
import FullViewMessage from '@/components/full-view-message';
import {getUserById} from '@/api/users';
import {useProfileCache} from '@/utils/apiCache';
import {useProfileRefresh} from '@/contexts/profileRefreshContext';
import {getApiPlayerRecentGames} from '@/api/Profile/GetApiPlayerRecentGames';
import {msToHhmmss, timeAgo} from '@/utils';
import StyledTabView from '@/components/styled-tab-view';
import { getMyStatsApi } from '@/api/Stats/GetMyStatsApi';
import { useNavigation } from '@react-navigation/native';
import { MainNavigatorParamList } from '@/navigators/main-navigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getMyHighlightsApi, getHighlightsApi, Highlight } from '@/api/highlights';
import { MyHighlightsList } from '@/components/my-highlights-list';

interface ProfileViewProps {
  userId: string;
  showEditProfileButton?: boolean;
  getUserData?: (token: string) => Promise<UserResponse>;
  userDataCallback?: (data: UserResponse) => void;
  showFollowButton?: boolean;
  isFollowing?: boolean;
  forceRefresh?: boolean; // Nueva prop para forzar refresh
  /** When true, this is the current user's own profile — allows toggle+delete on highlights */
  isOwnProfile?: boolean;
}

const DEFAULT_MATCH_COVER =
  'https://images.unsplash.com/photo-1567220720374-a67f33b2a6b9?q=80&w=2664&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

const recentPerformanceStatsMock = [
  {label: 'Ranking Semanal', value: '#12'},
  {label: 'Club Favorito', value: 'Club Smashers'},
];

const seasonTotalsStatsMock = [
  {label: 'Número de partidas', value: 128},
  {label: 'Ganadas', value: 82},
];

const ProfileView = ({
  userId,
  getUserData,
  showEditProfileButton = true,
  userDataCallback,
  showFollowButton = false,
  isFollowing = false,
  forceRefresh = false,
  isOwnProfile = true,
}: ProfileViewProps) => {
  const [profileData, setProfileData] = useState<UserResponse>(); // Adjust the type according to the data structure
  const {setPopupShow, popupShow, getAccessToken} = useAuth();
  const {fetchProfileData, invalidateProfileCache, isLoading: cacheLoading} = useProfileCache();
  const {shouldRefreshProfile, clearProfileRefresh} = useProfileRefresh();
  const [showPopup, setShowPopup] = useState(false);
  const [players, setPlayers] = useState<User[]>([]);
  const [followers, setFollowers] = useState<number>();
  const [following, setFollowing] = useState<number>();
  const [loaded, setLoaded] = useState<boolean>(true);
  const [typeStatusError, setTypeStatusError] = useState<any>(null);
  const [posts, setPosts] = useState<MatchPost[]>([]);
  const [userStats, setUserStats] = useState<GetStatsMeResponse>();
  const [loadingUserStats, setLoadingUserStats] = useState<boolean>(true);
  const [myHighlights, setMyHighlights] = useState<Highlight[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState<boolean>(false);
  const navigation = useNavigation<NativeStackNavigationProp<MainNavigatorParamList>>();

  const customBottomSheet = useRef<BottomSheetModal>(null);

  const getNumbersFollowers = async (token: string) => {
    try {
      const res = await GetApiFollowers(token, userId);
      setFollowers(res.total);
    } catch (error) {
      if (error === 404) {
        setFollowers(0);
      } else {
        setTypeStatusError({error});
      }
    }
  };

  const getNumbersFollowing = async (token: string) => {
    try {
      const res = await GetApiFollowing(token, userId);
      setFollowing(res.total);
    } catch (error) {
      if (error === 404) {
        setFollowing(0);
      } else {
        setTypeStatusError({error});
      }
    }
  };

  const getMyStats = async (token: string) => {
    setLoadingUserStats(true);

    try {
      const res = await getMyStatsApi(token);
      setUserStats(res);
    } catch (error) {
      setTypeStatusError({error: 'No se pudieron obtener las estadísticas del perfil'});
    } finally {
      setLoadingUserStats(false);
    }
  }

  const loadMyHighlights = async (token: string) => {
    setLoadingHighlights(true);
    try {
      // Own profile: fetch all (including disabled). Other profile: only enabled ones.
      const data = isOwnProfile
        ? await getMyHighlightsApi(token)
        : await getHighlightsApi(token, {userId});
      setMyHighlights(data);
    } catch {
      // Non-blocking — silently skip highlights on error
    } finally {
      setLoadingHighlights(false);
    }
  };

  const loadRecentActivity = async (
    token: string,
    targetUserId: string,
    profile?: UserResponse,
  ) => {
    try {
      const response = await getApiPlayerRecentGames(token, targetUserId);
      
      // Ordenar: primero los que tienen video pero no clips, luego el resto
      // const sortedGames = [...response].sort((a, b) => {
      //   const aHasVideoNoClips = a.recordingUrl && !a.hasClips;
      //   const bHasVideoNoClips = b.recordingUrl && !b.hasClips;
        
      //   if (aHasVideoNoClips && !bHasVideoNoClips) return -1;
      //   if (!aHasVideoNoClips && bHasVideoNoClips) return 1;
      //   return 0; // Mantener orden original para el resto
      // });
      
      const mappedPosts = response.slice(0, 10).map(game => {
        const duration =
          typeof game.durationInSeconds === 'number' &&
          game.durationInSeconds > 0
            ? msToHhmmss(game.durationInSeconds * 1000)
            : undefined;

        const users: User[] = game.players.map(player => ({
          id: player.id,
          username: player.username,
          name: player.name || player.username,
          following: player.following ?? false,
          avatarUrl: player.profilePicture || '',
        }));

        const imageUrl =
          game.cover ||
          profile?.frontPage ||
          profile?.profilePicture ||
          DEFAULT_MATCH_COVER;

        return {
          id: game.id,
          imageUrl,
          caption: game.court
            ? `Partido en ${game.court}`
            : 'Partido finalizado',
          timeAgo: timeAgo(game.createdAt),
          duration,
          users,
        };
      });
      setPosts(mappedPosts);
    } catch (error) {
      console.log('Error loading recent activity:', error);
      if (error === 404) {
        setPosts([]);
      } else {
        setTypeStatusError({error});
        setPosts([]);
      }
    }
  };

  // Fetch profile data with cache
  const getDataProfile = async (forceRefresh: boolean = false) => {
    try {
      setLoaded(true);
      console.log('🔄 Starting profile data fetch, forceRefresh:', forceRefresh);
      
      const fetchFunction = getUserData || ((token: string) => getUserById(userId, token));
      
      const resDataProfile = await fetchProfileData(
        userId,
        fetchFunction,
        getAccessToken,
        forceRefresh
      );
      
      console.log('📦 Profile data received:', resDataProfile ? 'Yes' : 'No');
      
      if (!resDataProfile) {
        console.warn('⚠️ No profile data received');
        setTypeStatusError({error: 'No se pudieron obtener los datos del perfil'});
        setLoaded(false);
        return;
      }

      // Validar que el perfil tenga un ID válido
      const profileId = resDataProfile.id || resDataProfile.userId || userId;
      
      if (!profileId) {
        console.error('❌ Error: No se pudo obtener el ID del perfil');
        console.error('📊 Datos del perfil recibidos:', JSON.stringify(resDataProfile, null, 2));
        setTypeStatusError({error: 'Error al obtener datos del perfil'});
        setLoaded(false);
        return;
      }

      console.log('✅ Perfil obtenido con ID:', profileId);
      
      // Establecer profileData primero para que se muestre inmediatamente
      setProfileData(resDataProfile);
      console.log('✅ Profile data set in state');

      // Obtener token y cargar datos adicionales en paralelo
      const accessToken = await getAccessToken();

      // Cargar datos adicionales en paralelo (no bloquear si fallan)
      Promise.all([
        getNumbersFollowers(accessToken),
        getNumbersFollowing(accessToken),
        loadRecentActivity(accessToken, profileId, resDataProfile),
        getMyStats(accessToken),
        loadMyHighlights(accessToken),
      ]).catch(error => {
        console.warn('⚠️ Error loading additional profile data:', error);
        // No fallar completamente si hay error en datos adicionales
      });

      if (userDataCallback) {
        userDataCallback(resDataProfile);
      }
      
      console.log('✅ Profile data fetch completed');
    } catch (error) {
      console.error('❌ Error fetching profile data:', error);
      setTypeStatusError({error});
    } finally {
      console.log('🔄 Setting loaded to false');
      setLoaded(false);
    }
  };

  // Handle the profile data fetch on component mount
  useFocusEffect(
    useCallback(() => {
      const shouldForceRefresh = forceRefresh || shouldRefreshProfile;
      getDataProfile(shouldForceRefresh);
      
      // Clear refresh flag if it was triggered
      if (shouldRefreshProfile) {
        clearProfileRefresh();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forceRefresh, shouldRefreshProfile]),
  );

  // Handle popup visibility logic
  useEffect(() => {
    if (popupShow) {
      setShowPopup(true); // Show the popup
      const timer = setTimeout(() => {
        setShowPopup(false); // Hide the popup after 2 seconds (2000ms)
        setPopupShow(false);
      }, 2200);
      return () => clearTimeout(timer); // Clean up the timer
    }
  }, [popupShow, setPopupShow]);

  const handleOnUserItemPress = () => {
    customBottomSheet.current?.dismiss();
  };

  const handleOnPressPlayers = (users: User[]) => {
    customBottomSheet.current?.present();
    setPlayers(users);
  };

  const handleInviteFriend = async () => {
    try {
      await Share.share({
        message:
          '¡Te reto a un partido en Torna! Descarga la app y únete a mi red deportiva.',
      });
    } catch (error) {
      console.log('Error sharing invite:', error);
    }
  };

  const routes = useMemo(
    () => [
      {key: 'stats', title: 'Mis estadísticas'},
      {key: 'matches', title: 'Mis partidas'},
      {key: 'highlights', title: 'Mis Highlights'},
    ],
    [],
  );

  const recentPerformanceStats = useMemo(
    () => recentPerformanceStatsMock,
    [],
  );
  const seasonTotalsStats = useMemo(() => seasonTotalsStatsMock, []);

  const handleMatchPress = useCallback(
    (gameId: string) => {
      navigation.navigate('screens.highlightEditor', {
        gameId,
      });
    },
    [navigation],
  );

  const renderItem: ListRenderItem<MatchPost> = useCallback(
    ({item}) => (
      <MatchTile
        gameId={item.id}
        imageUrl={item.imageUrl}
        caption={item.caption}
        timestamp={item.timeAgo}
        duration={item.duration}
        users={item.users}
        handleOnPressPlayers={handleOnPressPlayers}
        onPress={handleMatchPress}
      />
    ),
    [handleOnPressPlayers, handleMatchPress],
  );

  const keyExtractor = useCallback((item: MatchPost) => item.id, []);

  const renderListHeader = useCallback(
    () => (
      <Text style={styles.sectionTitle} bold>
        Actividad reciente
      </Text>
    ),
    [],
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle} bold>
          Aún no hay actividad reciente
        </Text>
        <Text style={styles.emptySubtitle}>
          Cuando juegues o transmitas, tus partidos aparecerán aquí.
        </Text>
      </View>
    ),
    [],
  );

  const renderPlayers: ListRenderItem<User> = useCallback(
    ({item}) => <UserItem user={item} onPress={handleOnUserItemPress} />,
    [],
  );

  const renderScene = useCallback(
    ({route}: {route: {key: string}}) => {
      switch (route.key) {
        case 'stats': {
          // Calcular victorias y derrotas desde los datos
          const statsArray = Array.isArray(seasonTotalsStats) ? seasonTotalsStats : [];
          const winsValue = statsArray.find(s => s?.label === 'Ganadas')?.value;
          const totalGamesValue = statsArray.find(s => s?.label === 'Número de partidas')?.value;
          
          const wins = typeof winsValue === 'number' && winsValue >= 0 ? winsValue : 0;
          const totalGames = typeof totalGamesValue === 'number' && totalGamesValue >= 0 ? totalGamesValue : 0;
          const losses = Math.max(0, totalGames - wins);
          
          let winRate = '0.0';
          if (totalGames > 0 && wins >= 0 && wins <= totalGames) {
            winRate = ((wins / totalGames) * 100).toFixed(1);
          }

          if (loadingUserStats) {
            return (
              <View style={styles.statsContentContainer}>
                <Spinner />
              </View>
            );
          }

          if (!userStats) {
            return (
              <View style={styles.contentCenter}>
                <Text style={styles.statsErrorMessage} bold>
                  Ha ocurrido un error al obtener las estadísticas de usuario, intenta más tarde.
                </Text>
              </View>
            );
          }
          
          return (
            <ScrollView
              style={styles.sceneContainer}
              contentContainerStyle={styles.statsContentContainer}
              showsVerticalScrollIndicator={false}>
              {/* Sección destacada: % de Efectividad como Main Topic */}
                {
                  userStats.wins === 0 && userStats.losses === 0
                    ? (
                      <View style={styles.contentCenter}>
                        <Text style={styles.infoMessage} bold>Juega más partidas para determinar tu efectividad!</Text>
                      </View>
                    ) : (

                      <View style={styles.mainStatsCard}>
                        <View style={styles.mainStatsEffectivenessContainer}>
                          <Text style={styles.mainStatsEffectivenessValue} bold>
                            {userStats.winRate * 100}%
                          </Text>
                          <Text style={styles.mainStatsEffectivenessLabel}>
                            Efectividad
                          </Text>
                        </View>
                        <View style={styles.mainStatsContent}>
                          <View style={styles.mainStatsItem}>
                            <Text style={styles.mainStatsValue} bold>
                              {userStats.wins}
                            </Text>
                            <Text style={styles.mainStatsLabel}>Victorias</Text>
                          </View>
                          <View style={styles.mainStatsDivider} />
                          <View style={styles.mainStatsItem}>
                            <Text style={styles.mainStatsValue} bold>
                              {userStats.losses}
                            </Text>
                            <Text style={styles.mainStatsLabel}>Derrotas</Text>
                          </View>
                        </View>
                      </View>
                    )
                }
              
              <Text style={styles.statsTitle} bold>
                Rendimiento reciente
              </Text>
              <View style={styles.performanceList}>
                {
                  userStats.rankingWeekly !== null && userStats.rankingWeekly > 0
                    ? (
                      <>
                        <View style={styles.performanceRow}>
                          <Text style={styles.performanceLabel}>Ranking semanal</Text>
                          <Text style={styles.performanceValue} bold>
                            #{userStats.rankingWeekly}
                          </Text>
                        </View>
                        {userStats.favoriteClub.name && (
                          <View style={styles.performanceRow}>
                            <Text style={styles.performanceLabel}>Club Favorito</Text>
                            <Text style={styles.performanceValue} bold>
                              {userStats.favoriteClub.name}
                            </Text>
                          </View>
                        )}
                      </>
                    )
                    : (
                      <View style={styles.performanceRow}>
                        <Text style={styles.performanceLabelMessage}>No tienes partidas registradas esta semana</Text>
                      </View>
                    )
                }
              </View>
              <View style={styles.statsTitleContainer}>
                <Text style={styles.statsTitle} bold>
                  Totales de la temporada
                </Text>
              </View>
              <View style={styles.statsContainer}>
                {
                  userStats.seasonTotals.matches > 0
                    ? (
                      <>
                        {/* Total matches */}
                        <View style={styles.statCard}>
                          <Text style={styles.statValue} bold>
                            {userStats.seasonTotals.matches}
                          </Text>
                          <Text style={styles.statLabel}>Número de Partidas</Text>
                        </View>

                        {/* Winned matches */}
                        <View style={styles.statCard}>
                          <Text style={styles.statValue} bold>
                            {userStats.seasonTotals.wins}
                          </Text>
                          <Text style={styles.statLabel}>Ganadas</Text>
                        </View>
                      </>
                    )
                    : (
                      <View style={styles.performanceRow}>
                        <Text style={styles.performanceLabelMessage}>No tienes partidas registradas esta última temporada</Text>
                      </View>
                    )
                }
              </View>
            </ScrollView>
          );
        }
        case 'matches':
          return (
            <View style={styles.sceneContainer}>
              <FlatList
                data={posts}
                renderItem={renderItem}
                style={styles.matchTileList}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.matchTileListContainer}
                ListHeaderComponent={posts.length ? renderListHeader : null}
                ListEmptyComponent={renderEmptyComponent}
                showsVerticalScrollIndicator={false}
              />
            </View>
          );
        case 'highlights':
          return (
            <ScrollView
              style={styles.sceneContainer}
              contentContainerStyle={styles.highlightsContentContainer}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle} bold>
                {isOwnProfile ? 'Mis Highlights' : 'Highlights'}
              </Text>
              <MyHighlightsList
                highlights={myHighlights}
                isLoading={loadingHighlights}
                isOwnProfile={isOwnProfile}
                onRefresh={async () => {
                  const token = await getAccessToken();
                  loadMyHighlights(token);
                }}
              />
            </ScrollView>
          );
        default:
          return null;
      }
    },
    [
      followers,
      following,
      posts,
      seasonTotalsStats,
      recentPerformanceStats,
      renderEmptyComponent,
      renderItem,
      renderListHeader,
      keyExtractor,
      myHighlights,
      loadingHighlights,
      getAccessToken,
      isOwnProfile,
    ],
  );

  return (
    <>
      {loaded ? (
        <Spinner />
      ) : (
        <>
          {typeStatusError && (
            <ToastRequest status={typeStatusError} topPercentage={'85%'} />
          )}
          {profileData ? (
            <>
              <ProfileBanner
                userId={profileData.id}
                name={profileData.name}
                username={profileData.username}
                avatarUrl={profileData.profilePicture}
                bio={profileData.description}
                location={profileData.address}
                followings={following ?? 0}
                followers={followers ?? 0}
                optionEditProfileBool={showEditProfileButton}
                navigationFollows={true}
                showFollowButton={showFollowButton}
                isFollowing={isFollowing}
                profileData={profileData}
                onInviteFriend={
                  showEditProfileButton ? handleInviteFriend : undefined
                }
              />
              {showEditProfileButton && (
                <TouchableOpacity
                  style={styles.highlightsButton}
                  onPress={() => navigation.navigate('screens.myHighlights')}
                  activeOpacity={0.75}>
                  <Text style={styles.highlightsButtonText} bold>
                    Mis Highlights
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.tabWrapper}>
                <StyledTabView
                  routes={routes}
                  renderScene={renderScene}
                  numberOfTabs={routes.length}
                  marginHorizontal={16}
                />
              </View>
              <CustomBottomSheet ref={customBottomSheet} title="Jugadores">
                <BottomSheetFlatList
                  data={players}
                  keyExtractor={item => item.username}
                  renderItem={renderPlayers}
                  contentContainerStyle={styles.playersListContainer}
                />
              </CustomBottomSheet>
            </>
          ) : (
            <FullViewMessage message="No se pudo acceder al perfil de este usuario" />
          )}
          {showPopup && <Popup description="Tus datos han sido actualizados" />}
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  playersListContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  tabWrapper: {
    flex: 1,
    backgroundColor: colors.white,
    paddingBottom: 16,
  },
  sceneContainer: {
    flex: 1,
    backgroundColor: colors.white,
    paddingTop: 16,
  },
  statsContentContainer: {
    paddingBottom: 32,
    gap: 20,
    paddingTop: 8,
  },
  highlightsContentContainer: {
    paddingBottom: 32,
    paddingTop: 8,
  },
  performanceList: {
    gap: 12,
    paddingHorizontal: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral100,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  performanceLabelMessage: {
    fontSize: 15,
    color: colors.neutral700,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  performanceLabel: {
    fontSize: 15,
    color: colors.neutral700,
    fontWeight: '500',
  },
  performanceValue: {
    fontSize: 17,
    color: colors.neutral900,
    fontWeight: '600',
  },
  matchTileListContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
    gap: 16,
  },
  matchTileList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.neutral900,
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 16,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.neutral900,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.neutral500,
    textAlign: 'center',
    fontSize: 14,
  },
  statsContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 17,
    color: colors.neutral900,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statsTitleContainer: {
    alignItems: 'center',
  },
  statCard: {
    flexBasis: '47%',
    minWidth: 140,
    backgroundColor: colors.neutral100,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral200,
  },
  statValue: {
    fontSize: 28,
    color: colors.neutral900,
    marginBottom: 6,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '500',
    textAlign: 'center',
  },
  mainStatsCard: {
    backgroundColor: colors.neutral100,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mainStatsTitle: {
    fontSize: 18,
    color: colors.neutral700,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  mainStatsEffectivenessContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral300,
    width: '100%',
  },
  mainStatsEffectivenessValue: {
    fontSize: 64,
    color: colors.neutral900,
    marginBottom: 8,
    fontWeight: '800',
    letterSpacing: -1,
  },
  mainStatsEffectivenessLabel: {
    fontSize: 16,
    color: colors.neutral600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  mainStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 32,
    marginTop: 8,
  },
  mainStatsItem: {
    flex: 1,
    alignItems: 'center',
  },
  mainStatsValue: {
    fontSize: 42,
    color: colors.neutral900,
    marginBottom: 6,
    fontWeight: '700',
  },
  mainStatsLabel: {
    fontSize: 13,
    color: colors.neutral600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '500',
  },
  mainStatsDivider: {
    width: 1,
    height: 70,
    backgroundColor: colors.neutral300,
    opacity: 0.5,
  },
  contentCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
  },
  statsErrorMessage: {
    fontSize: 17,
    color: colors.neutral900,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  infoMessage: {
    fontSize: 17,
    color: colors.primary,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  highlightsButton: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    alignItems: 'center',
  },
  highlightsButtonText: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '600',
  },
});

export default ProfileView;
