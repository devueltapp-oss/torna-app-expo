/**
 * Torna app entry. React Navigation stack with role-aware main containers
 * (MainPlayer / MainClub) that swap based on what role logged in. Las pantallas
 * reciben datos por props desde hooks de API reales (useLiveGames, usePlayers,
 * useUserProfile, useGameDetail, etc.). No hay mocks: las features sin endpoint
 * todavía muestran estados vacíos en lugar de datos falsos.
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
import { View, Text, ActivityIndicator, Alert, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OneSignal } from 'react-native-onesignal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import { ThemeProvider, useTheme } from './theme';
import { AuthProvider, useAuth, type LoginResult } from './contexts/AuthContext';
import {
  LoginScreen, LoginWithRoleScreen, RegisterClubScreen, RegisterPlayerScreen,
  PendingApprovalScreen,
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
import { FollowListSheet } from './components/FollowListSheet';
import { VideoPreviewModal } from './components/VideoPreviewModal';
import { UpcomingMatchSheet } from './components/UpcomingMatchSheet';
import { useLiveGames } from './hooks/useLiveGames';
import { useOpenGames } from './hooks/useOpenGames';
import { useMyGames } from './hooks/useMyGames';
import { usePlayerMatches } from './hooks/usePlayerMatches';
import * as gamesApi from './api/games';
import { useGameDetail } from './hooks/useGameDetail';
import { usePlayers } from './hooks/usePlayers';
import { useUserProfile } from './hooks/useUserProfile';
import { useMyHighlights } from './hooks/useMyHighlights';
import { searchUsers, searchUsersAndClubs, fetchUserProfile, setFollowNotify } from './api/users';
import { toggleHighlightVisibility } from './api/highlights';
import { fetchClubCourts, fetchCourt, fetchCourtSlots, createReservation } from './api/clubs';
import type { DayOption } from './screens/ReserveStep2Screen';
import type {
  LibraryItem, LibraryMatch, LibraryHighlight,
  ProfileOwner, ClubProfile, ClubPublic, ClubCourtPublic,
  SearchableUser, PlayerPublic, Slot, UpcomingGameData,
} from './data/types';

/** Antepone '@' al username si no lo trae. */
function atHandle(username?: string | null): string {
  if (!username) return '';
  return username.startsWith('@') ? username : '@' + username;
}

/** Cancha vacía para pantallas de reserva sin backend (estado vacío). */
function emptyCourt(id: string): ClubCourtPublic {
  return { id, name: '', surface: 'HARD', cams: 0, indoor: false, nextSlot: '' };
}

const DOW = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
/** Próximos N días con su ISO (YYYY-MM-DD) para el selector de la reserva. */
function buildDays(n = 6): DayOption[] {
  const pad = (x: number) => String(x).padStart(2, '0');
  const today = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DOW[d.getDay()],
      date: String(d.getDate()),
      dow: DOW[d.getDay()],
      iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    };
  });
}

/** Detalle de partido vacío mientras carga / si no hay datos (sin cámaras → placeholder). */
function emptyGameDetail(id: string): GameDetailData {
  return {
    id, court: '', floor: 'HARD', club: '', clubHandle: '', clubFollowers: 0,
    time: '', date: '', viewers: 0, isLive: false, players: [], cameras: [],
  };
}

/** Club público vacío (sin endpoint): solo identidad real, resto en estado vacío. */
function emptyClubPublic(id: string): ClubPublic {
  return {
    id, name: '', handle: '', city: '', followers: 0, isFollowing: false,
    hours: '', phone: '', address: '', latitude: null, longitude: null,
    highlights: { live: [], clips: [] },
    courts: [], upcoming: [], members: [], photos: [],
  };
}

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
  RegisterPlayer: undefined;
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
  GameDetail: { gameId: string; clipData?: GameDetailData; liveStreamUrl?: string };
  ClubProfile: { clubId: string };
  PlayerProfile: { playerId: string };
  SearchPlay: undefined;
  GlobalSearch: undefined;
  ReserveCourt: { clubId: string; courtId?: string };
  ReserveTime: { courtId: string };
  ReserveInvite: {
    courtId: string;
    courtLabel: string;
    date: string;
    slotStart: string;
    slotEnd: string;
    durationMinutes: number;
  };
  ReserveOk: { reservationId: string; courtLabel: string; whenLabel: string };
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

/**
 * Pantalla de error para cuando un perfil no carga. Antes la ruta mostraba
 * SplashScreen indefinidamente si la request fallaba → "se queda cargando".
 */
function ProfileErrorScreen({ error, onBack, onRetry }: {
  error?: string | null; onBack: () => void; onRetry: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>No se pudo cargar el perfil</Text>
      <Text style={{ fontSize: 13, color: colors.muted2, textAlign: 'center' }}>
        {error ?? 'Ocurrió un error.'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <Pressable onPress={onRetry} style={{ backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9999 }}>
          <Text style={{ fontWeight: '800', color: colors.primaryFg }}>Reintentar</Text>
        </Pressable>
        <Pressable onPress={onBack} style={{ borderWidth: 1, borderColor: colors.line, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9999 }}>
          <Text style={{ fontWeight: '800', color: colors.text }}>Volver</Text>
        </Pressable>
      </View>
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
              navigation.navigate(role === 'club' ? 'Register' : 'RegisterPlayer')
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

      <AuthStack.Screen name="RegisterPlayer">
        {({ navigation }) => (
          <RegisterPlayerScreen
            onBack={() => navigation.goBack()}
            // No onComplete: el player entra al instante. AuthProvider setea
            // user → Root cambia al AppStack automáticamente.
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
  const [ownSheet, setOwnSheet] = React.useState<'followers' | 'following' | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Partidas en vivo reales (GET /game/live). Si viene vacío, HomeScreen
  // muestra su estado vacío — sin datos falsos.
  const { liveGames, refresh: refreshLive } = useLiveGames();

  // Partidas abiertas reales (GET /game/open) para postularse.
  const { openGames, refresh: refreshOpen } = useOpenGames();

  // "Mis partidos" reales (GET /game/player/:id/history) — el recordingUrl de
  // cada uno es el video almacenado en B2 que el editor recorta on-device.
  const { user } = useAuth();

  // "Mis partidas" activas (GET /game/mine): para gestionar baja/cancelación.
  const { myGames, refresh: refreshMyGames } = useMyGames(user?.id);
  const [myGameSheet, setMyGameSheet] = React.useState<UpcomingGameData | null>(null);
  const { matches: apiMatches, refresh: refreshMatches } = usePlayerMatches(user?.id);

  // Directorio de jugadores reales (GET /user/players).
  const { players: playerList, refresh: refreshPlayers } = usePlayers();

  // Perfil propio: identidad del usuario autenticado + conteos REALES de
  // seguidores/seguidos (count en BD vía GET /user/profile/:id).
  const { player: ownProfile, refresh: refreshOwnProfile } = useUserProfile(user?.id);

  // Mis highlights reales (GET /highlights/my): públicos + privados. Los públicos
  // se muestran en el perfil; los privados solo en la librería.
  const { highlights: apiHighlights, refresh: refreshHighlights } = useMyHighlights(user?.id);

  const owner: ProfileOwner = {
    name: user?.name ?? user?.username ?? '',
    username: atHandle(user?.username),
    club: '',
    location: user?.region ?? '',
    followers: ownProfile?.followers ?? 0,
    following: ownProfile?.followingCount ?? 0,
    profilePicture: user?.profilePicture,
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshLive(),
      refreshOpen(),
      refreshMyGames(),
      refreshMatches(),
      refreshPlayers(),
      refreshOwnProfile(),
      refreshHighlights(),
      new Promise<void>((r) => setTimeout(r, 800)),
    ]);
    setRefreshing(false);
  }, [refreshLive, refreshOpen, refreshMyGames, refreshMatches, refreshPlayers, refreshOwnProfile, refreshHighlights]);

  // Acciones de gestión de "Mis partidas" (cierran el sheet y refrescan la lista).
  // Si el backend rechaza (p. ej. estado inválido), avisamos en vez de fallar en silencio.
  const runMyGameAction = useCallback(
    (action: Promise<unknown>, errorTitle: string) => {
      action
        .catch((e: any) =>
          Alert.alert(errorTitle, e?.message ?? 'Intentá de nuevo.'),
        )
        .finally(() => refreshMyGames());
    },
    [refreshMyGames],
  );
  const handleCancelGame = useCallback((id: string) => {
    runMyGameAction(gamesApi.cancelGame(id), 'No se pudo cancelar la partida');
  }, [runMyGameAction]);
  const handleLeaveGame = useCallback((id: string) => {
    runMyGameAction(gamesApi.leaveGame(id), 'No se pudo dar de baja');
  }, [runMyGameAction]);
  const handleCancelPair = useCallback((id: string) => {
    runMyGameAction(gamesApi.cancelChallengerPair(id), 'No se pudo cancelar la pareja');
  }, [runMyGameAction]);
  // accept/reject pegan al endpoint dentro del sheet (api/games) y luego invocan
  // este callback solo si la operación tuvo éxito; acá refrescamos "Mis partidas".
  const handleApplicationChange = useCallback(() => {
    refreshMyGames();
  }, [refreshMyGames]);
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

  const [matches, setMatches]       = React.useState<LibraryMatch[]>([]);
  React.useEffect(() => { setMatches(apiMatches); }, [apiMatches]);

  const [highlights, setHighlights] = React.useState<LibraryHighlight[]>([]);
  React.useEffect(() => { setHighlights(apiHighlights); }, [apiHighlights]);

  // Registrar resultado (gané/perdí) de un partido finalizado. El backend no
  // permite cambiarlo luego (segundo intento → 400).
  const handleRegisterResult = React.useCallback((match: LibraryMatch) => {
    const submit = (isWinner: boolean) => {
      gamesApi.registerGameResult(match.id, isWinner)
        .then(() => {
          setMatches(xs => xs.map(m => m.id === match.id ? { ...m, resultRegistered: true } : m));
          Alert.alert('Listo', isWinner ? '¡Registraste que ganaste!' : 'Registraste que perdiste.');
        })
        .catch((e: any) => {
          const msg = e?.status === 400
            ? 'Ya registraste el resultado o el partido aún no finalizó.'
            : (e instanceof Error ? e.message : 'No se pudo registrar el resultado.');
          Alert.alert('No se pudo registrar', msg);
        });
    };
    Alert.alert('Registrar resultado', '¿Cómo te fue en este partido?', [
      { text: 'Perdí', onPress: () => submit(false) },
      { text: 'Gané', onPress: () => submit(true) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, []);

  const toggleVisibility = (item: LibraryItem) => {
    if (item.kind === 'match') {
      // Los partidos no tienen visibilidad en el backend; toggle local/cosmético.
      setMatches(xs => xs.map(x => x.id === item.id ? { ...x, isPublic: !x.isPublic } : x));
      return;
    }
    // Highlight: flip optimista + persistir en el backend (PATCH /highlights/:id/toggle).
    setHighlights(xs => xs.map(x => x.id === item.id ? { ...x, isPublic: !x.isPublic } : x));
    toggleHighlightVisibility(item.id).catch(() => {
      // revertir si falla
      setHighlights(xs => xs.map(x => x.id === item.id ? { ...x, isPublic: !x.isPublic } : x));
    });
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
              upcomingGames={[]}
              feedPosts={[]}
              onBack={() => setReelSection(null)}
              onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id, liveStreamUrl: liveGames.find(g => g.id === id)?.streamUrl })}
              activeTab="home"
              onChangeTab={handleTab}
              initialIndex={reelInitialIndex}
            />
          );
        }
        return (
          <HomeScreen
            greeting={user?.name ?? user?.username ?? ''}
            liveGames={liveGames}
            upcomingGames={[]}
            openGames={openGames}
            feedPosts={[]}
            activeTab="home" onChangeTab={handleTab}
            onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id, liveStreamUrl: liveGames.find(g => g.id === id)?.streamUrl })}
            onOpenSearch={() => navigation.navigate('GlobalSearch')}
            onVerMas={(section, idx) => { setReelInitialIndex(idx ?? 0); setReelSection(section); }}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onOpenPlayerProfile={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
            invitablePlayers={[]}
          />
        );
      case 'games':
        return (
          <GamesScreen games={[]} activeTab="games" onChangeTab={handleTab} role="player"
            emptyImage={require('./assets/racket.png')}
            onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id, liveStreamUrl: liveGames.find(g => g.id === id)?.streamUrl })}
            myGames={myGames}
            onOpenMyGame={(g) => setMyGameSheet(g)}
          />
        );
      case 'players':
        return <PlayersScreen players={playerList} activeTab="players" onChangeTab={handleTab} role="player" onOpenPlayerProfile={(id) => navigation.navigate('PlayerProfile', { playerId: id })} />;
      case 'profile': {
        if (profileView === 'settings') {
          return (
            <PlayerSettingsScreen
              owner={owner}
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
            <MyLibraryScreen
              matches={matches} highlights={highlights}
              onBack={() => setProfileView('profile')}
              onCreateHighlight={(m) => navigation.navigate('VideoEditor', {
                gameId: m.id,
                recordingUrl: m.recordingUrl,
                durationSeconds: m.durationSeconds,
                onHighlightCreated: (result: { streamUrl: string; durationSeconds: number; title: string; visibility: 'public' | 'private' }) => {
                  // Prepend optimista para feedback inmediato…
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
                  // …y luego sincronizar con el backend (id/orden reales).
                  refreshHighlights();
                },
              })}
              onRegisterResult={handleRegisterResult}
              onToggleVisibility={toggleVisibility}
              onOpenItem={openPreview}
              activeTab="profile" onChangeTab={handleTab}
            />
          );
        }
        return (
          <>
            <PlayerOwnProfileScreen
              owner={owner}
              matches={matches} highlights={highlights}
              onOpenLibrary={() => setProfileView('library')}
              onOpenSettings={() => setProfileView('settings')}
              onOpenItem={openPreview}
              onOpenFollowers={() => setOwnSheet('followers')}
              onOpenFollowing={() => setOwnSheet('following')}
              activeTab="profile" onChangeTab={handleTab}
            />
            <FollowListSheet
              visible={ownSheet !== null}
              title={ownSheet === 'followers' ? 'Seguidores' : 'Siguiendo'}
              users={ownSheet === 'followers' ? (ownProfile?.followersList ?? []) : (ownProfile?.followingList ?? [])}
              onClose={() => setOwnSheet(null)}
              onOpenProfile={(id) => {
                setOwnSheet(null);
                navigation.navigate('PlayerProfile', { playerId: id });
              }}
            />
          </>
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
      <UpcomingMatchSheet
        visible={myGameSheet !== null}
        game={myGameSheet}
        onClose={() => setMyGameSheet(null)}
        onOpenPlayerProfile={(playerId) => {
          setMyGameSheet(null);
          navigation.navigate('PlayerProfile', { playerId });
        }}
        onAcceptApplication={handleApplicationChange}
        onRejectApplication={handleApplicationChange}
        onCancelGame={handleCancelGame}
        onLeaveGame={handleLeaveGame}
        onCancelPair={handleCancelPair}
      />
    </>
  );
}

/* ─────────── Main tabs · CLUB ─────────── */

function MainClub({ navigation }: any) {
  const [tab, setTab] = React.useState<TabId>('home');
  const { user } = useAuth();

  // Perfil del club derivado del usuario autenticado (no hay mock).
  const clubProfile: ClubProfile = {
    name: user?.name ?? user?.username ?? '',
    username: atHandle(user?.username),
    address: '',
    phone: user?.phone ?? '',
    description: '',
    region: user?.region ?? '',
  };

  switch (tab) {
    case 'home':
      return (
        <ClubHomeScreen
          clubName={clubProfile.name}
          liveGames={[]}
          todayReservations={[]}
          activeTab="home" onChangeTab={setTab}
          onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id })}
        />
      );
    case 'games':
      return (
        <GamesScreen games={[]} activeTab="games" onChangeTab={setTab} role="club"
          emptyImage={require('./assets/racket.png')}
          onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id })}
        />
      );
    case 'courts':
      return <CourtsScreen courts={[]} activeTab="courts" onChangeTab={setTab} role="club" />;
    case 'players':
      return <PlayersScreen players={[]} activeTab="players" onChangeTab={setTab} role="club" />;
    case 'profile':
      return (
        <ProfileScreen
          profile={clubProfile}
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
          const isClip = !!route.params?.clipData;
          // Trae el partido real (cámaras + stream HLS) y el recordingUrl para el editor.
          const { game: apiGame, detail } = useGameDetail(route.params?.gameId);
          const game: GameDetailData =
            route.params?.clipData ?? detail ?? emptyGameDetail(route.params?.gameId ?? '');
          const recordingUrl = apiGame?.recordingUrl ?? null;
          const canCreateHighlight = !isClip && !!recordingUrl;
          return (
            <GameDetailScreen
              game={game}
              fallbackStreamUrl={route.params?.liveStreamUrl}
              isFollowing={following}
              onToggleFollow={() => setFollowing(f => !f)}
              onBack={() => navigation.goBack()}
              onCreateHighlight={canCreateHighlight ? () => navigation.navigate('VideoEditor', {
                gameId: apiGame!.id,
                recordingUrl: recordingUrl!,
                durationSeconds: apiGame!.durationSeconds ?? 0,
              }) : undefined}
            />
          );
        }}
      </AppStack.Screen>

      {/* Player POV flows */}
      <AppStack.Screen name="ClubProfile">
        {({ navigation, route }) => {
          const clubId = route.params?.clubId ?? '';
          const [club, setClub] = React.useState<ClubPublic>(() => emptyClubPublic(clubId));
          // Los clubes son usuarios (isClub=true): traemos su identidad real.
          // Highlights/canchas/miembros quedan vacíos hasta tener sus endpoints.
          React.useEffect(() => {
            if (!clubId) return;
            fetchUserProfile(clubId)
              .then((p) => setClub((c) => ({
                ...c,
                id: p.id,
                name: p.name ?? p.username,
                handle: atHandle(p.username),
                city: p.region ?? '',
                followers: p.followersCount ?? 0,
                isFollowing: p.isFollowing ?? false,
                phone: p.phone ?? '',
                address: p.address ?? '',
                latitude: p.latitude,
                longitude: p.longitude,
              })))
              .catch((e) => {
                // TODO(dev): QUITAR. Log temporal para diagnosticar club que no carga.
                if (__DEV__) console.warn('[PROFILE DEBUG] fallo cargando club', clubId, e?.message ?? e);
              });
          }, [clubId]);
          return (
            <ClubProfilePlayerView
              club={club}
              onBack={() => navigation.goBack()}
              onToggleFollow={() => {
                const wasFollowing = club.isFollowing;
                setClub(c => ({ ...c, isFollowing: !wasFollowing, followers: c.followers + (wasFollowing ? -1 : 1) }));
                SecureStore.getItemAsync('torna_auth_token').then(token => {
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
        {({ navigation, route }) => {
          const playerId = route.params?.playerId ?? '';
          const { player: fetched, error, refresh } = useUserProfile(playerId);
          // Estado local = perfil del hook + parches optimistas (follow/notify).
          // Solo lo seteamos cuando `fetched` es válido: así, una vez cargado, nunca
          // vuelve a null por el desfase de 1 render del espejo (lo que antes hacía
          // caer en ProfileErrorScreen pese a que la data ya había llegado 200).
          const [player, setPlayer] = React.useState<PlayerPublic | null>(null);
          React.useEffect(() => { if (fetched) setPlayer(fetched); }, [fetched]);
          const [sheet, setSheet] = React.useState<'followers' | 'following' | null>(null);
          const [clipModal, setClipModal] = React.useState<{ url: string; title: string; id: string } | null>(null);
          // Sin perfil todavía: error real → pantalla de error; si no, seguimos cargando.
          if (!player) {
            if (error) return <ProfileErrorScreen error={error} onBack={() => navigation.goBack()} onRetry={refresh} />;
            return <SplashScreen />;
          }
          return (
            <>
              <PlayerProfilePublicView
                player={player}
                onBack={() => navigation.goBack()}
                onToggleFollow={() => {
                  const wasFollowing = player.isFollowing;
                  setPlayer(p => p ? ({ ...p, isFollowing: !wasFollowing, followers: p.followers + (wasFollowing ? -1 : 1) }) : p);
                  SecureStore.getItemAsync('torna_auth_token').then(token => {
                    const endpoint = wasFollowing ? '/follow/unfollow' : '/follow';
                    fetch(`${process.env.EXPO_PUBLIC_API_URL ?? ''}${endpoint}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ userId: player.id }),
                    }).catch(() => {
                      setPlayer(p => p ? ({ ...p, isFollowing: wasFollowing, followers: p.followers + (wasFollowing ? 1 : -1) }) : p);
                    });
                  });
                }}
                onToggleNotify={() => {
                  const wasNotifying = player.notifyOnMatch;
                  // Update optimista + persistir; si falla, revertir.
                  setPlayer(p => p ? ({ ...p, notifyOnMatch: !wasNotifying }) : p);
                  setFollowNotify(player.id, !wasNotifying).catch(() => {
                    setPlayer(p => p ? ({ ...p, notifyOnMatch: wasNotifying }) : p);
                  });
                }}
                onOpenLive={(gameId) => navigation.navigate('GameDetail', { gameId })}
                onOpenClip={(clip) => clip.videoUrl && setClipModal({ url: clip.videoUrl, title: clip.title, id: clip.id })}
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
                highlightId={clipModal?.id}
                showComments
              />
            </>
          );
        }}
      </AppStack.Screen>

      <AppStack.Screen name="SearchPlay">
        {({ navigation }) => (
          <SearchPlayScreen
            onBack={() => navigation.goBack()}
            onOpenPlayerProfile={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="GlobalSearch">
        {({ navigation }) => (
          <GlobalSearchScreen
            players={[]}
            courts={[]}
            onSearchUsers={async (q): Promise<SearchableUser[]> => {
              const res = await searchUsersAndClubs(q);
              return res.map((u) => ({
                id: u.id,
                name: u.name ?? u.username,
                username: atHandle(u.username),
                profilePicture: u.profilePicture ?? undefined,
                isClub: u.isClub,
              }));
            }}
            onBack={() => navigation.goBack()}
            onOpenPlayerProfile={(id) => navigation.navigate('PlayerProfile', { playerId: id })}
            onOpenClubProfile={(id) => navigation.navigate('ClubProfile', { clubId: id })}
            onReserveCourt={(clubId, courtId) => navigation.navigate('ReserveCourt', { clubId, courtId })}
          />
        )}
      </AppStack.Screen>

      {/* Reservation flow */}
      <AppStack.Screen name="ReserveCourt">
        {({ route, navigation }) => {
          const { clubId, courtId } = route.params || {};
          const [courts, setCourts] = React.useState<ClubCourtPublic[]>([]);
          const [clubName, setClubName] = React.useState('');
          const [clubLoc, setClubLoc] = React.useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
          React.useEffect(() => {
            if (!clubId) return;
            fetchClubCourts(clubId).then(setCourts).catch(() => setCourts([]));
            fetchUserProfile(clubId)
              .then((p) => {
                setClubName(p.name ?? p.username);
                setClubLoc({ lat: p.latitude, lng: p.longitude });
              })
              .catch(() => {});
          }, [clubId]);
          return (
            <ReserveStep1Screen
              clubName={clubName}
              courts={courts}
              latitude={clubLoc.lat}
              longitude={clubLoc.lng}
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
          const days = React.useMemo(() => buildDays(6), []);
          const [court, setCourt] = React.useState<ClubCourtPublic>(() => emptyCourt(courtId ?? ''));
          const [slots, setSlots] = React.useState<Slot[]>([]);
          React.useEffect(() => {
            if (courtId) fetchCourt(courtId).then(setCourt).catch(() => {});
          }, [courtId]);
          const loadSlots = React.useCallback((iso?: string) => {
            if (!courtId || !iso) { setSlots([]); return; }
            fetchCourtSlots(courtId, iso).then(setSlots).catch(() => setSlots([]));
          }, [courtId]);
          React.useEffect(() => { loadSlots(days[0].iso); }, [loadSlots, days]);
          return (
            <ReserveStep2Screen
              court={court}
              slots={slots}
              days={days}
              onBack={() => navigation.goBack()}
              onChangeCourt={() => navigation.goBack()}
              onDayChange={(d) => loadSlots(d.iso)}
              onContinue={(slot, day) => navigation.navigate('ReserveInvite', {
                courtId: courtId ?? '',
                courtLabel: `${court.name} · ${court.surface}`,
                date: day.iso ?? '',
                slotStart: slot.start,
                slotEnd: slot.end,
                durationMinutes: slot.duration,
              })}
            />
          );
        }}
      </AppStack.Screen>

      <AppStack.Screen name="ReserveInvite">
        {({ route, navigation }) => {
          const { courtId, courtLabel, date, slotStart, slotEnd, durationMinutes } = route.params || ({} as any);
          const submitting = React.useRef(false);
          return (
            <ReserveStep3Screen
              onSearchPlayers={async (q): Promise<{ id: string; name: string; username: string }[]> => {
                const res = await searchUsers(q);
                return res.map((u) => ({ id: u.id, name: u.name ?? u.username, username: atHandle(u.username) }));
              }}
              summary={{
                title: courtLabel || 'Cancha',
                subtitle: `${date} · ${slotStart}–${slotEnd} · ${durationMinutes} min`,
                priceLabel: 'Pago en el club',
              }}
              onBack={() => navigation.goBack()}
              onConfirm={async (payload) => {
                if (submitting.current) return;
                submitting.current = true;
                try {
                  const opponents = (payload.opponents ?? []).filter((x): x is string => !!x);
                  const created = await createReservation({
                    courtId,
                    date,
                    slotStart,
                    durationMinutes,
                    mode: payload.mode,
                    partnerUserId: payload.partnerUserId,
                    opponentUserIds: opponents,
                  });
                  navigation.replace('ReserveOk', {
                    reservationId: created.id,
                    courtLabel: courtLabel || '',
                    whenLabel: `${date} · ${slotStart}–${slotEnd}`,
                  });
                } catch (e) {
                  Alert.alert(
                    'No se pudo crear la reserva',
                    e instanceof Error ? e.message : 'Intentá de nuevo.',
                  );
                } finally {
                  submitting.current = false;
                }
              }}
            />
          );
        }}
      </AppStack.Screen>

      <AppStack.Screen name="ReserveOk">
        {({ route, navigation }) => {
          const { reservationId, courtLabel, whenLabel } = route.params || ({} as any);
          return (
            <ReserveSuccessScreen
              summary={[
                { label: 'Cancha',  value: courtLabel || '—' },
                { label: 'Horario', value: whenLabel || '—' },
                { label: 'Pago',    value: 'En el club' },
                { label: 'Código',  value: <MonoValue>{reservationId}</MonoValue> },
              ]}
              heroLine="¡Reserva confirmada! Te esperamos en la cancha."
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
