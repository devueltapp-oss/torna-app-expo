import {StyleProp, ViewStyle} from 'react-native';

export interface Notification {
  username: string;
  avatarUrl: string;
  timestamp: string;
  following: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  following: boolean;
  avatarUrl: string;
}

export interface Club {
  name: string;
  floor: string;
}

export interface ClubUser {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  logoUrl: string;
  username: string;
  bio: string;
  isFollowing: boolean;
  following: number;
  followers: number;
  region?: string;
}

export interface MatchPost {
  id: string;
  imageUrl: string;
  caption: string;
  timeAgo: string;
  duration: string;
  users: User[];
}

export interface Match {
  id: string;
  cover: string;
  viewers: number;
  live?: boolean;
  club: Club;
  users: User[];
}

export interface HomeData {
  title: string;
  data: Match[];
}

export interface Game {
  id: string;
  cover: string;
  stream: string;
  viewers: number;
  elapsedTime: number;
  onLive: boolean;
  createdAt: string;
  caption: string;
  duration: number;
  club: {
    id: string;
    name: string;
    logoUrl: string;
    floor: string;
    location: string;
    isFollowing: boolean;
  };
  players: User[];
  comments: {
    id: string;
    username: string;
    text: string;
  }[];
}

export interface GetStatsMeResponse {
  rankingWeekly: number | null;
  favoriteClub: {
    id: string | null;
    name: string | null;
    visited: number;
  },
  wins: number;
  losses: number;
  seasonTotals: {
    matches: number;
    wins: number;
  },
  winRate: number;
}

export type NotificationType = 'following';

export type BaseStreamPlayerProps = {
  viewers: number;
  navigation?: any;
  timeToHideControls?: number;
  initialVolume?: number;
  showControls?: boolean;
  playUntilSecond?: number;
  /**
   * ResizeMode aplicado cuando el player entra en fullscreen nativo.
   * Por defecto se usa `cover` para aprovechar todo el lienzo.
   */
  fullscreenResizeMode?: 'cover' | 'contain';
};

export type StreamPlayerProps = BaseStreamPlayerProps & {
  stream: string;
};

export type GamePlayerProps = BaseStreamPlayerProps & {
  gameId: string;
  style?: StyleProp<ViewStyle>;
  /**
   * Controla si se muestra el overlay de error cuando el stream falla.
   * Útil para previews donde queremos ocultar el mensaje.
   */
  showErrorOverlay?: boolean;
};

export type GetClubsResponse = {
  id: string;
  username: string;
  email: string;
  name?: string;
  date?: string;
  isClub: boolean;
  phone?: string;
  status: boolean;
  region?: string;
  deleted?: string;
  address?: string;
  profilePicture?: string;
  frontPage?: string;
  description?: string;
  totalFollowers: number;
  isFollowing: boolean;
  totalFollow: number;
};

export type GetClubResponse = {
  id: string;
  username: string;
  email: string;
  name?: string;
  date?: string;
  isClub: boolean;
  phone?: string;
  status: boolean;
  region?: string;
  deleted?: string;
  address?: string;
  profilePicture?: string;
  frontPage?: string;
  description?: string;
  totalFollowers: number;
  isFollowing: boolean;
  totalFollow: number;
};

export type FollowUserResponse = {
  id: string;
  userId: string;
  followerId: string;
};

export type CameraResponse = {
  id: string;
  identifier: string;
  minBitRate: number;
  maxBitRate: number;
  resolution: string;
  lens: string;
  startingBitRate: number;
  channelConfig: string | null;
  lens_value: string | null;
  resolution_value: string | null;
  rtmpServer: string;
  streamingUrl: string;
  deletedAt: string | null;
  cameraConfigId: string;
  courtStatus: string;
  createdAt: string;
  updatedAt: string;
  cameraConfig: {
    id: string;
    name: string;
    wifiSsid: string;
    wifiPassword: string;
    userId: string;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
    user?: UserResponse;
  };
};

export type UserResponse = {
  id: string;
  username: string;
  email: string;
  name: string;
  date: string;
  isClub: boolean;
  phone: string;
  status: boolean;
  region: string;
  deleted: string | null;
  address: string;
  profilePicture: string;
  frontPage: string;
  description: string;
  notificationId: string;
  createdAt: string;
  updatedAt: string;
  following?: boolean;
};

export type PlayerListResponse = UserResponse & {
  following: boolean;
};

export type PlayersResponse = {
  userId: string;
  gameId: string;
  createdAt: string;
  updatedAt: string;
  user: UserResponse;
};

export type GetGamesLiveResponsePaginated = {
  data: GetGamesLiveResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }
}

export type GetGamesLiveResponse = {
  cover?: string;
  viewers?: number;
  club?: any;
  id: string;
  cameraId: string;
  jobId: string;
  status: boolean;
  final_video: string | null;
  createdAt: string;
  updatedAt: string;
  camera: CameraResponse;
  gamePlayers: PlayersResponse[];
};

export type PlayerRecentGameResponse = {
  id: string;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  finalVideo?: string | null;
  recordingUrl?: string | null;
  clipsCount?: number;
  hasClips?: boolean;
  cover?: string | null;
  court?: string | null;
  durationInSeconds?: number;
  players: Array<{
    id: string;
    username: string;
    name?: string;
    profilePicture?: string;
    following?: boolean;
  }>;
};

export type GetClubGamesResponse = {
  gameId: string;
  gameStatus: string; // GameStatusType: 'SCHEDULED' | 'LIVE' | 'STOPPED' | 'FINISHED'
  court: string;
  camera: CameraResponse;
  createdAt: string;
  players: UserResponse[];
};

export type GetGameResponse = {
  id: string;
  cameraId: string;
  jobId: string;
  status: string; // GameStatusType: 'SCHEDULED' | 'LIVE' | 'STOPPED' | 'FINISHED'
  final_video?: boolean;
  recordingUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  gamePlayers: PlayersResponse[];
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  scheduledStartAt: string;
  scheduledEndAt: string;
  camera: {
    id: string;
    identifier: string;
    minBitRate: number;
    maxBitRate: number;
    resolution: string;
    lens: string;
    startingBitRate: number;
    channel: string;
    lens_value: string;
    resolution_value: string;
    rtmpServer: string;
    streamingUrl: string;
    deleted?: boolean;
    cameraConfigId: string;
    courtStatus: string;
    createdAt: string;
    updatedAt: string;
    cameraConfig: {
      id: string;
      name: string;
      wifiSsid: string;
      userId: string;
    };
  };
  club: {
    id: string;
    username: string;
    email: string;
    name: string;
    date: string;
    isClub: boolean;
    phone: string;
    status: boolean;
    region: string;
    deleted?: boolean;
    address: string;
    profilePicture: string;
    frontPage: string;
    description?: boolean;
    notificationId?: boolean;
    createdAt: string;
    updatedAt: string;
    isFollowing: boolean;
  };
};

export type UserBasicResponse = {
  id: string;
  username: string;
  email: string;
  profilePicture: string;
  status: boolean;
  name: string;
  address: string;
};

export type FollowBaseResponse = {
  id: string;
  userId: string;
  followerId: string;
  createdAt: string;
  updatedAt: string;
};

export type FollowDataResponse = FollowBaseResponse & {
  user: UserBasicResponse;
};

export type FollowResponse = {
  data: FollowDataResponse[];
  total: number;
};

export type FollowerDataResponse = {
  follower: UserBasicResponse;
  createdAt: string;
  followerId: string;
  id: string;
  isFollowing: boolean;
  updatedAt: string;
  userId: string;
};

export type FollowerResponse = {
  data: FollowerDataResponse[];
  total: number;
};

export type RegisterGameResultResponse = {
  success: boolean;
  message: string;
}

export type UpcomingGameData = {
  id: string;
  cameraId: string;
  jobId: string;
  status: string; // GameStatusType: 'SCHEDULED' | 'LIVE' | 'STOPPED' | 'FINISHED'
  finalVideo: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  gamePlayers: PlayersResponse[
  ];
  camera: CameraResponse;
}

export type GetUpcomingGamesResponse = {
  message: string;
  data: UpcomingGameData[];
}
