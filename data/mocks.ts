/**
 * Mock data for previewing the kit. Replace with API responses in real app.
 *
 * Every export is a flat-typed const so screens stay decoupled from the data
 * layer. When the backend ships, the producer of each mock becomes a hook
 * (`useFeed`, `useClubProfile`, etc.); types stay identical.
 */
import { LiveGameData, GameListData, CourtData, PlayerData, MatchParticipant } from '../components/cards';
import { GameDetailData, ClubProfile } from '../screens';

/* ─────────── Existing mocks (club admin views) ─────────── */

export const MOCK_LIVE_GAMES: LiveGameData[] = [
  {
    id: 'G-7421', viewers: 47,
    players: [
      { username: '@maxi',  name: 'Maxi Rodríguez' },
      { username: '@lu',    name: 'Lucía Paredes' },
      { username: '@diego', name: 'Diego Vázquez' },
      { username: '@javi',  name: 'Javi M.' },
    ],
    club: 'Club Pádel BSAS', court: 'Cancha 3',
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  },
  {
    id: 'G-7414', viewers: 18,
    players: [
      { username: '@nico', name: 'Nico Suárez' },
      { username: '@flor', name: 'Flor B.' },
    ],
    club: 'Padel Norte', court: 'Cancha 1',
    streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8',
  },
  {
    id: 'G-7402', viewers: 33,
    players: [
      { username: '@pablo', name: 'Pablo S.' },
      { username: '@carla', name: 'Carla M.' },
      { username: '@jp',    name: 'JP T.' },
      { username: '@mar',   name: 'Mar D.' },
    ],
    club: 'Club Recoleta', court: 'Cancha 2',
    streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/adv_dv_atmos/main.m3u8',
  },
  {
    id: 'G-7397', viewers: 9,
    players: [
      { username: '@dani', name: 'Dani G.' },
      { username: '@vero', name: 'Vero L.' },
    ],
    club: 'Padel Sur', court: 'Cancha 4',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 'G-7395', viewers: 62,
    players: [
      { username: '@andres', name: 'Andrés P.' },
      { username: '@sofi',   name: 'Sofía M.' },
      { username: '@ger',    name: 'Ger H.' },
      { username: '@cami',   name: 'Cami V.' },
    ],
    club: 'Club Pádel BSAS', court: 'Cancha 5',
    streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
  },
];

export const MOCK_GAMES_LIST: GameListData[] = [
  { id: 'G-7421', court: 'Cancha 3', cam: 'CAM 02', players: 4, time: '18:30', date: '12 nov', status: 'LIVE' },
  { id: 'G-7422', court: 'Cancha 1', cam: 'CAM 01', players: 2, time: '19:00', date: '12 nov', status: 'SCHEDULED' },
  { id: 'G-7414', court: 'Cancha 2', cam: 'CAM 03', players: 4, time: '17:00', date: '12 nov', status: 'STOPPED' },
  { id: 'G-7401', court: 'Cancha 3', cam: 'CAM 02', players: 4, time: '16:00', date: '12 nov', status: 'FINISHED' },
  { id: 'G-7392', court: 'Cancha 5', cam: 'CAM 04', players: 2, time: '14:30', date: '12 nov', status: 'FINISHED' },
  { id: 'G-7388', court: 'Cancha 1', cam: 'CAM 01', players: 4, time: '12:00', date: '12 nov', status: 'FINISHED' },
];

export const MOCK_COURTS: CourtData[] = [
  { id: 'C1', name: 'Cancha 1', surface: 'CLAY',   description: 'Pista abierta · iluminación LED.',           cams: 2, live: { gameId: 'G-7388', viewers: 12 } },
  { id: 'C2', name: 'Cancha 2', surface: 'CLAY',   description: 'Pista cubierta, junto al bar.',              cams: 2, live: null, next: '19:00' },
  { id: 'C3', name: 'Cancha 3', surface: 'HARD',   description: 'Pista cubierta · cristal panorámico · LED.', cams: 3, live: { gameId: 'G-7421', viewers: 47 } },
  { id: 'C4', name: 'Cancha 4', surface: 'GRASS',  description: null,                                          cams: 2, live: null, next: '20:30' },
  { id: 'C5', name: 'Cancha 5', surface: 'CARPET', description: 'Pista exterior · suelo sintético.',          cams: 2, live: null, next: null },
];

export const MOCK_PLAYERS: PlayerData[] = [
  { id: '1042', name: 'Maxi Rodríguez',  username: '@maxi.r',  email: 'maxi@padelclub.com' },
  { id: '1043', name: 'Lucía Paredes',   username: '@lupare',  email: 'lucia.p@torna.io' },
  { id: '1044', name: 'Diego Vázquez',   username: '@dievaz',  email: 'diego@padelclub.com' },
  { id: '1045', name: 'Javier Martínez', username: '@javim',   email: 'javi@padelclub.com' },
  { id: '1046', name: 'Florencia Bauer', username: '@florb',   email: 'flor@padelclub.com' },
  { id: '1047', name: 'Nicolás Suárez',  username: '@nicosua', email: 'nico@padelclub.com' },
];

export const MOCK_GAME_DETAIL: GameDetailData = {
  id: 'G-7421',
  court: 'Cancha 3', floor: 'CLAY',
  club: 'Club Pádel Buenos Aires', clubHandle: '@padelbsas', clubFollowers: 1400,
  time: '18:30', date: '12 nov',
  viewers: 47, isLive: true,
  players: [
    { username: '@maxi',  name: 'Maxi Rodríguez' },
    { username: '@lu',    name: 'Lucía Paredes' },
    { username: '@diego', name: 'Diego Vázquez' },
    { username: '@javi',  name: 'Javi M.' },
  ],
  cameras: [
    { id: 'cam-01', number: '01', label: 'Panorámica', state: 'available',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
    { id: 'cam-02', number: '02', label: 'Lateral',    state: 'available',
      streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8' },
    { id: 'cam-03', number: '03', label: 'Fondo',      state: 'available',
      streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8' },
  ],
};

export interface UpcomingGamePlayer {
  id?: string;
  username: string;
  name?: string;
  profilePicture?: string;
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
}

export const MOCK_UPCOMING_GAMES: UpcomingGameData[] = [
  { id: 'G-7430', time: '19:00', date: 'Hoy', court: 'Cancha 2', club: 'Club Pádel BSAS',
    players: [
      { id: 'p-1042', username: '@maxi', name: 'Maxi Rodríguez' },
      { id: 'p-1043', username: '@lu',   name: 'Lucía Paredes' },
    ],
    following: 'club', isOpenForPlayers: true, maxPlayers: 4 },
  { id: 'G-7431', time: '20:30', date: 'Hoy', court: 'Cancha 5', club: 'Padel Norte',
    players: [
      { id: 'p-1046', username: '@flor',  name: 'Flor Bauer' },
      { id: 'p-1047', username: '@nico',  name: 'Nico Suárez' },
      { id: 'p-1044', username: '@jp',    name: 'JP Torres' },
      { id: 'p-1045', username: '@mar',   name: 'Mar Díaz' },
    ],
    following: 'club', maxPlayers: 4 },
  { id: 'G-7444', time: '21:00', date: 'Mañana', court: 'Cancha 1', club: 'Club Recoleta',
    players: [
      { id: 'p-1042', username: '@maxi',  name: 'Maxi Rodríguez' },
      { id: 'p-1044', username: '@diego', name: 'Diego Vázquez' },
    ],
    following: 'player', byPlayer: '@maxi', isOpenForPlayers: true, maxPlayers: 4 },
  { id: 'G-7450', time: '18:00', date: 'Hoy', court: 'Cancha 3', club: 'Club Pádel BSAS',
    players: [
      { id: 'me', username: '@vos', name: 'Tú' },
      { id: 'p-1043', username: '@lu', name: 'Lucía Paredes' },
    ],
    following: 'club', isOpenForPlayers: true, maxPlayers: 4,
    isCreator: true,
    applications: [
      {
        id: 'app-001',
        applicant: { id: 'p-2001', username: '@carlos', name: 'Carlos Méndez' },
        partner: { id: 'p-2002', username: '@romi', name: 'Romina Paz' },
        status: 'PENDING',
      },
      {
        id: 'app-002',
        applicant: { id: 'p-2003', username: '@santi', name: 'Santiago López' },
        status: 'PENDING',
      },
    ],
  },
];

export const MOCK_PROFILE: ClubProfile = {
  name: 'Club Pádel Buenos Aires',
  username: '@padelbsas',
  address: 'Av. Libertador 1234, CABA',
  phone: '+54 11 4123 4567',
  description: 'Club de pádel con 8 canchas. Ligas, clases y eventos.',
  region: 'Buenos Aires, AR',
};

/* ─────────── Club admin: today's reservations ─────────── */

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

export const MOCK_CLUB_TODAY: ClubTodayReservation[] = [
  { id: 'R-7501', time: '18:30', court: 'Cancha 3', bookedBy: 'Maxi R.',  partner: 'Lucía P.',  mode: 'full',              paymentPending: true,  partyOf: 4 },
  { id: 'R-7502', time: '19:00', court: 'Cancha 1', bookedBy: 'Pablo S.', partner: 'Carla M.',  mode: 'search-opponents',  paymentPending: true,  partyOf: 2 },
  { id: 'R-7503', time: '20:30', court: 'Cancha 2', bookedBy: 'Nico S.',  partner: 'Flor B.',   mode: 'full',              paymentPending: false, partyOf: 4 },
  { id: 'R-7504', time: '21:00', court: 'Cancha 4', bookedBy: 'Diego V.', partner: 'Javi M.',   mode: 'full',              paymentPending: true,  partyOf: 4 },
];

/* ─────────── Club public profile (player POV) ───────────
 *   GET /clubs/:id           → ClubPublic
 *   GET /clubs/:id/highlights → { live: LivePreview[], clips: ClipPreview[] }
 *   GET /clubs/:id/upcoming   → UpcomingPublicGame[]
 *   GET /clubs/:id/members    → DirectoryPlayer[]
 *   GET /clubs/:id/photos     → string[]   (just URLs in prod)
 */

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
  highlights: { live: LivePreview[]; clips: ClipPreview[] };
  courts: ClubCourtPublic[];
  upcoming: UpcomingPublicGame[];
  members: DirectoryPlayer[];
  /** Photo grid placeholders (1..n). In prod replace with image URLs. */
  photos: number[];
}

export const MOCK_CLUB_PUBLIC: ClubPublic = {
  id: 'club-padelbsas',
  name: 'Club Pádel Buenos Aires',
  handle: '@padelbsas',
  city: 'Palermo, Buenos Aires',
  followers: 1420,
  isFollowing: false,
  hours: 'Lun–Dom · 08:00 – 23:00',
  phone: '+54 11 4123 4567',
  address: 'Av. Libertador 1234, CABA',
  highlights: {
    live: [
      { id: 'G-7421', court: 'Cancha 3', viewers: 47, players: [
        { username: '@maxi',  name: 'Maxi R.' },
        { username: '@lu',    name: 'Lucía P.' },
        { username: '@diego', name: 'Diego V.' },
        { username: '@javi',  name: 'Javi M.' },
      ], streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' },
      { id: 'G-7414', court: 'Cancha 1', viewers: 18, players: [
        { username: '@nico', name: 'Nico S.' },
        { username: '@flor', name: 'Flor B.' },
      ], streamUrl: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8' },
    ],
    clips: [
      { id: 'clip-01', title: 'Remate final · Maxi vs Diego', length: '0:18', date: 'Ayer' },
      { id: 'clip-02', title: 'Punto largo · Cancha 2',        length: '0:42', date: '2 días' },
      { id: 'clip-03', title: 'Smash desde el fondo',          length: '0:12', date: '3 días' },
    ],
  },
  courts: [
    { id: 'C1', name: 'Cancha 1', surface: 'CLAY',   cams: 2, indoor: true,  nextSlot: '19:00' },
    { id: 'C2', name: 'Cancha 2', surface: 'CLAY',   cams: 2, indoor: false, nextSlot: '19:30' },
    { id: 'C3', name: 'Cancha 3', surface: 'HARD',   cams: 3, indoor: true,  nextSlot: '20:00' },
    { id: 'C4', name: 'Cancha 4', surface: 'GRASS',  cams: 2, indoor: false, nextSlot: '20:30' },
  ],
  upcoming: [
    { id: 'G-7430', court: 'Cancha 1', time: '19:00', date: 'Hoy',    players: 4 },
    { id: 'G-7431', court: 'Cancha 3', time: '20:30', date: 'Hoy',    players: 2 },
    { id: 'G-7440', court: 'Cancha 2', time: '09:00', date: 'Mañana', players: 4 },
  ],
  members: [
    { id: '1042', name: 'Maxi Rodríguez', username: '@maxi.r' },
    { id: '1043', name: 'Lucía Paredes',  username: '@lupare' },
    { id: '1044', name: 'Diego Vázquez',  username: '@dievaz' },
    { id: '1045', name: 'Javier Mtz.',    username: '@javim'  },
    { id: '1046', name: 'Flor Bauer',     username: '@florb'  },
    { id: '1047', name: 'Nico Suárez',    username: '@nicosua'},
  ],
  photos: [1, 2, 3, 4],
};

/* ─────────── Reservation flow data ───────────
 *   GET /courts/:id/slots?date=…  → Slot[]
 *   POST /reservations            → Reservation
 *   GET /players?q=…&clubId=…     → InvitablePlayer[]
 */

export type SlotStatus = 'free' | 'reserved' | 'own';

export interface Slot {
  start: string;     // 'HH:mm'
  end: string;       // 'HH:mm'
  duration: 60 | 90;
  price: number;     // ARS
  status: SlotStatus;
  /** True if the booked match will be transmitted from this slot. */
  cams: boolean;
}

export const MOCK_SLOTS: Slot[] = [
  { start: '08:00', end: '09:00', duration: 60, price: 4500, status: 'free',     cams: true  },
  { start: '09:00', end: '10:30', duration: 90, price: 6500, status: 'free',     cams: true  },
  { start: '10:30', end: '12:00', duration: 90, price: 6500, status: 'reserved', cams: true  },
  { start: '12:00', end: '13:00', duration: 60, price: 4500, status: 'free',     cams: false },
  { start: '13:00', end: '14:00', duration: 60, price: 4500, status: 'own',      cams: true  },
  { start: '14:00', end: '15:30', duration: 90, price: 6500, status: 'free',     cams: true  },
  { start: '15:30', end: '17:00', duration: 90, price: 6500, status: 'free',     cams: false },
  { start: '17:00', end: '18:00', duration: 60, price: 4500, status: 'reserved', cams: true  },
  { start: '18:00', end: '19:30', duration: 90, price: 6500, status: 'free',     cams: true  },
];

export interface InvitablePlayer {
  id: string;
  name: string;
  username: string;
  rating: number;
}

export const MOCK_INVITABLE_PLAYERS: InvitablePlayer[] = [
  { id: '1042', name: 'Maxi Rodríguez', username: '@maxi.r',  rating: 4.6 },
  { id: '1043', name: 'Lucía Paredes',  username: '@lupare',  rating: 4.2 },
  { id: '1044', name: 'Diego Vázquez',  username: '@dievaz',  rating: 4.7 },
  { id: '1045', name: 'Javier Mtz.',    username: '@javim',   rating: 4.1 },
  { id: '1046', name: 'Flor Bauer',     username: '@florb',   rating: 4.4 },
  { id: '1047', name: 'Nico Suárez',    username: '@nicosua', rating: 4.0 },
];

/* ─────────── Player public profile (viewed by another player) ───────────
 *   GET /players/:id              → PlayerPublic
 *   POST/DELETE /players/:id/follow → { isFollowing }
 */

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
  /** True when the player is currently in a streamed match. UI puts a LIVE
   *  card as the FIRST tile in the highlights carousel. */
  isLiveNow: boolean;
  liveGame: PlayerLiveGame | null;
  clips: PlayerClip[];
  /** Photo grid placeholders (1..n). In prod replace with image URLs. */
  photos: number[];
  notifyOnMatch?: boolean;
  followingCount: number;
  followersList: FollowItem[];
  followingList: FollowItem[];
}

export const MOCK_PLAYER_PUBLIC: PlayerPublic = {
  id: 'p-1042',
  name: 'Maxi Rodríguez',
  username: '@maxi.r',
  club: 'Club Pádel BSAS',
  location: 'Palermo, Buenos Aires',
  followers: 234,
  isFollowing: false,
  notifyOnMatch: false,
  isLiveNow: true,
  liveGame: {
    id: 'G-7421', court: 'Cancha 3', club: 'Club Pádel BSAS', viewers: 47,
    players: [
      { username: '@maxi',  name: 'Maxi R.' },
      { username: '@lu',    name: 'Lucía P.' },
      { username: '@diego', name: 'Diego V.' },
      { username: '@javi',  name: 'Javi M.' },
    ],
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  clips: [
    { id: 'clip-p1', title: 'Remate final · vs Diego', length: '0:18', date: 'Ayer',
      videoUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4' },
    { id: 'clip-p2', title: 'Punto largo · 18 golpes', length: '0:42', date: '2 días',
      videoUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4' },
    { id: 'clip-p3', title: 'Smash desde el fondo',    length: '0:12', date: '3 días',
      videoUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4' },
    { id: 'clip-p4', title: 'Volea cruzada',           length: '0:24', date: '1 sem.',
      videoUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4' },
  ],
  photos: [1, 2, 3, 4, 5, 6, 7, 8],
  followingCount: 18,
  followersList: [],
  followingList: [],
};

export const MOCK_FAKE_PLAYER: PlayerPublic = {
  id: 'p-2099',
  name: 'Félix Torrealba',
  username: '@felix.t',
  club: 'Padel Norte',
  location: 'Belgrano, Buenos Aires',
  followers: 512,
  isFollowing: false,
  notifyOnMatch: false,
  isLiveNow: false,
  liveGame: null,
  clips: [
    { id: 'clip-f1', title: 'Bajada de pared · final del set', length: '0:22', date: 'Ayer',
      videoUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4' },
    { id: 'clip-f2', title: 'Globo defensivo · punto increíble', length: '0:31', date: '3 días',
      videoUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4' },
    { id: 'clip-f3', title: 'Remate ganador · cuartos', length: '0:15', date: '1 sem.',
      videoUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4' },
  ],
  photos: [1, 2, 3, 4, 5, 6],
  followingCount: 47,
  followersList: [
    { id: 'p-1042', name: 'Maxi Rodríguez', username: '@maxi.r' },
    { id: 'p-1043', name: 'Lucía Paredes',  username: '@lupare' },
    { id: 'p-1044', name: 'Diego Vázquez',  username: '@dievaz' },
    { id: 'p-1046', name: 'Flor Bauer',     username: '@florb'  },
    { id: 'p-1047', name: 'Nico Suárez',    username: '@nicosua'},
  ],
  followingList: [
    { id: 'p-1044', name: 'Diego Vázquez',  username: '@dievaz' },
    { id: 'p-1045', name: 'Javier Mtz.',    username: '@javim'  },
    { id: 'p-1046', name: 'Flor Bauer',     username: '@florb'  },
  ],
};

/* ─────────── Search play (GPS) ───────────
 *   GET /search/nearby?lat=&lng=&radius= → { courts, players }
 */

export interface NearbyCourt {
  id: string; name: string; club: string; distanceKm: number;
  surface: 'CLAY' | 'GRASS' | 'HARD' | 'CARPET';
  freeSlots: string[];
  hasCameras: boolean;
}
export interface NearbyPlayer {
  id: string; name: string; username: string;
  rating: number; distanceKm: number;
  /** Human-readable: 'compañero + 2 rivales', '2 rivales', 'pareja completa' */
  lookingFor: string;
  availability: string;
}

export const MOCK_NEARBY: { courts: NearbyCourt[]; players: NearbyPlayer[] } = {
  courts: [
    { id: 'C1', name: 'Cancha 3', club: 'Club Pádel BSAS', distanceKm: 0.4, surface: 'HARD',
      freeSlots: ['18:30', '20:00', '21:30'], hasCameras: true },
    { id: 'C2', name: 'Cancha 1', club: 'Padel Norte',      distanceKm: 1.2, surface: 'CLAY',
      freeSlots: ['19:00', '20:30'],          hasCameras: true },
    { id: 'C3', name: 'Cancha 4', club: 'Club Recoleta',    distanceKm: 2.1, surface: 'GRASS',
      freeSlots: ['18:00', '21:00'],          hasCameras: false },
    { id: 'C4', name: 'Cancha 2', club: 'Padel Sur',        distanceKm: 3.5, surface: 'CLAY',
      freeSlots: ['19:30'],                   hasCameras: true },
  ],
  players: [
    { id: 'p-1042', name: 'Maxi Rodríguez', username: '@maxi.r',  rating: 4.6, distanceKm: 0.8,
      lookingFor: 'compañero + 2 rivales', availability: 'Hoy 19:00 – 21:00' },
    { id: 'p-1046', name: 'Flor Bauer',     username: '@florb',   rating: 4.4, distanceKm: 1.5,
      lookingFor: '2 rivales',             availability: 'Mañana 18:00' },
    { id: 'p-1044', name: 'Diego Vázquez',  username: '@dievaz',  rating: 4.7, distanceKm: 2.3,
      lookingFor: 'pareja completa',       availability: 'Hoy 20:30' },
    { id: 'p-1047', name: 'Nico Suárez',    username: '@nicosua', rating: 4.0, distanceKm: 4.2,
      lookingFor: '2 rivales',             availability: 'Jue 19:00' },
  ],
};

/* ─────────── Búsqueda global (texto) ───────────
 *   GET /search?q=  → { players: SearchablePlayer[], courts: SearchableCourt[] }
 */

export interface SearchablePlayer {
  id: string;
  name: string;
  username: string;
  rating: number;
}

export interface SearchableCourt {
  id: string;
  name: string;
  club: string;
  clubId: string;
  surface: 'CLAY' | 'GRASS' | 'HARD' | 'CARPET';
  hasCameras: boolean;
}

export const MOCK_SEARCHABLE_PLAYERS: SearchablePlayer[] = [
  { id: '1042', name: 'Maxi Rodríguez',  username: '@maxi.r',  rating: 4.6 },
  { id: '1043', name: 'Lucía Paredes',   username: '@lupare',  rating: 4.2 },
  { id: '1044', name: 'Diego Vázquez',   username: '@dievaz',  rating: 4.7 },
  { id: '1045', name: 'Javier Martínez', username: '@javim',   rating: 4.1 },
  { id: '1046', name: 'Florencia Bauer', username: '@florb',   rating: 4.4 },
  { id: '1047', name: 'Nicolás Suárez',  username: '@nicosua', rating: 4.0 },
  { id: '1048', name: 'Ana Gómez',       username: '@ana.g',   rating: 4.5 },
  { id: '1049', name: 'Pablo Herrera',   username: '@pabloH',  rating: 3.9 },
];

export const MOCK_SEARCHABLE_COURTS: SearchableCourt[] = [
  { id: 'C1', name: 'Cancha 1', club: 'Club Pádel BSAS', clubId: 'club-padelbsas', surface: 'CLAY',   hasCameras: true  },
  { id: 'C2', name: 'Cancha 2', club: 'Club Pádel BSAS', clubId: 'club-padelbsas', surface: 'CLAY',   hasCameras: true  },
  { id: 'C3', name: 'Cancha 3', club: 'Club Pádel BSAS', clubId: 'club-padelbsas', surface: 'HARD',   hasCameras: true  },
  { id: 'C4', name: 'Cancha 4', club: 'Club Pádel BSAS', clubId: 'club-padelbsas', surface: 'GRASS',  hasCameras: true  },
  { id: 'C5', name: 'Cancha 1', club: 'Padel Norte',     clubId: 'club-norte',     surface: 'CLAY',   hasCameras: true  },
  { id: 'C6', name: 'Cancha 2', club: 'Padel Norte',     clubId: 'club-norte',     surface: 'HARD',   hasCameras: true  },
  { id: 'C7', name: 'Cancha 4', club: 'Club Recoleta',   clubId: 'club-recoleta',  surface: 'GRASS',  hasCameras: false },
  { id: 'C8', name: 'Cancha 2', club: 'Padel Sur',       clubId: 'club-sur',       surface: 'CLAY',   hasCameras: true  },
];

/* ─────────── Social feed (player home) ───────────
 *   GET /feed/posts?cursor=…  → { posts: FeedPost[], nextCursor }
 *   POST /feed/posts/:id/like → { likes, hasLiked }
 */

export type FeedPostType = 'photo' | 'highlight';
export type FeedPostTone = 'lime' | 'blue' | 'white';

export interface FeedPost {
  id: string;
  type: FeedPostType;
  author: { name: string; username: string; role: 'player' | 'club' };
  /** Single contextual line above the media: "Final · Cancha 3 · Club X" */
  contextLine?: string;
  /** Visible duration overlay (highlights only): "0:24" */
  duration?: string;
  caption?: string;
  postedAt: string;
  likes: number;
  comments: number;
  /** Placeholder visual until real images/posters ship. */
  tone?: FeedPostTone;
  /** Optional aspect ratio override for the media block. */
  mediaAspectRatio?: string;
  /** Playback URL for highlight clips. Replace with real CDN URL when API ships. */
  videoUrl?: string;
}

export const MOCK_FEED_POSTS: FeedPost[] = [
  {
    id: 'P-201', type: 'highlight', tone: 'blue',
    author: { name: 'Maxi Rodríguez', username: '@maxi.r', role: 'player' },
    contextLine: 'Final · Cancha 3', duration: '0:24',
    caption: 'Cerramos el partido con un remate en parábola. 🔥',
    postedAt: 'hace 2 h', likes: 48, comments: 7,
    videoUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4',
  },
  {
    id: 'P-202', type: 'photo', tone: 'lime',
    author: { name: 'Lucia Paredes', username: '@lupare', role: 'player' },
    contextLine: 'Después del partido',
    caption: 'Otra tarde de pádel con las chicas 💪',
    postedAt: 'hace 4 h', likes: 36, comments: 4,
  },
  {
    id: 'P-203', type: 'highlight', tone: 'blue',
    author: { name: 'Club Pádel BSAS', username: '@padelbsas', role: 'club' },
    contextLine: 'Mejor jugada de la semana', duration: '0:18',
    caption: 'Smash desde el fondo. ¿Mejor momento de Cancha 3 esta semana?',
    postedAt: 'hace 8 h', likes: 122, comments: 19,
    videoUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4',
  },
  {
    id: 'P-204', type: 'photo', tone: 'white',
    author: { name: 'Diego Vázquez', username: '@dievaz', role: 'player' },
    contextLine: 'Calentamiento previo',
    caption: 'Listo para la revancha 🎾',
    postedAt: 'ayer', likes: 21, comments: 2,
  },
];

/* ─────────── Owner of the current session (player POV) ──────────────
 * Modela el perfil PROPIO del player + su biblioteca privada. Cada item
 * trae un `isPublic`: el perfil público filtra a true; la biblioteca
 * muestra todo. En producción:
 *
 *   GET /me                                → ProfileOwner
 *   GET /me/library                        → { matches, highlights, uploads }
 *   PATCH /me/library/:id { isPublic }     → LibraryItem (flip visibilidad)
 *   POST /me/uploads (multipart + meta)    → LibraryUpload
 */

export interface ProfileOwner {
  name: string;
  username: string;
  club: string;
  location: string;
  followers: number;
  following: number;
}

export const MOCK_OWNER: ProfileOwner = {
  name: 'Maxi Rodríguez',
  username: '@maxi.r',
  club: 'Club Pádel BSAS',
  location: 'Palermo, Buenos Aires',
  followers: 234, following: 86,
};

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
}

export interface LibraryHighlight extends LibraryItemBase {
  kind: 'highlight';
  /** Partido de origen, si fue recortado del editor. */
  fromMatch?: string;
  durationSeconds: number;
  /** URL del clip en B2 (o CDN). Presente cuando el highlight fue procesado. */
  streamUrl?: string;
}

export interface LibraryUpload extends LibraryItemBase {
  kind: 'upload-photo' | 'upload-video';
}

export type LibraryItem = LibraryMatch | LibraryHighlight | LibraryUpload;

export const MOCK_MY_MATCHES_V2: LibraryMatch[] = [
  { id: 'G-7401', kind: 'match', title: 'Cancha 3 · Club Pádel BSAS',
    subtitle: 'Hoy · 15:52 · GoPro Hero 12 · 1080p',
    surface: 'HARD', durationSeconds: 142, durationLabel: '2:22 min',
    cameras: 1, highlightsCount: 0, isPublic: false,
    recordingUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4',
    date: 'Hoy' },
];

export const MOCK_MY_HIGHLIGHTS_V2: LibraryHighlight[] = [
  { id: 'H-201', kind: 'highlight', title: 'Remate final · vs Diego',
    durationSeconds: 24, durationLabel: '0:24', fromMatch: 'G-7401', date: 'Ayer', isPublic: true,
    streamUrl: 'https://f005.backblazeb2.com/file/torna-videos/games/YTDown_YouTube_Padel-GoPro-Hero-12_Media_EAdDVgx5A24_001_1080p.mp4' },
  { id: 'H-202', kind: 'highlight', title: 'Punto largo · 18 golpes',
    durationSeconds: 42, durationLabel: '0:42', fromMatch: 'G-7388', date: '12 nov',   isPublic: true  },
  { id: 'H-203', kind: 'highlight', title: 'Smash desde el fondo',
    durationSeconds: 12, durationLabel: '0:12', fromMatch: 'G-7388', date: '12 nov',   isPublic: false },
];

export const MOCK_MY_UPLOADS: LibraryUpload[] = [
  { id: 'U-301', kind: 'upload-video', title: 'Calentamiento previo',
    durationSeconds: 38, durationLabel: '0:38', date: 'Hace 2 días',  isPublic: true  },
  { id: 'U-302', kind: 'upload-photo', title: 'Después del partido',  date: 'Hace 4 días',  isPublic: true  },
  { id: 'U-303', kind: 'upload-photo', title: 'Listo para entrenar',  date: 'Hace 1 sem.',  isPublic: false },
];
