/**
 * Torna app entry. React Navigation stack with role-aware main containers
 * (MainPlayer / MainClub) that swap based on what role logged in. All screens
 * pull data from mocks for now; in production the mocks become hooks
 * (useFeed, useClubProfile, useReservation, etc.).
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './theme';
import {
  LoginScreen, LoginWithRoleScreen, RegisterClubScreen, PendingApprovalScreen,
  HomeScreen, ClubHomeScreen,
  GamesScreen, GameDetailScreen, CourtsScreen, PlayersScreen, ProfileScreen,
  ClubProfilePlayerView, PlayerProfilePublicView, SearchPlayScreen,
  ReserveStep1Screen, ReserveStep2Screen, ReserveStep3Screen, ReserveSuccessScreen, MonoValue,
  VideoEditorScreen,
  PlayerOwnProfileScreen, MyLibraryScreen, PlayerSettingsScreen,
  type LoginRole,
  type GameDetailData,
} from './screens';
import { TabId } from './components/BottomTabBar';
import { UploadSheet, type UploadResult } from './components/UploadSheet';
import { VideoPreviewModal } from './components/VideoPreviewModal';
import {
  MOCK_LIVE_GAMES, MOCK_GAMES_LIST, MOCK_COURTS, MOCK_PLAYERS,
  MOCK_GAME_DETAIL, MOCK_PROFILE, MOCK_UPCOMING_GAMES, MOCK_FEED_POSTS,
  MOCK_CLUB_TODAY,
  MOCK_CLUB_PUBLIC, MOCK_PLAYER_PUBLIC,
  MOCK_NEARBY, MOCK_INVITABLE_PLAYERS, MOCK_SLOTS,
  MOCK_OWNER, MOCK_MY_MATCHES_V2, MOCK_MY_HIGHLIGHTS_V2, MOCK_MY_UPLOADS,
  type LibraryItem, type LibraryMatch, type LibraryHighlight, type LibraryUpload,
} from './data/mocks';

/* ─────────── Navigation types ─────────── */

type RootStackParamList = {
  Login: undefined;
  LoginWithRole: undefined;
  Register: undefined;
  Pending: undefined;
  MainPlayer: undefined;
  MainClub: undefined;
  GameDetail: { gameId: string; clipData?: GameDetailData };
  ClubProfile: { clubId: string };
  PlayerProfile: { playerId: string };
  SearchPlay: undefined;
  ReserveCourt: { clubId: string; courtId?: string };
  ReserveTime: { courtId: string };
  ReserveInvite: { courtId: string; date: string; slot: string };
  ReserveOk: { reservationId: string };
  VideoEditor: {
    gameId: string;
    recordingUrl: string;
    durationSeconds: number;
    onHighlightCreated?: (r: { streamUrl: string; durationSeconds: number; title: string; visibility: 'public' | 'private' }) => void;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function formatDurationLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function clipToGameDetailParams(streamUrl: string, title: string): { gameId: string; clipData: GameDetailData } {
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

/* ─────────── Main tabs · PLAYER ─────────── */

/* ─────────── Main tabs · PLAYER ─────────── */

function MainPlayer({ navigation }: any) {
  const [tab, setTab] = React.useState<TabId>('home');
  // El tab "profile" del player tiene tres sub-vistas — las manejamos
  // localmente para que el estado de la biblioteca (chips de visibilidad)
  // sobreviva la navegación entre ellas sin pasar por route params.
  const [profileView, setProfileView] = React.useState<'profile' | 'library' | 'settings'>('profile');
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

  // Library state — levantado acá para que persista al ir y volver.
  const [matches, setMatches]       = React.useState<LibraryMatch[]>(MOCK_MY_MATCHES_V2);
  const [highlights, setHighlights] = React.useState<LibraryHighlight[]>(MOCK_MY_HIGHLIGHTS_V2);
  const [uploads, setUploads]       = React.useState<LibraryUpload[]>(MOCK_MY_UPLOADS);

  const toggleVisibility = (item: LibraryItem) => {
    if (item.kind === 'match')          setMatches(xs    => xs.map(x => x.id === item.id ? { ...x, isPublic: !x.isPublic } : x));
    else if (item.kind === 'highlight') setHighlights(xs => xs.map(x => x.id === item.id ? { ...x, isPublic: !x.isPublic } : x));
    else                                 setUploads(xs    => xs.map(x => x.id === item.id ? { ...x, isPublic: !x.isPublic } : x));
  };

  const handleUpload = (r: UploadResult) => {
    setUploadOpen(false);
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

  const handleTab = (id: TabId) => {
    // 'search' tab navega a su propio screen en vez de cambiar contenido.
    if (id === 'search') {
      navigation.navigate('SearchPlay');
      return;
    }
    setTab(id);
    // Cuando volvemos al tab Perfil de otro tab, reseteamos a la sub-vista
    // principal (no a settings ni library).
    if (id === 'profile') setProfileView('profile');
  };

  function renderTabContent() {
    switch (tab) {
      case 'home':
        return (
          <HomeScreen
            greeting="Maxi"
            liveGames={MOCK_LIVE_GAMES}
            upcomingGames={MOCK_UPCOMING_GAMES}
            feedPosts={MOCK_FEED_POSTS}
            activeTab="home" onChangeTab={handleTab}
            onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id })}
            onOpenSearch={() => navigation.navigate('SearchPlay')}
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
        return <PlayersScreen players={MOCK_PLAYERS} activeTab="players" onChangeTab={handleTab} role="player"/>;
      case 'profile': {
        if (profileView === 'settings') {
          return (
            <PlayerSettingsScreen
              owner={MOCK_OWNER}
              onBack={() => setProfileView('profile')}
              onSignOut={() => navigation.replace('LoginWithRole')}
              activeTab="profile" onChangeTab={handleTab}
            />
          );
        }
        if (profileView === 'library') {
          return (
            <>
              <MyLibraryScreen
                matches={matches} highlights={highlights} uploads={uploads}
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
            matches={matches} highlights={highlights} uploads={uploads}
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
      return <CourtsScreen courts={MOCK_COURTS} activeTab="courts" onChangeTab={setTab} role="club"/>;
    case 'players':
      return <PlayersScreen players={MOCK_PLAYERS} activeTab="players" onChangeTab={setTab} role="club"/>;
    case 'profile':
      return <ProfileScreen profile={MOCK_PROFILE} activeTab="profile" onChangeTab={setTab} role="club"/>;
    default:
      return null;
  }
}

/* ─────────── Game detail (visor HLS) ─────────── */

function GameDetailRoute({ navigation, route }: any) {
  const [following, setFollowing] = React.useState(false);
  // clipData presente cuando se abre un highlight desde la biblioteca
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
}

/* ─────────── Player flows ─────────── */

function ClubProfileRoute({ navigation }: any) {
  const [club, setClub] = React.useState(MOCK_CLUB_PUBLIC);
  return (
    <ClubProfilePlayerView
      club={club}
      onBack={() => navigation.goBack()}
      onToggleFollow={() => setClub({ ...club, isFollowing: !club.isFollowing, followers: club.followers + (club.isFollowing ? -1 : 1) })}
      onReserveCourt={(courtId) => navigation.navigate('ReserveCourt', { clubId: club.id, courtId })}
      onOpenLive={(gameId) => navigation.navigate('GameDetail', { gameId })}
    />
  );
}

function PlayerProfileRoute({ navigation }: any) {
  const [player, setPlayer] = React.useState(MOCK_PLAYER_PUBLIC);
  return (
    <PlayerProfilePublicView
      player={player}
      onBack={() => navigation.goBack()}
      onToggleFollow={() => setPlayer({ ...player, isFollowing: !player.isFollowing, followers: player.followers + (player.isFollowing ? -1 : 1) })}
      onOpenLive={(gameId) => navigation.navigate('GameDetail', { gameId })}
    />
  );
}

function SearchPlayRoute({ navigation }: any) {
  return (
    <SearchPlayScreen
      courts={MOCK_NEARBY.courts}
      players={MOCK_NEARBY.players}
      invitablePlayers={MOCK_INVITABLE_PLAYERS}
      onBack={() => navigation.goBack()}
      onReserveCourt={(courtId) => navigation.navigate('ReserveCourt', { clubId: MOCK_CLUB_PUBLIC.id, courtId })}
    />
  );
}

/* ─────────── Reservation flow ─────────── */

function ReserveCourtRoute({ route, navigation }: any) {
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
}

function ReserveTimeRoute({ route, navigation }: any) {
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
}

function ReserveInviteRoute({ route, navigation }: any) {
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
}

function ReserveOkRoute({ route, navigation }: any) {
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
}

/* ─────────── Root (theme-aware) ─────────── */

function Root() {
  const { isDark, colors } = useTheme();
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
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="LoginWithRole">
        {/* Auth */}
        <Stack.Screen name="LoginWithRole">
          {({ navigation }) => (
            <LoginWithRoleScreen
              onLogin={(role: LoginRole) => navigation.replace(role === 'club' ? 'MainClub' : 'MainPlayer')}
              onRegister={(role: LoginRole) => navigation.navigate(role === 'club' ? 'Register' : 'LoginWithRole')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Login">
          {({ navigation }) => (
            <LoginScreen
              onLogin={() => navigation.replace('MainClub')}
              onRegister={() => navigation.navigate('Register')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Register">
          {({ navigation }) => (
            <RegisterClubScreen
              onBack={() => navigation.goBack()}
              onSubmit={() => navigation.replace('Pending')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Pending">
          {({ navigation }) => <PendingApprovalScreen onHome={() => navigation.replace('LoginWithRole')}/>}
        </Stack.Screen>

        {/* Main tabs */}
        <Stack.Screen name="MainPlayer" component={MainPlayer}/>
        <Stack.Screen name="MainClub"   component={MainClub}/>

        {/* Game detail */}
        <Stack.Screen name="GameDetail" component={GameDetailRoute}/>

        {/* Player POV flows */}
        <Stack.Screen name="ClubProfile"   component={ClubProfileRoute}/>
        <Stack.Screen name="PlayerProfile" component={PlayerProfileRoute}/>
        <Stack.Screen name="SearchPlay"    component={SearchPlayRoute}/>

        {/* Reservation */}
        <Stack.Screen name="ReserveCourt"  component={ReserveCourtRoute}/>
        <Stack.Screen name="ReserveTime"   component={ReserveTimeRoute}/>
        <Stack.Screen name="ReserveInvite" component={ReserveInviteRoute}/>
        <Stack.Screen name="ReserveOk"     component={ReserveOkRoute}/>

        {/* Video editor */}
        <Stack.Screen name="VideoEditor">
          {({ navigation, route }) => {
            const { gameId, recordingUrl, durationSeconds, onHighlightCreated } = route.params as RootStackParamList['VideoEditor'];
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
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* ─────────── App entry ─────────── */

export default function App() {
  // Brand-strict typography is Helvetica (system on iOS/Android), so we no
  // longer ship Manrope/Google Fonts. Coolvetica for H1 is a TODO — once the
  // .ttf is added to /fonts, register it here via expo-font useFonts.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider initial="system">
          <Root />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
