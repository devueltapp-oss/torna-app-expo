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
import {
  initNotifications, onNavigationReady, resolvePushTarget, type PushData,
} from './services/notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InAppNotificationHost } from './components/InAppNotification';

import { ThemeProvider, useTheme } from './theme';
import { AuthProvider, useAuth, type LoginResult } from './contexts/AuthContext';
import {
  LoginWithRoleScreen, RegisterClubScreen, RegisterPlayerScreen, ForgotPasswordScreen,
  PendingApprovalScreen,
  CompleteProfileScreen,
  HomeScreen, ClubHomeScreen,
  GamesScreen, GameChatScreen, GameDetailScreen, CourtsScreen, ProfileScreen,
  ClubProfilePlayerView, PlayerProfilePublicView, GlobalSearchScreen,
  ChatsInboxScreen, DirectChatScreen, NotificationsScreen,
  ReserveClubPickerScreen, ReserveBlocksScreen, ReserveStep3Screen, ReserveSuccessScreen,
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

import { useClubGames } from './hooks/useClubGames';
import { useFeed } from './hooks/useFeed';
import { usePlayerMatches } from './hooks/usePlayerMatches';
import * as gamesApi from './api/games';
import { useGameDetail } from './hooks/useGameDetail';
import { usePlayers } from './hooks/usePlayers';
import { useUserProfile } from './hooks/useUserProfile';
import { useFollowedClubs } from './hooks/useFollowedClubs';
import { usePartnerSearch } from './hooks/usePartnerSearch';
import { useMyHighlights } from './hooks/useMyHighlights';
import { useHighlightVisibility } from './hooks/useHighlightVisibility';
import { useInbox } from './hooks/useInbox';
import { ShareGameSheet } from './components/ShareGameSheet';
import { sendDirectMessage } from './api/chat';
import { useNotifications } from './hooks/useNotifications';
import { useNotificationBadge } from './hooks/useNotificationBadge';
import { useNearbyLocation } from './hooks/useNearbyLocation';
import { useClubLocation } from './hooks/useClubLocation';
import { ClubLocationSheet } from './components/ClubLocationSheet';
import type { AppNotification } from './api/notifications';
import { searchUsers, searchUsersAndClubs, fetchUserProfile, setFollowNotify, fetchFollowing, followUser, unfollowUser } from './api/users';
import type { CourtData, PlayerData } from './components/cards';
import { updateHighlightMeta } from './api/highlights';
import { fetchClubCourts, fetchCourtSlots, createReservation } from './api/clubs';
import type { CourtSlots } from './lib/reservation';
import type { DayOption } from './screens';
import type {
  LibraryItem, LibraryMatch, LibraryHighlight,
  ProfileOwner, ClubProfile, ClubPublic, ClubCourtPublic,
  SearchableUser, PlayerPublic, UpcomingGameData, InvitablePlayer, FollowItem,
} from './data/types';

/** Antepone '@' al username si no lo trae. */
function atHandle(username?: string | null): string {
  if (!username) return '';
  return username.startsWith('@') ? username : '@' + username;
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
    id, court: '', category: null, club: '', clubId: '', clubHandle: '',
    time: '', date: '', isLive: false, players: [], cameras: [],
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
  Register: undefined;
  RegisterPlayer: undefined;
  /** Recuperación de contraseña (mail de Firebase). `prefillEmail` = lo tipeado en el login. */
  ForgotPassword: { prefillEmail?: string } | undefined;
  Pending: undefined;
  CompleteProfile: {
    idToken: string;
    prefillName?: string;
    prefillEmail?: string;
    /** `email` = login por email/contraseña sin cuenta en la DB de Torna. */
    authProvider: 'email' | 'google' | 'apple' | 'facebook';
  };
};

/**
 * App stack: shown once user is authenticated (user !== null).
 */
type AppStackParamList = {
  /** `initialTab` lo usa el routing de push (partida cancelada / baja) para
   *  aterrizar en el hub de partidos en vez de en Inicio. */
  MainPlayer: { initialTab?: TabId } | undefined;
  MainClub: undefined;
  GameDetail: { gameId: string; clipData?: GameDetailData; liveStreamUrl?: string };
  GameChat: { gameId: string; title?: string; readOnly?: boolean };
  DirectChat: { userId: string; title?: string };
  /** Campanita: historial de notificaciones (sin chats). */
  Notifications: undefined;
  ClubProfile: { clubId: string };
  PlayerProfile: { playerId: string };
  GlobalSearch: { mode?: 'chat' } | undefined;
  ReservePickClub: undefined;
  /** Bloques del día del club. `courtId` = filtro inicial (CTA de una cancha puntual). */
  ReserveBlocks: { clubId: string; courtId?: string };
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
      category: null,
      club: '', clubId: '', clubHandle: '',
      time: '', date: '',
      isLive: false,
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

/* ─────────── Perfil público de otro player ─────────── */

/**
 * Pantalla de perfil de un usuario distinto al logueado. Se monta con
 * `key={playerId}` (montaje fresco por perfil). El gate usa `loading` del hook:
 * mientras carga → Splash; si termina sin perfil (error, timeout o id vacío) →
 * pantalla de error con reintento. NUNCA queda en carga infinita.
 *
 * Los cambios optimistas (seguir / notificar) se guardan como `overrides` y se
 * superponen al perfil fresco, así no se pierden los datos secundarios (clips /
 * listas) que llegan después.
 */
function PlayerProfileScreen({ navigation, playerId }: { navigation: any; playerId: string }) {
  const { player: fetched, loading, error, refresh } = useUserProfile(playerId);
  const [overrides, setOverrides] = React.useState<
    Partial<Pick<PlayerPublic, 'isFollowing' | 'followers' | 'notifyOnMatch'>>
  >({});
  const [sheet, setSheet] = React.useState<'followers' | 'following' | null>(null);
  const [clipModal, setClipModal] = React.useState<{ url: string; title: string; id: string } | null>(null);

  const view: PlayerPublic | null = fetched ? { ...fetched, ...overrides } : null;

  if (!view) {
    if (loading) return <SplashScreen />;
    return (
      <ProfileErrorScreen
        error={error ?? 'No se pudo cargar el perfil.'}
        onBack={() => navigation.goBack()}
        onRetry={refresh}
      />
    );
  }

  return (
    <>
      <PlayerProfilePublicView
        player={view}
        onBack={() => navigation.goBack()}
        onToggleFollow={() => {
          const wasFollowing = view.isFollowing;
          const baseFollowers = view.followers;
          setOverrides(o => ({ ...o, isFollowing: !wasFollowing, followers: baseFollowers + (wasFollowing ? -1 : 1) }));
          (wasFollowing ? unfollowUser(view.id) : followUser(view.id)).catch(() => {
            // revertir al estado previo al toggle
            setOverrides(o => ({ ...o, isFollowing: wasFollowing, followers: baseFollowers }));
          });
        }}
        onToggleNotify={() => {
          const wasNotifying = view.notifyOnMatch;
          setOverrides(o => ({ ...o, notifyOnMatch: !wasNotifying }));
          setFollowNotify(view.id, !wasNotifying).catch(() => {
            setOverrides(o => ({ ...o, notifyOnMatch: wasNotifying }));
          });
        }}
        onMessage={() => navigation.navigate('DirectChat', { userId: view.id, title: view.name ?? view.username })}
        onOpenLive={(gameId) => navigation.navigate('GameDetail', { gameId })}
        onOpenClip={(clip) => setClipModal({ url: clip.videoUrl ?? '', title: clip.title, id: clip.id })}
        onOpenFollowers={() => setSheet('followers')}
        onOpenFollowing={() => setSheet('following')}
      />
      <FollowListSheet
        visible={sheet !== null}
        title={sheet === 'followers' ? 'Seguidores' : 'Siguiendo'}
        users={sheet === 'followers' ? view.followersList : view.followingList}
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
}

/* ─────────── Perfil público de un CLUB (POV player) ─────────── */

/**
 * Perfil de un club visto por un jugador. Un club es un `User` (isClub=true), así que
 * seguir a un club es EXACTAMENTE seguir a un usuario: usa el mismo mecanismo que
 * `PlayerProfileScreen` — `useUserProfile` + `overrides` + `view = {...fetched, ...overrides}`,
 * montado con `key={clubId}`. Lo único propio del club es la presentación (anillo verde +
 * etiqueta "CLUB", en `ClubProfilePlayerView`) y la sección de canchas para reservar (que el
 * hook de perfil no trae, se cargan aparte).
 */
function ClubProfileScreen({ navigation, clubId }: { navigation: any; clubId: string }) {
  const { player: fetched, loading, error, refresh } = useUserProfile(clubId);
  const [overrides, setOverrides] = React.useState<
    Partial<Pick<PlayerPublic, 'isFollowing' | 'followers'>>
  >({});
  const [sheet, setSheet] = React.useState<'followers' | 'following' | null>(null);
  const [clipModal, setClipModal] = React.useState<{ url: string; title: string; id: string } | null>(null);
  const [courts, setCourts] = React.useState<ClubCourtPublic[]>([]);
  // Partidas del club: en vivo (carrusel) + próximas (lista).
  const { live: clubLive, upcoming: clubUpcoming } = useClubGames(clubId);

  // Canchas del club: el perfil de usuario no las trae; se cargan aparte para la
  // sección "Canchas y horarios" (reservas).
  React.useEffect(() => {
    if (!clubId) return;
    fetchClubCourts(clubId)
      .then(setCourts)
      .catch(() => { /* sin canchas → sección vacía */ });
  }, [clubId]);

  const view: PlayerPublic | null = fetched ? { ...fetched, ...overrides } : null;

  if (!view) {
    if (loading) return <SplashScreen />;
    return (
      <ProfileErrorScreen
        error={error ?? 'No se pudo cargar el club.'}
        onBack={() => navigation.goBack()}
        onRetry={refresh}
      />
    );
  }

  // Mapeo PlayerPublic (+ canchas + partidas del club) → ClubPublic para la vista.
  // `handle` ya viene con '@' desde useUserProfile (NO re-aplicar atHandle).
  const clubView: ClubPublic = {
    id: view.id,
    name: view.name,
    handle: view.username,
    city: view.location,
    followers: view.followers,
    followingCount: view.followingCount,
    isFollowing: view.isFollowing,
    hours: '', phone: '', address: '',
    latitude: null, longitude: null,
    highlights: {
      live: clubLive,
      clips: view.clips.map((c) => ({
        id: c.id, title: c.title, length: c.length, date: c.date, videoUrl: c.videoUrl,
      })),
    },
    courts,
    upcoming: clubUpcoming,
    members: view.followersList.map((f) => ({ id: f.id, name: f.name, username: f.username })),
    photos: [],
  };

  return (
    <>
      <ClubProfilePlayerView
        club={clubView}
        onBack={() => navigation.goBack()}
        onToggleFollow={() => {
          const wasFollowing = view.isFollowing;
          const baseFollowers = view.followers;
          setOverrides(o => ({ ...o, isFollowing: !wasFollowing, followers: baseFollowers + (wasFollowing ? -1 : 1) }));
          (wasFollowing ? unfollowUser(view.id) : followUser(view.id)).catch(() => {
            // revertir al estado previo al toggle
            setOverrides(o => ({ ...o, isFollowing: wasFollowing, followers: baseFollowers }));
          });
        }}
        onMessage={() => navigation.navigate('DirectChat', { userId: view.id, title: view.name ?? view.username })}
        onReserveCourt={(courtId) => navigation.navigate('ReserveBlocks', { clubId: view.id, courtId })}
        onOpenLive={(gameId) => navigation.navigate('GameDetail', { gameId })}
        onOpenClip={(clip) => setClipModal({ url: clip.videoUrl ?? '', title: clip.title, id: clip.id })}
        onOpenFollowers={() => setSheet('followers')}
        onOpenFollowing={() => setSheet('following')}
      />
      <FollowListSheet
        visible={sheet !== null}
        title={sheet === 'followers' ? 'Seguidores' : 'Siguiendo'}
        users={sheet === 'followers' ? view.followersList : view.followingList}
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
}

/* ─────────── Selector de club para reservar (POV player) ─────────── */

/**
 * Picker de club para iniciar una reserva. **Debe ser un componente propio** (no un
 * render-prop inline dentro de `<AppStack.Screen>`): cuando los hooks (`useFollowedClubs`)
 * viven en el callback `children` del Screen, sus `setState` NO re-renderizan el subárbol
 * → el `loading` quedaba en `true` para siempre (spinner infinito) aunque el fetch
 * resolviera. Con un componente real (fiber propio) el `setState` re-renderiza normal,
 * igual que `ClubProfileScreen`/`PlayerProfileScreen`.
 */
function ReservePickClubScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  // Carga los clubs seguidos con garantía de no quedar en carga infinita
  // (timeout + catch → []). Ver hooks/useFollowedClubs.ts.
  const { clubs: suggestedClubs, loading: loadingFollowed } = useFollowedClubs(
    user?.id,
    fetchFollowing,
  );
  return (
    <ReserveClubPickerScreen
      onBack={() => navigation.goBack()}
      suggestedClubs={suggestedClubs}
      loadingSuggested={loadingFollowed}
      // El buscador busca CLUBS (no canchas): solo nombre del club.
      onSearchClubs={async (q) => {
        const res = await searchUsersAndClubs(q);
        return res
          .filter((u) => u.isClub)
          .map((u) => ({
            id: u.id,
            name: u.name ?? u.username,
            username: atHandle(u.username),
            profilePicture: u.profilePicture ?? undefined,
            isClub: true,
          }));
      }}
      // Elegir un club (buscador o seguidos) → inicia la reserva (bloques del día).
      onPickClub={(clubId) => navigation.navigate('ReserveBlocks', { clubId })}
    />
  );
}

/* ─────────── Notificaciones (campanita) ─────────── */

/**
 * Contenedor de la campanita. **Componente propio** (no render-prop inline): los
 * `setState` de `useNotifications` dentro del callback `children` de un `<Screen>` no
 * re-renderizarían el subárbol.
 *
 * El tap resuelve el destino con **la misma tabla que el push** (`resolvePushTarget`),
 * usando el `data` guardado con la notificación.
 */
function NotificationsContainer({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const n = useNotifications();

  const open = (item: AppNotification) => {
    void n.markRead(item.id);
    const data: PushData = (item.data as PushData) ?? {
      type: item.type,
      gameId: item.gameId ?? undefined,
    };
    const target = resolvePushTarget(data);
    if (!target) return;
    // `resolvePushTarget` habla en términos del stack del player; una cuenta de club
    // no tiene `MainPlayer` como hogar.
    const name = target.name === 'MainPlayer' && user?.isClub ? 'MainClub' : target.name;
    navigation.navigate(name, target.params);
  };

  return (
    <NotificationsScreen
      items={n.items}
      loading={n.loading}
      hasMore={n.hasMore}
      unreadCount={n.unreadCount}
      onRefresh={n.refresh}
      onEndReached={n.loadMore}
      onPress={open}
      onMarkAllRead={n.markAllRead}
      onBack={() => navigation.goBack()}
    />
  );
}

/* ─────────── Reserva paso 1: bloques del día (POV player) ─────────── */

/**
 * Contenedor del paso de **bloques** (reemplazó a los dos pasos "elegir cancha" +
 * "día y horario"): trae las canchas activas del club y, para el día elegido, los slots
 * de TODAS ellas (`GET /padel-court/:id/slots?date=`, una request por cancha, igual que
 * `BloquesDisponibles` del desktop). La pantalla los agrupa por horario.
 *
 * Componente propio (NO render-prop inline): los `setState` de un hook dentro del
 * callback `children` de un `<Screen>` no re-renderizan el subárbol (React Navigation
 * memoiza el screen) → la lista quedaba en spinner infinito.
 */
function ReserveBlocksContainer({ route, navigation }: { route: any; navigation: any }) {
  const { clubId, courtId } = route.params || {};
  const days = React.useMemo(() => buildDays(6), []);
  const [courts, setCourts] = React.useState<ClubCourtPublic[]>([]);
  const [courtSlots, setCourtSlots] = React.useState<CourtSlots<ClubCourtPublic>[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [clubName, setClubName] = React.useState('');
  const [clubLoc, setClubLoc] = React.useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  React.useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    // En RN el fetch a veces cuelga sin resolver: sin timeout el spinner quedaría para
    // siempre. `withTimeout` garantiza que la carga SIEMPRE cierre.
    const withTimeout = <T,>(p: Promise<T>, ms: number, fb: T): Promise<T> =>
      Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fb), ms))]);
    (async () => {
      const cs = await withTimeout(
        fetchClubCourts(clubId).catch(() => [] as ClubCourtPublic[]), 6000, [],
      );
      const prof = await withTimeout(
        fetchUserProfile(clubId)
          .then((p) => ({ name: p.name ?? p.username, lat: p.latitude, lng: p.longitude }))
          .catch(() => null),
        6000, null,
      );
      if (!active) return;
      // Cancha inactiva = sin slots ni reservas: no entra a la grilla (igual que el desktop).
      setCourts(cs.filter((c) => c.active !== false));
      if (prof) { setClubName(prof.name); setClubLoc({ lat: prof.lat, lng: prof.lng }); }
    })();
    return () => { active = false; };
  }, [clubId]);

  // Un token por carga: si el usuario cambia de día rápido, la respuesta vieja que llega
  // tarde no debe pisar la nueva.
  const loadToken = React.useRef(0);
  const loadSlots = React.useCallback((iso: string | undefined, list: ClubCourtPublic[]) => {
    const token = ++loadToken.current;
    if (!iso || list.length === 0) { setCourtSlots([]); setLoading(false); return; }
    setLoading(true);
    Promise.all(
      list.map(async (court) => ({
        court,
        slots: await fetchCourtSlots(court.id, iso).catch(() => []),
      })),
    ).then((res) => {
      if (token !== loadToken.current) return;
      setCourtSlots(res);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => { loadSlots(days[0]?.iso, courts); }, [loadSlots, days, courts]);

  return (
    <ReserveBlocksScreen
      clubName={clubName}
      latitude={clubLoc.lat}
      longitude={clubLoc.lng}
      courtSlots={courtSlots}
      loading={loading}
      days={days}
      initialCourtId={courtId}
      onBack={() => navigation.goBack()}
      onDayChange={(d) => loadSlots(d.iso, courts)}
      onContinue={({ court, slot, day }) => navigation.navigate('ReserveInvite', {
        courtId: court.id,
        courtLabel: court.name,
        date: day.iso ?? '',
        slotStart: slot.start,
        slotEnd: slot.end,
        durationMinutes: slot.duration,
      })}
    />
  );
}

/* ─────────── Reserva paso 2: rivales + confirmar (POV player) ─────────── */

/** Componente propio: mantiene estable el ref `submitting` (guarda anti-doble-submit). */
function ReserveInviteScreen({ route, navigation }: { route: any; navigation: any }) {
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
            category: payload.category,
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
}

function AuthNavigator() {
  const { registerClub } = useAuth();
  const { colors } = useTheme();
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
      initialRouteName="LoginWithRole"
    >
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
            onForgot={(email?: string) =>
              navigation.navigate('ForgotPassword', { prefillEmail: email })
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

      <AuthStack.Screen name="Register">
        {({ navigation }) => (
          <RegisterClubScreen
            onBack={() => navigation.goBack()}
            onSubmit={async (form) => {
              // Alta real: crea la cuenta (Firebase + backend, status:false) sin
              // iniciar sesión; el club queda pendiente de aprobación → Pending.
              await registerClub(form.email, form.password, {
                username: form.username,
                name: form.name,
                region: form.region,
              });
              navigation.replace('Pending');
            }}
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

      <AuthStack.Screen name="ForgotPassword">
        {({ navigation, route }) => (
          <ForgotPasswordScreen
            prefillEmail={route.params?.prefillEmail}
            onBack={() => navigation.goBack()}
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

function MainPlayer({ navigation, route }: any) {
  const [tab, setTab] = React.useState<TabId>(route?.params?.initialTab ?? 'home');

  // Un push de partida (cancelada / baja / pareja que se bajó) navega acá con
  // `initialTab`. Si MainPlayer ya estaba montado, el estado inicial no alcanza:
  // hay que sincronizar. Se limpia el param para que el próximo push del mismo
  // tipo vuelva a disparar el efecto.
  React.useEffect(() => {
    const requested: TabId | undefined = route?.params?.initialTab;
    if (!requested) return;
    setTab(requested);
    navigation.setParams({ initialTab: undefined });
  }, [route?.params?.initialTab, navigation]);
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

  // Inbox de Chats (GET /chat/inbox): DMs 1-a-1 + chats grupales de partidas.
  const { items: inbox, loading: inboxLoading, refresh: refreshInbox, remove: removeChat } = useInbox();
  // Badge de la campanita (GET /notification/unread-count). Solo el contador: la lista
  // se carga recién al abrir la pantalla de Notificaciones.
  const { count: unreadNotifications, refresh: refreshNotificationBadge } = useNotificationBadge();

  // Aviso de partidas abiertas cercanas: acá vive el latido de la posición
  // (al montar y al volver del segundo plano, con un piso de 15 min). Va en
  // MainPlayer y no en una pantalla suelta porque el aviso tiene que seguir
  // andando use el usuario la app donde la use. **No pide permiso**: si el
  // opt-in está apagado o el permiso no está dado, no hace nada. El toggle
  // vive en `PlayerSettingsScreen`, y el ofrecimiento en la pestaña Juegos.
  const nearby = useNearbyLocation(!!user?.id);
  const [myGameSheet, setMyGameSheet] = React.useState<UpcomingGameData | null>(null);

  /**
   * Lo que muestra el strip "Tus próximas partidas" del Inicio.
   *
   * Derivado de `myGames` y no de un hook aparte: es la misma lista que la
   * pestaña Juegos, así que las dos pantallas no pueden mostrar cosas distintas
   * y no hay un segundo request. Se sacan las **LIVE** porque una partida en
   * curso no es "próxima" y además ya aparece en "En vivo" (el endpoint de lives
   * incluye las propias).
   */
  const proximas = React.useMemo(
    () => myGames.filter((g) => g.status !== 'LIVE'),
    [myGames],
  );

  /**
   * Invitar gente a una partida ya creada. El id se guarda aparte del sheet
   * porque la hoja de la partida se cierra al abrir la de invitar (dos Modals
   * apilados son frágiles en iOS).
   */
  const [inviteGame, setInviteGame] = React.useState<string | null>(null);
  const inviteToGame = React.useCallback(async (userIds: string[]) => {
    if (!inviteGame) return false;
    const g = myGames.find((x) => x.id === inviteGame);
    const cuando = g ? [g.date, g.time, g.court].filter(Boolean).join(' · ') : '';
    const texto = cuando ? `Te invito a jugar: ${cuando}` : 'Te invito a jugar';
    try {
      // En serie: son pocos y así un fallo no deja la mitad mandada sin saber cuál.
      for (const uid of userIds) await sendDirectMessage(uid, texto, inviteGame);
      return true;
    } catch {
      return false;
    }
  }, [inviteGame, myGames]);
  const { matches: apiMatches, refresh: refreshMatches } = usePlayerMatches(user?.id);

  // Directorio de jugadores reales (GET /user/players).
  const { players: playerList, refresh: refreshPlayers } = usePlayers();

  // ⚠️ Acá estaba `useUpcomingGames` (GET /game/:id/upcoming). Se eliminó: el
  // strip "Tus próximas partidas" sale de `myGames` (ver `proximas` abajo), que
  // es la misma lista de la pestaña Juegos y trae más datos. Mantener las dos
  // fuentes significaba un request extra en cada carga y en cada pull-to-refresh
  // para pintar lo mismo — y dos pantallas que podían discrepar.

  // Feed social: highlights de seguidos (GET /highlights/feed) → "Highlights · de tus seguidos".
  const { feed: feedPosts, refresh: refreshFeed } = useFeed(user?.id);

  // Jugadores invitables (elegir compañero al postularse): directorio mapeado.
  const invitablePlayers = React.useMemo<InvitablePlayer[]>(
    () => playerList.map((p) => ({ id: p.id, name: p.name, username: p.username })),
    [playerList],
  );

  // Búsqueda de compañero al sumarse a una partida abierta: prioriza gente que
  // seguís / te sigue (sugerencias + ranking) y busca contra GET /user/search.
  const { connections: partnerSuggestions, searchPartners } = usePartnerSearch(user?.id);

  // Perfil propio: identidad del usuario autenticado + conteos REALES de
  // seguidores/seguidos (count en BD vía GET /user/profile/:id).
  const { player: ownProfile, refresh: refreshOwnProfile } = useUserProfile(user?.id);

  // Conteos siempre frescos: re-fetchear el perfil propio cada vez que MainPlayer
  // recupera el foco (p. ej. al volver de PlayerProfile tras seguir/dejar de seguir
  // a alguien). Sin esto, MainPlayer queda montado y los conteos de seguidores/
  // seguidos se muestran viejos. Los números previos permanecen visibles hasta que
  // llega la respuesta (useUserProfile no limpia el perfil en el camino feliz).
  //
  // ⚠️ **Y las partidas propias.** `useMyGames` carga una sola vez, al montar, y
  // `MainPlayer` NO se desmonta al entrar al flujo de reserva: se apila encima.
  // Al volver (`popToTop`) el hook nunca reconsultaba, así que la partida recién
  // creada **no aparecía en "Mis partidas"** hasta reiniciar la app. Lo mismo
  // pasaba al postularse, al darse de baja o al aceptar a alguien desde otra
  // pantalla. Refrescar por foco lo cubre todo sin acoplar el flujo de reserva
  // con esta pantalla.
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshOwnProfile();
      refreshMyGames();
      refreshOpen();
    });
    return unsubscribe;
  }, [navigation, refreshOwnProfile, refreshMyGames, refreshOpen]);

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
    category: ownProfile?.category ?? null,
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshLive(),
      refreshOpen(),
      refreshMyGames(),
      refreshFeed(),
      refreshMatches(),
      refreshPlayers(),
      refreshOwnProfile(),
      refreshHighlights(),
      refreshInbox(),
      refreshNotificationBadge(),
      new Promise<void>((r) => setTimeout(r, 800)),
    ]);
    setRefreshing(false);
  }, [refreshLive, refreshOpen, refreshMyGames, refreshFeed, refreshMatches, refreshPlayers, refreshOwnProfile, refreshHighlights, refreshInbox, refreshNotificationBadge]);

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
    url: string; title: string; durationSeconds: number; highlightId?: string;
  } | null>(null);

  const openPreview = React.useCallback((item: LibraryItem) => {
    if (item.kind === 'match') {
      setPreviewVideo({ url: item.recordingUrl, title: item.title, durationSeconds: item.durationSeconds });
    } else if (item.kind === 'highlight') {
      // Pasamos highlightId → el modal habilita descripción + comentarios + threads
      // (GET /highlights/:id). Abrimos aunque falte streamUrl para no bloquear el
      // acceso a los comentarios.
      setPreviewVideo({
        url: item.streamUrl ?? '', title: item.title,
        durationSeconds: item.durationSeconds, highlightId: item.id,
      });
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

  const toggleVisibility = useHighlightVisibility(setHighlights, setMatches);

  // Editar la descripción de un highlight propio: flip optimista + persistir
  // (PATCH /highlights/:id); revertir si falla. Mismo patrón que toggleVisibility.
  const handleEditDescription = React.useCallback((item: LibraryHighlight, description: string) => {
    const prev = item.description ?? null;
    setHighlights(xs => xs.map(h => (h.id === item.id ? { ...h, description } : h)));
    updateHighlightMeta(item.id, { description }).catch(() => {
      setHighlights(xs => xs.map(h => (h.id === item.id ? { ...h, description: prev } : h)));
      Alert.alert('No se pudo guardar', 'Intentá de nuevo.');
    });
  }, []);

  const { logout } = useAuth();

  const handleTab = (id: TabId) => {
    setReelSection(null);
    setTab(id);
    if (id === 'profile') {
      setProfileView('profile');
      // Conteos frescos al abrir el perfil desde otro tab (complementa el refresco
      // por foco, que cubre el regreso desde rutas pushadas como PlayerProfile).
      refreshOwnProfile();
    }
  };

  function renderTabContent() {
    switch (tab) {
      case 'home':
        if (reelSection !== null) {
          return (
            <ReelViewScreen
              section={reelSection}
              liveGames={liveGames}
              upcomingGames={proximas}
              feedPosts={feedPosts}
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
            /* Sale de `myGames` (GET /game/mine), la MISMA fuente que la pestaña
               Juegos: así el Inicio y "Mis partidas" nunca discrepan y no cuesta
               un request extra. Se filtran las LIVE porque esas ya aparecen en
               "En vivo" (el endpoint de lives incluye las propias). */
            upcomingGames={proximas}
            onOpenUpcoming={(g) => setMyGameSheet(g)}
            feedPosts={feedPosts}
            activeTab="home" onChangeTab={handleTab}
            onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id, liveStreamUrl: liveGames.find(g => g.id === id)?.streamUrl })}
            onOpenSearch={() => navigation.navigate('GlobalSearch')}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            unreadNotifications={unreadNotifications}
            onOpenNotifications={() => navigation.navigate('Notifications')}
          />
        );
      case 'games':
        return (
          <GamesScreen games={[]} activeTab="games" onChangeTab={handleTab} role="player"
            emptyImage={require('./assets/racket.png')}
            onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id, liveStreamUrl: liveGames.find(g => g.id === id)?.streamUrl })}
            myGames={myGames}
            openGames={openGames}
            onOpenMyGame={(g) => setMyGameSheet(g)}
            onReserve={() => navigation.navigate('ReservePickClub')}
            /* Ofrecer el aviso de cercanía solo si está apagado y nunca se
               descartó. `enable()` es lo ÚNICO que pide el permiso del sistema,
               y acá sale en contexto: el usuario está mirando partidas abiertas. */
            nearbyPrompt={nearby.shouldPrompt ? {
              radiusKm: nearby.settings?.radiusKm,
              loading: nearby.loading,
              onEnable: () => {
                nearby.enable()
                  .then(() => nearby.dismissPrompt())
                  .catch(() => { /* el motivo ya queda en nearby.problem */ });
              },
              onDismiss: nearby.dismissPrompt,
            } : undefined}
          />
        );
      case 'chats':
        return (
          <ChatsInboxScreen
            items={inbox} loading={inboxLoading}
            activeTab="chats" onChangeTab={handleTab} role="player"
            refreshing={refreshing} onRefresh={handleRefresh}
            onOpenDm={(userId, title) => navigation.navigate('DirectChat', { userId, title })}
            onOpenGame={(gameId, title, readOnly) => navigation.navigate('GameChat', { gameId, title, readOnly })}
            onNewChat={() => navigation.navigate('GlobalSearch', { mode: 'chat' })}
            onDeleteChat={removeChat}
          />
        );
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
              onEditDescription={handleEditDescription}
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
        highlightId={previewVideo?.highlightId}
        showComments={!!previewVideo?.highlightId}
        onClose={() => setPreviewVideo(null)}
      />
      <UpcomingMatchSheet
        visible={myGameSheet !== null}
        game={myGameSheet}
        invitablePlayers={invitablePlayers}
        suggestedPartners={partnerSuggestions}
        onSearchPartner={searchPartners}
        onOpenChat={(gameId, title, readOnly) => { setMyGameSheet(null); navigation.navigate('GameChat', { gameId, title, readOnly }); }}
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
        /* Se cierra la hoja antes de abrir la de invitar: dos Modals apilados
           son frágiles en iOS y el usuario vuelve acá igual al terminar. */
        onInvite={(gameId) => { setMyGameSheet(null); setInviteGame(gameId); }}
      />

      {/* Invitar a una partida YA creada, desde cualquier participante. */}
      <ShareGameSheet
        visible={inviteGame !== null}
        items={inbox}
        loading={inboxLoading}
        onClose={() => setInviteGame(null)}
        onSend={inviteToGame}
        onSearch={async (q) => {
          const res = await searchUsers(q);
          return res.map((u) => ({
            id: u.id,
            name: u.name ?? u.username,
            avatar: u.profilePicture ?? undefined,
          }));
        }}
        title="Invitar a la partida"
        subtitle="Se envía por chat, con la partida adjunta para que se postulen de una."
        sendLabel="Invitar"
      />
    </>
  );
}

/* ─────────── Main tabs · CLUB ─────────── */

function MainClub({ navigation }: any) {
  const [tab, setTab] = React.useState<TabId>('home');
  const { user } = useAuth();
  const clubId = user?.id;

  // Datos reales del club autenticado (canchas, partidas).
  const { games: clubGames } = useClubGames(clubId);
  const [courts, setCourts] = React.useState<CourtData[]>([]);
  // Inbox de Chats del club (DMs 1-a-1 + chats grupales de partidas).
  const {
    items: clubInbox, loading: clubInboxLoading, refresh: refreshClubInbox, remove: removeClubChat,
  } = useInbox();
  // Badge de la campanita del club (mismos endpoints que el player).
  const { count: clubUnreadNotifications } = useNotificationBadge();
  React.useEffect(() => {
    if (!clubId) return;
    fetchClubCourts(clubId)
      .then((cs) => setCourts(cs.map((c) => ({
        id: c.id, name: c.name, cams: c.cams, next: c.nextSlot || null,
      }))))
      .catch(() => setCourts([]));
  }, [clubId]);

  // Perfil del club derivado del usuario autenticado (no hay mock).
  const clubProfile: ClubProfile = {
    name: user?.name ?? user?.username ?? '',
    username: atHandle(user?.username),
    address: '',
    phone: user?.phone ?? '',
    description: '',
    region: user?.region ?? '',
  };

  /**
   * Ubicación del club: se pide una vez, después del login, si falta. Sin ella el
   * club no aparece en el mapa y sus partidas abiertas no avisan a los jugadores
   * de la zona (el fan-out de `OPEN_GAME_NEARBY` se ancla en la cancha).
   *
   * Va acá y no en `ClubHomeScreen` porque las pestañas se cambian sin desmontar
   * `MainClub`: si el admin entra y se va a Canchas, el aviso tiene que seguir.
   * "Ahora no" lo calla hasta el próximo arranque, no para siempre.
   */
  const clubLocation = useClubLocation(!!clubId);
  const [locationPostponed, setLocationPostponed] = React.useState(false);
  const askLocation = !locationPostponed && clubLocation.location?.hasLocation === false;

  const screen = renderClubTab();

  return (
    <>
      {screen}
      <ClubLocationSheet
        visible={askLocation}
        onClose={() => setLocationPostponed(true)}
        onSaved={() => setLocationPostponed(true)}
      />
    </>
  );

  function renderClubTab() {
  switch (tab) {
    case 'home':
      return (
        <ClubHomeScreen
          clubName={clubProfile.name}
          liveGames={[]}
          todayReservations={[]}
          activeTab="home" onChangeTab={setTab}
          onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id })}
          unreadNotifications={clubUnreadNotifications}
          onOpenNotifications={() => navigation.navigate('Notifications')}
        />
      );
    case 'games':
      return (
        <GamesScreen games={clubGames} activeTab="games" onChangeTab={setTab} role="club"
          emptyImage={require('./assets/racket.png')}
          onOpenGame={(id) => navigation.navigate('GameDetail', { gameId: id })}
        />
      );
    case 'courts':
      return <CourtsScreen courts={courts} activeTab="courts" onChangeTab={setTab} role="club"
        onOpenCourt={(c) => c.live && navigation.navigate('GameDetail', { gameId: c.live.gameId })} />;
    case 'chats':
      return (
        <ChatsInboxScreen
          items={clubInbox} loading={clubInboxLoading}
          activeTab="chats" onChangeTab={setTab} role="club"
          refreshing={clubInboxLoading} onRefresh={refreshClubInbox}
          onOpenDm={(userId, title) => navigation.navigate('DirectChat', { userId, title })}
          onOpenGame={(gameId, title, readOnly) => navigation.navigate('GameChat', { gameId, title, readOnly })}
          onNewChat={() => navigation.navigate('GlobalSearch', { mode: 'chat' })}
          onDeleteChat={removeClubChat}
        />
      );
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
}

/* ─────────── Reserva confirmada ─────────── */

/**
 * Pantalla de "¡Reserva confirmada!" + **compartir la invitación dentro de la app**.
 *
 * ⚠️ Tiene que ser un componente propio y no el callback `children` del
 * `<Screen>`: acá se usan hooks (`useInbox`, estado del sheet), y el callback
 * inline queda envuelto en un `StaticContainer` que ignora `children` al
 * comparar props — el mismo motivo por el que existe `GameDetailContainer`.
 *
 * El botón "Compartir invitación" existía desde antes pero estaba cableado a
 * `onShare={() => {}}`: se renderizaba y no hacía absolutamente nada.
 */
function ReserveOkContainer({ route, navigation }: { route: any; navigation: any }) {
  const { reservationId, courtLabel, whenLabel } = route.params || ({} as any);
  const [shareOpen, setShareOpen] = React.useState(false);
  const { items: inbox, loading: inboxLoading } = useInbox();

  /**
   * Manda la invitación como DM con la partida adjunta (`DirectMessage.gameId`),
   * así el otro ve una **tarjeta abrible** y no un texto suelto — el mismo
   * mecanismo que "compartir partido" del visor.
   */
  const invite = React.useCallback(async (userIds: string[]) => {
    if (!reservationId) return false;
    const cuando = [courtLabel, whenLabel].filter(Boolean).join(' · ');
    const texto = cuando ? `Te invito a jugar: ${cuando}` : 'Te invito a jugar';
    try {
      // En serie: son pocos y así un fallo no deja la mitad mandada sin saber cuál.
      for (const uid of userIds) await sendDirectMessage(uid, texto, reservationId);
      return true;
    } catch {
      return false;
    }
  }, [reservationId, courtLabel, whenLabel]);

  return (
    <>
      {/* Sin fila "Código": era el UUID de la partida y ningún ID se muestra en
          la app. Si hiciera falta un código de reserva legible, tiene que ser uno
          corto pensado para leerse, no el identificador interno. */}
      <ReserveSuccessScreen
        summary={[
          { label: 'Cancha',  value: courtLabel || '—' },
          { label: 'Horario', value: whenLabel || '—' },
          { label: 'Pago',    value: 'En el club' },
        ]}
        heroLine="¡Reserva confirmada! Te esperamos en la cancha."
        onBackToClub={() => navigation.popToTop()}
        // Sin id de reserva no hay nada que adjuntar: se oculta el botón en vez
        // de ofrecer uno que no puede funcionar.
        onShare={reservationId ? () => setShareOpen(true) : undefined}
      />

      <ShareGameSheet
        visible={shareOpen}
        items={inbox}
        loading={inboxLoading}
        onClose={() => setShareOpen(false)}
        onSend={invite}
        // La búsqueda es lo que hace usable esto: a quien invitás a una partida
        // nueva es justo con quien todavía no chateaste.
        onSearch={async (q) => {
          const res = await searchUsers(q);
          return res.map((u) => ({
            id: u.id,
            name: u.name ?? u.username,
            avatar: u.profilePicture ?? undefined,
          }));
        }}
        title="Invitar a jugar"
        subtitle="Se envía por chat, con la partida adjunta para que la abran de una."
        sendLabel="Invitar"
      />
    </>
  );
}

/* ─────────── Game detail ─────────── */

/**
 * Contenedor del visor. **Tiene que ser un componente propio**, no el callback
 * `children` del `<Screen>`: React Navigation envuelve ese callback en un
 * `StaticContainer` que ignora `children` al comparar props, así que los
 * `setState` de los hooks (acá `useGameDetail`) re-renderizan pero el subárbol
 * se queda con el PRIMER elemento — el de `detail === null`.
 *
 * Ese era el bug de "entro desde la notificación y no se ve el stream": el
 * detalle llegaba con sus cámaras y el render nunca las tomaba, así que el
 * visor se quedaba con `emptyGameDetail` (`cameras: []`). Desde Inicio no se
 * notaba porque ahí el `liveStreamUrl` viaja en `route.params` y ya está en ese
 * primer render — tapaba la falla en lugar de arreglarla. Con fiber propio el
 * `setState` re-renderiza normal. Ver la regla en `expo/CLAUDE.md`.
 */
function GameDetailContainer({ navigation, route }: { navigation: any; route: any }) {
  const [following, setFollowing] = React.useState(false);
  const isClip = !!route.params?.clipData;
  // Trae el partido real (cámaras + stream HLS) y el recordingUrl para el editor.
  const { game: apiGame, detail } = useGameDetail(route.params?.gameId);
  const game: GameDetailData =
    route.params?.clipData ?? detail ?? emptyGameDetail(route.params?.gameId ?? '');
  const recordingUrl = apiGame?.recordingUrl ?? null;
  const canCreateHighlight = !isClip && !!recordingUrl;
  // Seguir al club del partido: hidrata el estado real y persiste el toggle
  // (mismo contrato POST /follow | /follow/unfollow que los perfiles públicos).
  const clubId = game.clubId;
  React.useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    fetchUserProfile(clubId)
      .then((p) => { if (!cancelled) setFollowing(p.isFollowing ?? false); })
      .catch(() => { /* sin dato → queda en "Seguir" */ });
    return () => { cancelled = true; };
  }, [clubId]);

  /**
   * Compartir el partido por chat. Las conversaciones salen del inbox que ya
   * existe (`useInbox`), así que no hace falta ningún endpoint nuevo para elegir
   * a quién mandárselo; el mensaje lleva el `gameId` y llega como tarjeta abrible.
   */
  const [shareOpen, setShareOpen] = React.useState(false);
  const { items: shareTargets, loading: loadingTargets } = useInbox();
  const shareTo = React.useCallback(async (userIds: string[]) => {
    const gameId = route.params?.gameId;
    if (!gameId) return false;
    const texto = game.club ? `Mirá este partido en ${game.club}` : 'Mirá este partido';
    try {
      // En serie y no en paralelo: son pocos destinatarios y así un fallo no deja
      // la mitad enviada sin que se sepa cuál.
      for (const uid of userIds) await sendDirectMessage(uid, texto, gameId);
      return true;
    } catch {
      return false;
    }
  }, [route.params?.gameId, game.club]);

  return (
    <>
    <GameDetailScreen
      game={game}
      fallbackStreamUrl={route.params?.liveStreamUrl}
      isFollowing={following}
      onToggleFollow={clubId ? () => {
        const wasFollowing = following;
        setFollowing(!wasFollowing);
        (wasFollowing ? unfollowUser(clubId) : followUser(clubId))
          .catch(() => setFollowing(wasFollowing)); // revertir en error
      } : undefined}
      onBack={() => navigation.goBack()}
      // Desde el panel de jugadores se abre el perfil de cualquiera: los jugadores
      // por su UID y el club por el suyo (un club es un User con isClub=true).
      onOpenPlayer={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
      onOpenClub={(id) => navigation.navigate('ClubProfile', { clubId: id })}
      onShare={route.params?.gameId ? () => setShareOpen(true) : undefined}
      onCreateHighlight={canCreateHighlight ? () => navigation.navigate('VideoEditor', {
        gameId: apiGame!.id,
        recordingUrl: recordingUrl!,
        durationSeconds: apiGame!.durationSeconds ?? 0,
      }) : undefined}
    />
    <ShareGameSheet
      visible={shareOpen}
      items={shareTargets}
      loading={loadingTargets}
      onClose={() => setShareOpen(false)}
      onSend={shareTo}
    />
    </>
  );
}

/* ─────────── App stack navigator ─────────── */

function AppNavigator() {
  const { user } = useAuth();
  const { colors } = useTheme();
  // Derive initial route from the authenticated user's role
  const initialRoute: keyof AppStackParamList = user?.isClub ? 'MainClub' : 'MainPlayer';

  return (
    <AppStack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
      initialRouteName={initialRoute}
    >
      {/* Main tab containers */}
      <AppStack.Screen name="MainPlayer" component={MainPlayer} />
      <AppStack.Screen name="MainClub"   component={MainClub} />

      {/* Game detail */}
      <AppStack.Screen name="GameDetail">
        {({ navigation, route }) => (
          // key={gameId}: montaje fresco por partido (no arrastra la cámara activa
          // ni el estado de pantalla completa del anterior).
          <GameDetailContainer
            key={route.params?.gameId ?? ''}
            navigation={navigation}
            route={route}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="GameChat">
        {({ navigation, route }) => (
          <GameChatScreen
            gameId={route.params?.gameId ?? ''}
            title={route.params?.title}
            readOnly={route.params?.readOnly}
            onBack={() => navigation.goBack()}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="DirectChat">
        {({ navigation, route }) => (
          // key={userId}: montaje fresco por conversación (evita arrastrar mensajes).
          <DirectChatScreen
            key={route.params?.userId ?? ''}
            userId={route.params?.userId ?? ''}
            title={route.params?.title}
            onBack={() => navigation.goBack()}
            onOpenGame={(gameId) => navigation.navigate('GameDetail', { gameId })}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="Notifications">
        {({ navigation }) => <NotificationsContainer navigation={navigation} />}
      </AppStack.Screen>

      {/* Player POV flows */}
      <AppStack.Screen name="ClubProfile">
        {({ navigation, route }) => (
          // key={clubId}: montaje fresco por club (igual que PlayerProfile), para que el
          // estado de follow (overrides) no se arrastre entre navegaciones.
          <ClubProfileScreen
            key={route.params?.clubId ?? ''}
            navigation={navigation}
            clubId={route.params?.clubId ?? ''}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="PlayerProfile">
        {({ navigation, route }) => (
          // `key={playerId}` fuerza un montaje fresco al navegar de un perfil a
          // otro (la lista de seguidores es recursiva): cada perfil arranca su
          // propia carga, sin arrastrar datos del anterior ni quedar colgado.
          <PlayerProfileScreen
            key={route.params?.playerId ?? ''}
            navigation={navigation}
            playerId={route.params?.playerId ?? ''}
          />
        )}
      </AppStack.Screen>

      <AppStack.Screen name="ReservePickClub">
        {({ navigation }) => <ReservePickClubScreen navigation={navigation} />}
      </AppStack.Screen>

      <AppStack.Screen name="GlobalSearch">
        {({ navigation, route }) => {
          // mode 'chat': elegir un usuario abre/crea un DM en vez del perfil.
          const chatMode = route.params?.mode === 'chat';
          const onPick = chatMode
            ? (id: string) => navigation.replace('DirectChat', { userId: id })
            : undefined;
          return (
            <GlobalSearchScreen
              players={[]}
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
              onOpenPlayerProfile={onPick ?? ((id) => navigation.navigate('PlayerProfile', { playerId: id }))}
              onOpenClubProfile={onPick ?? ((id) => navigation.navigate('ClubProfile', { clubId: id }))}
            />
          );
        }}
      </AppStack.Screen>

      {/* Reservation flow */}
      <AppStack.Screen name="ReserveBlocks">
        {({ route, navigation }) => <ReserveBlocksContainer route={route} navigation={navigation} />}
      </AppStack.Screen>

      <AppStack.Screen name="ReserveInvite">
        {({ route, navigation }) => <ReserveInviteScreen route={route} navigation={navigation} />}
      </AppStack.Screen>

      <AppStack.Screen name="ReserveOk">
        {({ route, navigation }) => <ReserveOkContainer route={route} navigation={navigation} />}
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
      <NavigationContainer ref={navigationRef} theme={navTheme} onReady={onNavigationReady}>
        <SplashScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} onReady={onNavigationReady}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {user ? <AppNavigator /> : <AuthNavigator />}
      {/* Mini notificación in-app. Va DESPUÉS del navigator (queda encima) y
          fuera de él: por eso recibe el navigationRef en vez de useNavigation(). */}
      {user && <InAppNotificationHost navigationRef={navigationRef} isClub={user.isClub} />}
    </NavigationContainer>
  );
}

/* ─────────── App entry ─────────── */

export default function App() {
  const navigationRef = useRef<any>(null);

  // Push: init + listeners viven en services/notifications.ts (routing table de
  // los 8 tipos que emite el backend, buffer de cold start y supresión en
  // primer plano). El permiso NO se pide acá sino tras el login, en contexto.
  useEffect(() => {
    initNotifications(navigationRef);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#2d4c75' }}>
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
