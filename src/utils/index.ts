import {Platform} from 'react-native';

import {
  ClubUser,
  GetClubGamesResponse,
  GetClubResponse,
  GetClubsResponse,
} from '@/config/types';
import {PlayerItemProps} from '@/components/player-list/player-item';
import { GameStatusType } from '@/config/enums/game-status-type.enum';

// Export streaming utilities
export * from './streaming';

// Export API cache utilities
export * from './apiCache';

const WRAP_TEXT_REMOVE_CHARACTERS = [',', 'y'];
const DEFAULT_LOGO = 'https://via.placeholder.com/100';

export const DEBOUNCE_TIME = 200;

export function wrapText(text: string, length: number = 45) {
  if (text.length > length) {
    if (WRAP_TEXT_REMOVE_CHARACTERS.some(c => c === text[length - 1])) {
      length--;
    }
    text = text.slice(0, length) + '...';
  }

  return text;
}

export function msToHhmmss(ms: number) {
  let s = ms / 1000;
  const h = Math.trunc(s / 3600);
  s = s % 3600;
  const m = Math.trunc(s / 60);
  s = Math.trunc(s % 60);

  const minutes = addZero(m);
  const seconds = addZero(s);

  if (h > 0) {
    return `${addZero(h)}:${m}:${s}`;
  }

  return `${minutes}:${seconds}`;
}

export function addZero(num: number) {
  return num < 10 ? `0${num}` : num;
}

export function timeAgo(d: string) {
  // * Date must be in YY-MM-DD or YYYY-MM-DDTHH:mm:ss formats
  const date = new Date(d);

  const today = new Date();

  if (today < date) {
    return 'Ahora';
  }

  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  if (todayMidnight < date) {
    const hours = today.getHours() - date.getHours();
    if (hours > 0) {
      return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    }

    const minutes = today.getMinutes() - date.getMinutes();
    if (minutes > 0) {
      return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    }

    const seconds = today.getSeconds() - date.getSeconds();
    if (seconds > 0) {
      return `Hace ${seconds} segundo${seconds > 1 ? 's' : ''}`;
    }

    return 'Ahora';
  }

  const yesterday = new Date(today);
  yesterday.setHours(0, 0, 0, 0);
  yesterday.setDate(today.getDate() - 1);

  if (yesterday < date) {
    return 'Ayer';
  }

  const monthAgo = new Date(today);
  monthAgo.setMonth(today.getMonth() - 1);

  if (monthAgo < date) {
    const ms = today.getTime() - date.getTime();
    const days = Math.trunc(ms / (24 * 60 * 60 * 1000));

    return `Hace ${days} día${days > 1 ? 's' : ''}`;
  }

  const yearAgo = new Date(today);
  yearAgo.setFullYear(today.getFullYear() - 1);
  let months = (today.getFullYear() - date.getFullYear()) * 12;
  months -= date.getMonth();
  months += today.getMonth();

  if (yearAgo < date) {
    return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
  }

  const years = Math.trunc(months / 12);

  return `Hace ${years} año${years > 1 ? 's' : ''}`;
}

export function buildTitle(names: string[]) {
  let title = '';

  names.forEach((name, i) => {
    if (i === names.length - 1) {
      title = title.concat(name);
    } else {
      const separator = i === names.length - 2 ? ' y ' : ', ';
      title = title.concat(name, separator);
    }
  });

  return title;
}

export function clubResponseToClubUser(
  clubResponse: GetClubsResponse | GetClubResponse,
  location = '',
) {
  return {
    id: clubResponse.id,
    name: clubResponse.name || clubResponse.username,
    location: clubResponse.address || location,
    imageUrl:
      clubResponse.frontPage ||
      'https://images.unsplash.com/photo-1567220720374-a67f33b2a6b9?q=80&w=2664&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    logoUrl: clubResponse.profilePicture || DEFAULT_LOGO,
    username: `@${clubResponse.username}`,
    bio: clubResponse.description || '',
    isFollowing: clubResponse.isFollowing,
    following: clubResponse.totalFollow,
    followers: clubResponse.totalFollowers,
    region: clubResponse.region,
  };
}

export function isIOS() {
  return Platform.OS === 'ios';
}

interface User {
  name: string;
  username: string;
  profilePicture: string;
  following?: boolean;
  address: string;
  id: string;
}

export function userResponseToPlayerItemProps({
  name,
  username,
  profilePicture,
  following = false,
  address,
  id,
}: User): PlayerItemProps {
  return {
    name,
    username,
    avatarUrl: profilePicture,
    following,
    location: address,
    userId: id,
  };
}

export function playerResponseToUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    following: user.following || false,
    avatarUrl: user.profilePicture,
  };
}

export function clubGameResponseToGame(
  game: GetClubGamesResponse,
  club: ClubUser,
) {
  return {
    id: game.gameId,
    comments: [],
    players: game.players.map(player => playerResponseToUser(player)),
    cover:
      club.imageUrl ||
      'https://images.unsplash.com/photo-1567220720374-a67f33b2a6b9?q=80&w=2664&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    stream: '',
    viewers: 0,
    elapsedTime: 0,
    createdAt: game.createdAt,
    club: {...club, floor: game.camera.cameraConfig.name},
    onLive: game.gameStatus === GameStatusType.LIVE,
    caption: '',
    duration: 0,
  };
}

/**
 * Normaliza la respuesta del API para manejar diferentes formatos
 * Algunos endpoints retornan { data: {...} } y otros directamente {...}
 * El TransformInterceptor envuelve todas las respuestas en { data: ..., statusCode: ..., timestamp: ... }
 */
export function normalizeApiResponse<T>(responseData: any): T {
  // Si la respuesta tiene una propiedad 'data' y también tiene 'statusCode' o 'timestamp',
  // entonces está envuelta por el TransformInterceptor
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData &&
    ('statusCode' in responseData || 'timestamp' in responseData)
  ) {
    // Retornar el contenido de data (puede ser un objeto, array, o cualquier tipo)
    return responseData.data as T;
  }
  
  // Si la respuesta tiene una propiedad 'data' y no tiene propiedades comunes de un objeto de usuario/perfil
  // entonces probablemente está envuelta en un objeto data
  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData &&
    !('id' in responseData) &&
    !('total' in responseData) &&
    !Array.isArray(responseData)
  ) {
    // Si data es un array, retornarlo directamente
    if (Array.isArray(responseData.data)) {
      return responseData.data as T;
    }
    // Si data es un objeto, retornarlo
    return responseData.data as T;
  }
  
  return responseData as T;
}
