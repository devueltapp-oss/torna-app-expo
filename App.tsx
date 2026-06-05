/**
 * Torna app entry. React Navigation stack with role-aware main containers
 * (MainPlayer / MainClub) that swap based on what role logged in. All screens
 * pull data from mocks for now; in production the mocks become hooks
 * (useFeed, useClubProfile, useReservation, etc.).
 *
 * Auth architecture:
 *   - <AuthProvider> wraps everything so useAuth() works in every component.
 *   - While isLoading === true (session restore on mount) → SplashScreen.
 *   - user === null → AuthStack (Login, Register, Pending, CompleteProfile).
 *   - user !== null → AppStack (all the main app screens).
 *   - The role (player vs club) is derived from user.isClub, not from a
 *     separate route param, so the AppStack always lands in the right tab container.
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OneSignal from 'react-native-onesignal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import { ThemeProvider, useTheme } from './theme';
import { AuthProvider, useAuth, type LoginResult } from './contexts/AuthContext';
import {
  LoginScreen, LoginWithRoleScreen, RegisterClubScreen, PendingApprovalScreen,
  CompleteProfileScreen,
  HomeScreen, ClubHomeScreen,
  GamesScreen, GameDetailScreen, CourtsScreen, PlayersScreen, ProfileScreen,
  ClubProfilePlayerView, PlayerProfilePublicView, SearchPlayScreen, GlobalSearchScreen,
  ReserveStep1Screen, ReserveStep2Screen, ReserveStep3Screen, ReserveSuccessScreen, MonoValue,
  VideoEditorScreen,
  PlayerOwnProfileScreen, MyLibraryScreen, PlayerSettingsScreen,
  ReelViewScreen,
  type LoginRole,
  type GameDetailData,
  type ReelSection,
} from './screens';
import { TabId } from './components/BottomTabBar';
import { UploadSheet, type UploadResult } from './components/UploadSheet';
import { FollowListSheet } from './components/FollowListSheet';
import { VideoPreviewModal } from './components/VideoPreviewModal';
import { useOwnMedia } from './hooks/useOwnMedia';
import { useLiveGames } from './hooks/useLiveGames';
import { useOpenGames } from './hooks/useOpenGames';
import {
  MOCK_LIVE_GAMES, MOCK_GAMES_LIST, MOCK_COURTS, MOCK_PLAYERS,
  MOCK_GAME_DETAIL, MOCK_PROFILE, MOCK_UPCOMING_GAMES, MOCK_FEED_POSTS,
  MOCK_CLUB_TODAY,
  MOCK_CLUB_PUBLIC, MOCK_PLAYER_PUBLIC, MOCK_FAKE_PLAYER,
  MOCK_NEARBY, MOCK_INVITABLE_PLAYERS, MOCK_SLOTS,
  MOCK_OWNER, MOCK_MY_MATCHES_V2, MOCK_MY_HIGHLIGHTS_V2, MOCK_MY_UPLOADS,
  MOCK_SEARCHABLE_PLAYERS, MOCK_SEARCHABLE_COURTS,
  type LibraryItem, type LibraryMatch, type LibraryHighlight, type LibraryUpload,
} from './data/mocks';

/* ─────────── Error boundary ─────────── */

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
            Algo salió mal. Por favor reiniciá la app.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/* ─────────── Navigation param lists ─────────── */

/**
 * Auth stack: shown when user is not logged in.
 * CompleteProfile is added here because it sits between social login
 * and landing in the app — the user is authenticated at the Firebase layer
 * but not yet registered in Torna's backend.
 */
type AuthStackParamList = {
  LoginWithRole: undefined;
  Login: undefined;
  Register: undefined;
  Pending: undefined;
  CompleteProfile: {
    idToken: string;
    prefillName?: string;
    prefillEmail?: string;
    authProvider: 'google' | 'apple' | 'facebook';
  };
};

/**
 * App stack: shown once user is authenticated (user !== null).
 */
type AppStackParamList = {
  MainPlayer: undefined;
  MainClub: undefined;
  GameDetail: { gameId: string; clipData?: GameDetailData };
  ClubProfile: { clubId: string };
  PlayerProfile: { playerId: string };
  SearchPlay: undefined;
  GlobalSearch: undefined;
  ReserveCourt: { clubId: string; courtId?: string };
  ReserveTime: { courtId: string };
  ReserveInvite: { courtId: string; date: string; slot: string };
  ReserveOk: { reservationId: string };
  VideoEditor: {
    gameId: string;
    recordingUrl: string;
    durationSeconds: number;
    onHighlightCreated?: (r: {
      streamUrl: string;
      durationSeconds: number;
      title: string;
      visibility: 'public' | 'private';
    }) => void;
  };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack  = createNativeStackNavigator<AppStackParamList>();

/* ─────────── Utilities ─────────── */

function formatDurationLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function clipToGameDetailParams(
  streamUrl: string,
  title: string,
): { gameId: string; clipData: GameDetailData } {
  return {
    gameId: 'clip',
    clipData: {
      id: 'clip',
      court: title || 'Highlight',
      floor: 'HARD',
      club: '', clubHandle: '', clubFollowers: 0,
      time: '', date: '',
      viewers: 0, isLive: false,
      players: [],
      cameras: [{ id: 'c1', number: '01', label: 'Clip', state: 'available', streamUrl }],
    },
  };
}

/* ─────────── Splash (loading state) ─────────── */

function SplashScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

/* ─────────── Auth stack navigator ─────────── */

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="LoginWithRole">
      <AuthStack.Screen name="LoginWithRole">
        {({ navigation }) => (
          <LoginWithRoleScreen
            onLogin={(_role: LoginRole) => {
              // When email/password login succeeds, the AuthProvider has already
              // set user — the Root component will swap stacks automatically.
              // Nothing to navigate here; the split happens in <Root>.
            }}
            onRegister={(role: LoginRole) =>
              navigation.navigate(role === 'club' ? 'Register' : 'LoginWithRole')
            }
            onNeedsRegistration={(result: LoginResult & { status: 'needs_registration' }, provider) => {
              navigation.navigate('CompleteProfile', {
                idToken: result.idToken,
                prefillName: result.name,
                prefillEmail: result.email,
                authProvider: provider,
              });
            }}
          />
        )}
      </AuthStack.Screen>

      <AuthStack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onLogin={() => {
              // Legacy screen — same pattern: AuthProvider handles state
            }}
            onRegister={() => navigation.navigate('Register')}
          />
        )}
      </AuthStack.Screen>

      <AuthStack.Screen name="Register">
        {({ navigation }) => (
          <RegisterClubScreen
            onBack={() => navigation.goBack()}
            onSubmit={() => navigation.replace('Pending')}
          />
        )}
      </AuthStack.Screen>

      <AuthStack.Screen name="Pending">
        {({ navigation }) => (
          <PendingApprovalScreen onHome={() => navigation.replace('LoginWithRole')} />
        )}
      </AuthStack.Screen>

      <AuthStack.Screen name="CompleteProfile">
        {({ navigation, route }) => {
          const { idToken, prefillName, prefillEmail, authProvider } = route.params;
          return (
            <CompleteProfileScreen
              idToken={idToken}
              prefillName={prefillName}
              prefillEmail={prefillEmail}
              authProvider={authProvider}
              onComplete={() => {
                // AuthProvider.register() already set user → Root will
                // switch to AppStack. Nothing to navigate here.
              }}
              onBack={() => navigation.goBack()}
            />
          );
        }}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

/* ─────────── Main tabs · PLAYER ─────────── */

function MainPlayer({ navigation }: any) {
  const [tab, setTab] = React.useState<TabId>('home');
  const [reelSection, setReelSection] = React.useState<ReelSection | null>(null);
  const [reelInitialIndex, setReelInitialIndex] = React.useState(0);
  const [profileView, setProfileView] = React.useState<'profile' | 'library' | 'settings'>('profile');
  const [refreshing, setRefreshing] = useState(false);

  // Partidas en vivo reales (GET /game/live). Fallback a mocks si está vacío
  // (p. ej. login de dev sin token Firebase, o sin seguidos en vivo).
  const { liveGames: liveGamesApi, refresh: refreshLive } = useLiveGames();
  const liveGames = liveGamesApi.length > 0 ? liveGamesApi : MOCK_LIVE_GAMES;

  // Partidas abiertas reales (GET /game/open) para postularse.
  const { openGames, refresh: refreshOpen } = useOpenGames();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshLive(),
      refreshOpen(),
      new Promise<void>((r) => setTimeout(r, 800)),
    ]);
    setRefreshing(false);
  }, [refreshLive, refreshOpen]);
  const [uploadOpen, setUploadOpen]   = React.useState(false);
  const [previewVideo, setPreviewVideo] = React.useState<{
    url: string; title: string; durationSeconds: number;
  } | null>(null);

  const openPreview = React.useCallback((item: LibraryItem) => {
    if (item.kind === 'match') {
      setPreviewVideo({ url: item.recordingUrl, title: item.title, durationSeconds: item.durationSeconds });
    } else if (item.kind === 'highlight' && item.streamUrl) {
      setPreviewVideo({ url: item.streamUrl, title: item.title, durationSeconds: item.durationSeconds });
    }
  }, []);

  const [matches, setMatches]       = React.useState<LibraryMatch[]>(MOCK_MY_MATCHES_V2);
  const [highlights, setHighlights] = React.useState<LibraryHighlight[]>(MOCK_MY_HIGHLIGHTS_V2);
  const [uploads, setUploads]       = React.useState<LibraryUpload[]>(MOCK_MY_UPLOADS);

  // Real media from backend — replaces mock uploads once API is live
  const { photos: apiPhotos, videos: apiVideos, refresh: refreshMedia } = useOwnMedia();
  const uploadsFromApi: LibraryUpload[] = [...apiPhotos, ...apiVideos].map((m) => ({
    id: m.id,
    kind: (m.kind === 'photo' ? 'upload-photo' : 'upload-video') as 'upload-photo' | 'upload-video',
    title: m.title ?? '',
    isPublic: m.visibility === 'public',
    date: m.createdAt,
  }));
  // Use API uploads when available, fall back to local state (mock or newly added items)
  const effectiveUploads: LibraryUpload[] = uploadsFromApi.length > 0 ? uploadsFromApi : uploads;

  const toggleVisibility = (item: LibraryItem) => {
    if (item.kind === 'match')          setMatches(xs    => xs.map(x => x.id === item.id ? { ...x, isPublic: !x.isPublic } : x));
    else if (item.kind === 'highlight') setHighlights(xs => xs.map(x => x.id === item.id ? { ...x, isPublic: !x.isPublic } : x));
    else                                setUploads(xs    => xs.map(x => x.id === item.id ? { ...x, isPublic: !x.isPublic } : x));
  };

  const handleUpload = (r: UploadResult) => {
    setUploadOpen(false);
    // Refresh real media from API after a successful upload
    refreshMedia();
    const id = (r.kind === 'highlight' ? 'H-' : 'U-') + Math.random().toString(36).slice(2, 6).toUpperCase();
    if (r.kind === 'highlight') {
      setHighlights(xs => [{
        id, kind: 'highlight', title: r.title || 'Highlight sin título',
        durationSeconds: 24, durationLabel: '0:24', date: 'Recién', isPublic: r.visibility === 'public',
      }, ...xs]);
    } else {
      setUploads(xs => [{
        id, kind: r.kind === 'photo' ? 'upload-photo' : 'upload-video',
        title: r.title || (r.kind === 'photo' ? 'Foto sin título' : 'Video sin título'),
        durationSeconds: r.kind === 'video' ? 38 : undefined,
        durationLabel:   r.kind === 'video' ? '0:38' : undefined,
        date: 'Recién', isPublic: r.visibility === 'public',
      }, ...xs]);
    }
  };

  const { logout } = useAuth();

  const handleTab = (id: TabId) => {
    setReelSection(null);
    if (id === 'search') {
      navigation.navigate('SearchPlay');
      return;
    }
    setTab(id);
    if (id === 'profile') setProfileView('profile');
  };

  function renderTabContent() {
    switch (tab) {
      case 'home':
        if (reelSection !== null) {
          return (
            <ReelViewScreen
              section={reelSection}
              liveGames={liveGames}
              upcomingGames={MOCK_UPCOMING_GAMES}
              feedPosts={MOCK_FEED_POSTS}
              onBack={() => setReelSection(null)}
              onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id })}
              activeTab="home"
              onChangeTab={handleTab}
              initialIndex={reelInitialIndex}
            />
          );
        }
        return (
          <HomeScreen
            greeting="Maxi"
            liveGames={liveGames}
            upcomingGames={MOCK_UPCOMING_GAMES}
            openGames={openGames}
            feedPosts={MOCK_FEED_POSTS}
            activeTab="home" onChangeTab={handleTab}
            onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id })}
            onOpenSearch={() => navigation.navigate('GlobalSearch')}
            onVerMas={(section, idx) => { setReelInitialIndex(idx ?? 0); setReelSection(section); }}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onOpenPlayerProfile={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
            invitablePlayers={MOCK_INVITABLE_PLAYERS}
          />
        );
      case 'games':
        return (
          <GamesScreen games={MOCK_GAMES_LIST} activeTab="games" onChangeTab={handleTab} role="player"
            emptyImage={require('./assets/racket.png')}
            onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id })}
          />
        );
      case 'players':
        return <PlayersScreen players={MOCK_PLAYERS} activeTab="players" onChangeTab={handleTab} role="player" onOpenPlayerProfile={(id) => navigation.navigate('PlayerProfile', { playerId: id })} />;
      case 'profile': {
        if (profileView === 'settings') {
          return (
            <PlayerSettingsScreen
              owner={MOCK_OWNER}
              onBack={() => setProfileView('profile')}
              onSignOut={async () => {
                await logout();
                // AuthProvider clears user → Root switches to AuthStack automatically
              }}
              activeTab="profile" onChangeTab={handleTab}
            />
          );
        }
        if (profileView === 'library') {
          return (
            <>
              <MyLibraryScreen
                matches={matches} highlights={highlights} uploads={effectiveUploads}
                onBack={() => setProfileView('profile')}
                onOpenUpload={() => setUploadOpen(true)}
                onCreateHighlight={(m) => navigation.navigate('VideoEditor', {
                  gameId: m.id,
                  recordingUrl: m.recordingUrl,
                  durationSeconds: m.durationSeconds,
                  onHighlightCreated: (result) => {
                    setHighlights(prev => [{
                      id: 'H-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
                      kind: 'highlight' as const,
                      title: result.title || 'Highlight',
                      durationSeconds: result.durationSeconds,
                      durationLabel: formatDurationLabel(result.durationSeconds),
                      date: 'Recién',
                      isPublic: result.visibility === 'public',
                      streamUrl: result.streamUrl || undefined,
                    }, ...prev]);
                  },
                })}
                onToggleVisibility={toggleVisibility}
                onOpenItem={openPreview}
                activeTab="profile" onChangeTab={handleTab}
              />
              <UploadSheet
                visible={uploadOpen}
                onClose={() => setUploadOpen(false)}
                onConfirm={handleUpload}
              />
            </>
          );
        }
        return (
          <PlayerOwnProfileScreen
            owner={MOCK_OWNER}
            matches={matches} highlights={highlights} uploads={effectiveUploads}
            onOpenLibrary={() => setProfileView('library')}
            onOpenSettings={() => setProfileView('settings')}
            onOpenItem={openPreview}
            activeTab="profile" onChangeTab={handleTab}
          />
        );
      }
      default:
        return null;
    }
  }

  return (
    <>
      {renderTabContent()}
      <VideoPreviewModal
        visible={!!previewVideo}
        url={previewVideo?.url ?? ''}
        title={previewVideo?.title ?? ''}
        durationSeconds={previewVideo?.durationSeconds ?? 0}
        onClose={() => setPreviewVideo(null)}
      />
    </>
  );
}

/* ─────────── Main tabs · CLUB ─────────── */

function MainClub({ navigation }: any) {
  const [tab, setTab] = React.useState<TabId>('home');
  const { logout } = useAuth();

  switch (tab) {
    case 'home':
      return (
        <ClubHomeScreen
          clubName="Club Pádel BSAS"
          liveGames={MOCK_LIVE_GAMES}
          todayReservations={MOCK_CLUB_TODAY}
          activeTab="home" onChangeTab={setTab}
          onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id })}
        />
      );
    case 'games':
      return (
        <GamesScreen games={MOCK_GAMES_LIST} activeTab="games" onChangeTab={setTab} role="club"
          emptyImage={require('./assets/racket.png')}
          onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id })}
        />
      );
    case 'courts':
      return <CourtsScreen courts={MOCK_COURTS} activeTab="courts" onChangeTab={setTab} role="club" />;
    case 'players':
      return <PlayersScreen players={MOCK_PLAYERS} activeTab="players" onChangeTab={setTab} role="club" />;
    case 'profile':
      return (
        <ProfileScreen
          profile={MOCK_PROFILE}
          activeTab="profile"
          onChangeTab={setTab}
          role="club"
        />
      );
    default:
      return null;
  }
}

/* ─────────── App stack navigator ─────────── */

function AppNavigator() {
  const { user } = useAuth();
  // Derive initial route from the authenticated user's role
  const initialRoute: keyof AppStackParamList = user?.isClub ? 'MainClub' : 'MainPlayer';

  return (
    <AppStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      {/* Main tab containers */}
      <AppStack.Screen name="MainPlayer" component={MainPlayer} />
      <AppStack.Screen name="MainClub"   component={MainClub} />

      {/* Game detail */}
      <AppStack.Screen name="GameDetail">
        {({ navigation, route }) => {
          const [following, setFollowing] = React.useState(false);
          const game: GameDetailData = route.params?.clipData ?? MOCK_GAME_DETAIL;
          const isClip = !!route.params?.clipData;
          return (
            <GameDetailScreen
              game={game}
              isFollowing={following}
              onToggleFollow={() => setFollowing(f => !f)}
              onBack={() => navigation.goBack()}
              onCreateHighlight={isClip ? undefined : () => navigation.navigate('VideoEditor', {
                gameId: MOCK_GAME_DETAIL.id,
                recordingUrl: `https://cdn.torna.io/games/${MOCK_GAME_DETAIL.id}.m3u8`,
                durationSeconds: 142,
              })}
            />
          );
        }}
      </AppStack.Screen>

      {/* Player POV flows */}
      <AppStack.Screen name="ClubProfile">
        {({ navigation }) => {
          const [club, setClub] = React.useState(MOCK_CLUB_PUBLIC);
          return (
            <ClubProfilePlayerView
              club={club}
              onBack={() => navigation.goBack()}
              onToggleFollow={() => {
                const wasFollowing = club.isFollowing;
                setClub(c => ({ ...c, isFollowing: !wasFollowing, followers: c.followers + (wasFollowing ? -1 : 1) }));
                SecureStore.getItemAsync('@torna/auth-token').then(token => {
                  const endpoint = wasFollowing ? '/follow/unfollow' : '/follow';
                  fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ''}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ userId: club.id }),
                  }).catch(() => {
                    // revert on error
                    setClub(c => ({ ...c, isFollowing: wasFollowing, followers: c.followers + (wasFollowing ? 1 : -1) }));
                  });
                });
              }}
              onReserveCourt={(courtId) => navigation.navigate('ReserveCourt', { clubId: club.id, courtId })}
              onOpenLive={(gameId) => navigation.navigate('GameDetail', { gameId })}
            />
          );
        }}
      </AppStack.Screen>

      <AppStack.Screen name="PlayerProfile">
        {({ navigation }) => {
          const [player, setPlayer] = React.useState(MOCK_FAKE_PLAYER);
          const [sheet, setSheet] = React.useState<'followers' | 'following' | null>(null);
          const [clipModal, setClipModal] = React.useState<{ url: string; title: string } | null>(null);
          return (
            <>
              <PlayerProfilePublicView
                player={player}
                onBack={() => navigation.goBack()}
                onToggleFollow={() => {
                  const wasFollowing = player.isFollowing;
                  setPlayer(p => ({ ...p, isFollowing: !wasFollowing, followers: p.followers + (wasFollowing ? -1 : 1) }));
                  SecureStore.getItemAsync('@torna/auth-token').then(token => {
                    const endpoint = wasFollowing ? '/follow/unfollow' : '/follow';
                    fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ''}${endpoint}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ userId: player.id }),
                    }).catch(() => {
                      setPlayer(p => ({ ...p, isFollowing: wasFollowing, followers: p.followers + (wasFollowing ? 1 : -1) }));
                    });
                  });
                }}
                onToggleNotify={() => {
                  setPlayer(p => ({ ...p, notifyOnMatch: !p.notifyOnMatch }));
                }}
                onOpenLive={(gameId) => navigation.navigate('GameDetail', { gameId })}
                onOpenClip={(clip) => clip.videoUrl && setClipModal({ url: clip.videoUrl, title: clip.title })}
                onOpenFollowers={() => setSheet('followers')}
                onOpenFollowing={() => setSheet('following')}
              />
              <FollowListSheet
                visible={sheet !== null}
                title={sheet === 'followers' ? 'Seguidores' : 'Siguiendo'}
                users={sheet === 'followers' ? player.followersList : player.followingList}
                onClose={() => setSheet(null)}
                onOpenProfile={(id) => {
                  setSheet(null);
                  navigation.navigate('PlayerProfile', { playerId: id });
                }}
              />
              <VideoPreviewModal
                visible={clipModal !== null}
                url={clipModal?.url ?? ''}
                title={clipModal?.title ?? ''}
                durationSeconds={0}
                onClose={() => setClipModal(null)}
                showComments
              />
            </>
          );
        }}
      </AppStack.Screen>

      <AppStack.Screen name="SearchPlay">
        {({ navigation }) => (
          <SearchPlayScreen
            courts={MOCK_NEARBY.courts}
            players={MOCK_NEARBY.players}
            invitablePlayers={MOCK_INVITABLE_PLAYERS}
            onBack={() => navigation.goBack()}
            onReserveCourt={(courtId) => navigation.navigate('ReserveCourt', { clubId: MOCK_CLUB_PUBLIC.id, courtId })}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="GlobalSearch">
        {({ navigation }) => (
          <GlobalSearchScreen
            players={MOCK_SEARCHABLE_PLAYERS}
            courts={MOCK_SEARCHABLE_COURTS}
            onBack={() => navigation.goBack()}
            onOpenPlayerProfile={(id) => navigation.navigate('PlayerProfile', { playerId: id })}
            onReserveCourt={(clubId, courtId) => navigation.navigate('ReserveCourt', { clubId, courtId })}
          />
        )}
      </AppStack.Screen>

      {/* Reservation flow */}
      <AppStack.Screen name="ReserveCourt">
        {({ route, navigation }) => {
          const { clubId, courtId } = route.params || {};
          return (
            <ReserveStep1Screen
              clubName={MOCK_CLUB_PUBLIC.name}
              courts={MOCK_CLUB_PUBLIC.courts}
              initialCourtId={courtId}
              onBack={() => navigation.goBack()}
              onContinue={(id) => navigation.navigate('ReserveTime', { courtId: id })}
            />
          );
        }}
      </AppStack.Screen>

      <AppStack.Screen name="ReserveTime">
        {({ route, navigation }) => {
          const { courtId } = route.params || {};
          const court = MOCK_CLUB_PUBLIC.courts.find(c => c.id === courtId) || MOCK_CLUB_PUBLIC.courts[0];
          return (
            <ReserveStep2Screen
              court={court}
              slots={MOCK_SLOTS}
              onBack={() => navigation.goBack()}
              onChangeCourt={() => navigation.goBack()}
              onContinue={(slot, day) => navigation.navigate('ReserveInvite', {
                courtId, date: day, slot: slot.start,
              })}
            />
          );
        }}
      </AppStack.Screen>

      <AppStack.Screen name="ReserveInvite">
        {({ route, navigation }) => {
          const { date, slot } = route.params || {};
          return (
            <ReserveStep3Screen
              invitablePlayers={MOCK_INVITABLE_PLAYERS}
              summary={{
                title: 'CANCHA 3 · HARD',
                subtitle: `${date} ${slot} – 15:30 · 90 min`,
                priceLabel: '$6.500',
              }}
              onBack={() => navigation.goBack()}
              onConfirm={() => navigation.replace('ReserveOk', { reservationId: 'R-7421' })}
            />
          );
        }}
      </AppStack.Screen>

      <AppStack.Screen name="ReserveOk">
        {({ route, navigation }) => {
          const { reservationId } = route.params || {};
          return (
            <ReserveSuccessScreen
              summary={[
                { label: 'Club',    value: MOCK_CLUB_PUBLIC.name },
                { label: 'Cancha',  value: '3 · HARD' },
                { label: 'Horario', value: 'Hoy 14:00 – 15:30 (90 min)' },
                { label: 'Pago',    value: '$6.500 · en el club' },
                { label: 'Código',  value: <MonoValue>{reservationId}</MonoValue> },
              ]}
              heroLine="Te esperamos hoy a las 14:00 en Cancha 3."
              onBackToClub={() => navigation.popToTop()}
              onShare={() => {}}
            />
          );
        }}
      </AppStack.Screen>

      {/* Video editor */}
      <AppStack.Screen name="VideoEditor">
        {({ navigation, route }) => {
          const { gameId, recordingUrl, durationSeconds, onHighlightCreated } = route.params as AppStackParamList['VideoEditor'];
          return (
            <VideoEditorScreen
              gameId={gameId}
              recordingUrl={recordingUrl}
              durationSeconds={durationSeconds}
              onBack={() => navigation.goBack()}
              onDone={(result) => {
                if (result?.streamUrl) onHighlightCreated?.(result);
                navigation.goBack();
              }}
            />
          );
        }}
      </AppStack.Screen>
    </AppStack.Navigator>
  );
}

/* ─────────── Root (theme-aware + auth gate) ─────────── */

function Root({ navigationRef }: { navigationRef: React.RefObject<any> }) {
  const { isDark, colors } = useTheme();
  const { user, isLoading } = useAuth();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.bg,
      card:       colors.surface,
      text:       colors.text,
      border:     colors.line,
      primary:    colors.primary,
      notification: colors.live,
    },
  };

  // Session restore in progress — show a branded loading screen
  if (isLoading) {
    return (
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <SplashScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

/* ─────────── App entry ─────────── */

export default function App() {
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    if (!OneSignal) return;
    try {
      OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '');
      OneSignal.Notifications.requestPermission(true);
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        const data = event.notification.additionalData as { type?: string; gameId?: string };
        if (data?.type === 'STREAMING_STARTED' && data?.gameId) {
          navigationRef.current?.navigate('GameDetail', { gameId: data.gameId });
        }
      });
    } catch (err) {
      console.error('[App] OneSignal initialization failed:', err);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider initial="system">
          <ErrorBoundary>
            <AuthProvider>
              <Root navigationRef={navigationRef} />
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
