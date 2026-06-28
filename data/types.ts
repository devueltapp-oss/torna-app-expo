/**
 * Tipos públicos del modelo de datos de la app.
 *
 * Antes este archivo (`mocks.ts`) contenía constantes `MOCK_*` con datos falsos
 * para previsualizar la UI. Esos mocks se eliminaron: la app ahora consume la
 * API real y muestra estados vacíos donde todavía no hay endpoint. Acá quedan
 * solo las definiciones de tipos, compartidas por pantallas y componentes.
 */
import { LiveGameData, GameListData, CourtData, PlayerData, MatchParticipant } from '../components/cards';
import { GameDetailData, ClubProfile } from '../screens';

/* ─────────── Re-exports de tipos de cards/screens usados vía este barrel ─────────── */
export type { LiveGameData, GameListData, CourtData, PlayerData, MatchParticipant };
export type { GameDetailData, ClubProfile };

/* ─────────── Próximos partidos / aplicaciones ─────────── */

export interface UpcomingGamePlayer {
  id?: string;
  username: string;
  name?: string;
  profilePicture?: string;
  team?: 1 | 2;
}

export interface GameApplication {
  id: string;
  applicant: UpcomingGamePlayer;
  partner?: UpcomingGamePlayer;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface UpcomingGameData {
  id: string;
  time: string;
  date?: string;
  court: string;
  club: string;
  players: UpcomingGamePlayer[];
  following: 'club' | 'player';
  byPlayer?: string;
  isOpenForPlayers?: boolean;
  maxPlayers?: number;
  isCreator?: boolean;
  applications?: GameApplication[];
  /** Estado real de la partida (SCHEDULED/WAITING/LIVE/…). */
  status?: string;
  /** Equipo del usuario autenticado (1 = lado owner, 2 = pareja retadora). */
  myTeam?: 1 | 2;
  /** True si el usuario autenticado participa de la partida. */
  viewerIsParticipant?: boolean;
  /** Ubicación del club (para abrir el pin exacto en Google Maps). */
  clubLat?: number | null;
  clubLng?: number | null;
}

/* ─────────── Club admin: reservas del día ─────────── */

export interface ClubTodayReservation {
  id: string;
  time: string;
  court: string;
  bookedBy: string;
  partner: string;
  mode: 'full' | 'search-opponents';
  paymentPending: boolean;
  partyOf: number;
}

/* ─────────── Club público (POV player) ─────────── */

export interface LivePreview {
  id: string; court: string; viewers: number;
  players: MatchParticipant[];
  streamUrl?: string;
}
export interface ClipPreview {
  id: string; title: string; length: string; date: string;
}
export interface ClubCourtPublic {
  id: string; name: string;
  surface: 'CLAY' | 'GRASS' | 'HARD' | 'CARPET';
  cams: number; indoor: boolean;
  nextSlot: string;
}
export interface UpcomingPublicGame {
  id: string; court: string; time: string; date: string; players: number;
}
export interface DirectoryPlayer {
  id: string; name: string; username: string;
}
export interface FollowItem {
  id: string;
  name: string;
  username: string;
  profilePicture?: string;
}
export interface ClubPublic {
  id: string;
  name: string;
  handle: string;
  city: string;
  followers: number;
  isFollowing: boolean;
  hours: string;
  phone: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  highlights: { live: LivePreview[]; clips: ClipPreview[] };
  courts: ClubCourtPublic[];
  upcoming: UpcomingPublicGame[];
  members: DirectoryPlayer[];
  /** Grid de fotos. URLs en prod. */
  photos: number[];
}

/* ─────────── Flujo de reserva ─────────── */

export type SlotStatus = 'free' | 'reserved' | 'own';

export interface Slot {
  start: string;     // 'HH:mm'
  end: string;       // 'HH:mm'
  duration: 60 | 90;
  price: number;     // ARS
  status: SlotStatus;
  /** True si el partido reservado se transmite desde este slot. */
  cams: boolean;
}

export interface InvitablePlayer {
  id: string;
  name: string;
  username: string;
  /** Rating del jugador. Opcional: el backend de búsqueda aún no lo devuelve. */
  rating?: number;
}

/* ─────────── Perfil público de un player ─────────── */

export interface PlayerLiveGame {
  id: string; court: string; club: string; viewers: number;
  players: MatchParticipant[];
  streamUrl?: string;
}
export interface PlayerClip {
  id: string; title: string; length: string; date: string;
  videoUrl?: string;
}
export interface PlayerPublic {
  id: string;
  name: string;
  username: string;
  club: string;
  location: string;
  followers: number;
  isFollowing: boolean;
  /** True cuando el player está en un partido transmitido en vivo. */
  isLiveNow: boolean;
  liveGame: PlayerLiveGame | null;
  clips: PlayerClip[];
  /** Legacy: el perfil ya no muestra fotos sueltas (el contenido son highlights). */
  photos?: number[];
  notifyOnMatch?: boolean;
  followingCount: number;
  followersList: FollowItem[];
  followingList: FollowItem[];
}

/* ─────────── Búsqueda global (texto) ─────────── */

export interface SearchablePlayer {
  id: string;
  name: string;
  username: string;
  /** Rating del jugador. Opcional: el backend de búsqueda aún no lo devuelve. */
  rating?: number;
}

/** Resultado de la búsqueda combinada de jugadores y clubs (GET /user/search-all). */
export interface SearchableUser {
  id: string;
  name: string;
  username: string;
  /** Foto de perfil (URL B2). Si falta, el Avatar cae a iniciales. */
  profilePicture?: string;
  /** true = club, false = jugador. */
  isClub: boolean;
}

export interface SearchableCourt {
  id: string;
  name: string;
  club: string;
  clubId: string;
  surface: 'CLAY' | 'GRASS' | 'HARD' | 'CARPET';
  hasCameras: boolean;
}

/* ─────────── Feed social (home del player) ─────────── */

export type FeedPostType = 'photo' | 'highlight';
export type FeedPostTone = 'lime' | 'blue' | 'white';

export interface FeedPost {
  id: string;
  type: FeedPostType;
  author: { name: string; username: string; role: 'player' | 'club' };
  contextLine?: string;
  duration?: string;
  caption?: string;
  postedAt: string;
  likes: number;
  comments: number;
  tone?: FeedPostTone;
  mediaAspectRatio?: string;
  videoUrl?: string;
}

/* ─────────── Perfil propio del player ─────────── */

export interface ProfileOwner {
  name: string;
  username: string;
  club: string;
  location: string;
  followers: number;
  following: number;
  /** Foto de perfil (URL B2). Si falta, el Avatar cae a iniciales. */
  profilePicture?: string;
}

/* ─────────── Librería del player ─────────── */

export type LibrarySurface = 'CLAY' | 'GRASS' | 'HARD' | 'CARPET';

interface LibraryItemBase {
  id: string;
  title: string;
  isPublic: boolean;
  /** Duración en segundos. Undefined para fotos. */
  durationSeconds?: number;
  /** Label humano (e.g. '0:24' o '2:22 hs'). */
  durationLabel?: string;
  /** Línea contextual debajo del título. */
  subtitle?: string;
  /** Free-text de fecha ("Ayer", "12 nov"). */
  date?: string;
}

export interface LibraryMatch extends LibraryItemBase {
  kind: 'match';
  surface: LibrarySurface;
  cameras: number;
  highlightsCount: number;
  /** URL del HLS del partido completo — se pasa al VideoEditor al recortar. */
  recordingUrl: string;
  durationSeconds: number;
  /** True si ya se registró el resultado propio (gané/perdí) de esta partida. */
  resultRegistered?: boolean;
}

export interface LibraryHighlight extends LibraryItemBase {
  kind: 'highlight';
  /** Partido de origen, si fue recortado del editor. */
  fromMatch?: string;
  durationSeconds: number;
  /** URL del clip en B2 (o CDN). Presente cuando el highlight fue procesado. */
  streamUrl?: string;
}

export type LibraryItem = LibraryMatch | LibraryHighlight;
