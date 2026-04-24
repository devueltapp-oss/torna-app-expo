/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import crashlytics from "@react-native-firebase/crashlytics";

import { API_URL } from "./constants";

import locations from "@/mocks/locations.json";
import games from "@/mocks/games.json";
import { normalizeApiResponse } from "@/utils";
import {
  FollowUserResponse,
  Game,
  GetClubGamesResponse,
  GetClubResponse,
  GetClubsResponse,
  GetGameResponse,
} from "@/config/types";
import { GameStatusType } from "@/config/enums/game-status-type.enum";

export function buildHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getLocations() {
  return locations;
}

export async function getGame(
  gameId: string,
  token: string,
): Promise<Game | null> {
  try {
    const res = await axios.get<GetGameResponse>(`${API_URL}/game/${gameId}`, {
      headers: buildHeader(token),
    });

    if (!res.data) {
      return null;
    }

    // res.data is something like { "data": { ... }, "statusCode": 200, "timestamp": "2026-02-19T15:32:17.295Z" }
    const data = (res.data as any).data as GetGameResponse;

    return {
      id: data.id,
      cover:
        "https://medac.es/sites/default/files/styles/img_blog_big/public/blog/destacadas/historia-del-padel.jpg",
      stream: data.camera.streamingUrl,
      viewers: 0,
      elapsedTime: 10,
      onLive: data.status === GameStatusType.LIVE,
      createdAt: data.createdAt,
      caption: "",
      duration: 0,
      club: {
        id: data.club.id,
        name: data.club.name,
        logoUrl: data.club.profilePicture,
        floor: data.camera.identifier,
        location: data.club.address,
        isFollowing: data.club.isFollowing,
      },
      players: data.gamePlayers.map((user) => ({
        id: user.userId,
        username: user.user.username,
        name: user.user.name,
        following: false,
        avatarUrl: user.user.profilePicture,
      })),
      comments: [],
    };
  } catch (error: any) {
    crashlytics().recordError(error);
    console.error(error);
    // Lanzar el código de estado HTTP si está disponible, o un error genérico
    if (error.response?.status) {
      throw error.response.status;
    }
    // Si no hay respuesta (sin conexión, timeout, etc.), lanzar 500
    throw 500;
  }

  // return games.find(item => item.id === gameId);
}

export async function getClubs(
  location: string,
  token: string,
): Promise<GetClubsResponse[]> {
  try {
    const res = await axios.get<GetClubsResponse[]>(
      `${API_URL}/club?region=${location}`,
      {
        headers: buildHeader(token),
      },
    );

    // Normalizar la respuesta usando la función de normalización existente
    const normalizedData = normalizeApiResponse<GetClubsResponse[]>(res.data);

    // Asegurar que siempre devolvamos un array
    return Array.isArray(normalizedData) ? normalizedData : [];
  } catch (error: any) {
    crashlytics().recordError(error);

    // Lanzar el código de estado HTTP si está disponible, o un error genérico
    if (error.response?.status) {
      throw error.response.status;
    }
    // Si no hay respuesta (sin conexión, timeout, etc.), lanzar 500
    throw 500;
  }
}

export async function getClubById(
  clubId: string,
  token: string,
): Promise<GetClubResponse> {
  try {
    const res = await axios.get<GetClubResponse>(`${API_URL}/club/${clubId}`, {
      headers: buildHeader(token),
    });

    return res.data;
  } catch (error: any) {
    crashlytics().recordError(error);
    throw error.response.status;
  }

  // return clubs.find(club => club.id === clubId);
}

// TODO: get on live games from specific club
export async function getLiveGames() {
  return games
    .filter((game) => game.onLive)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}

export async function getClubGames(clubId: string, token: string) {
  try {
    const res = await axios.get<GetClubGamesResponse[]>(
      `${API_URL}/game/club/${clubId}`,
      {
        headers: buildHeader(token),
      },
    );
    
    if (res.status !== 200) {
      throw res;
    }

    return res.data;
  } catch (error: any) {
    console.log(error);
    crashlytics().recordError(error);
    throw error;
  }
}

export async function getLiveClubGames(clubId: string, token: string) {
  try {
    const res: any = await getClubGames(clubId, token);

    return res.items.filter(
      (game: any) => game.gameStatus === GameStatusType.LIVE,
    );
  } catch (error: any) {
    throw error;
  }
}

export async function getNotLiveClubGames(clubId: string, token: string) {
  try {
    const res: any = await getClubGames(clubId, token);

    return res?.items?.filter(
      (game) => game.gameStatus !== GameStatusType.LIVE,
    );
  } catch (error: any) {
    throw error;
  }
}

export async function followUser(userId: string, token: string) {
  try {
    const res = await axios.post<FollowUserResponse>(
      `${API_URL}/follow`,
      { userId },
      {
        headers: buildHeader(token),
      },
    );

    return normalizeApiResponse<FollowUserResponse>(res.data);
  } catch (error: any) {
    crashlytics().recordError(error);
    throw new Error(error);
  }
}

export async function unfollowUser(userId: string, token: string) {
  try {
    const res = await axios.post<{ count: number }>(
      `${API_URL}/follow/unfollow`,
      { userId },
      {
        headers: buildHeader(token),
      },
    );

    return normalizeApiResponse<{ count: number }>(res.data);
  } catch (error: any) {
    crashlytics().recordError(error);
    throw new Error(error);
  }
}
