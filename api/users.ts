/**
 * Cliente de usuarios — perfil público, búsqueda y listas de follow.
 *
 *   GET /user/profile/:id     → perfil público (player o club) + conteos
 *   GET /user/search?q=       → búsqueda de jugadores por nombre/username/email
 *   GET /follow/followers/:id → quiénes siguen a :id
 *   GET /follow/following/:id → a quiénes sigue :id
 *
 * El backend envuelve toda respuesta en { data, statusCode } (TransformInterceptor);
 * `authedGet` desenvuelve `data`.
 */
import * as SecureStore from 'expo-secure-store';
import type { FollowItem } from '../data/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

export interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  email: string;
  profilePicture: string | null;
  frontPage: string | null;
  description: string | null;
  region: string | null;
  isClub: boolean;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface UserSearchResult {
  id: string;
  username: string;
  name: string | null;
  email: string;
  profilePicture: string | null;
  region: string | null;
  isClub: boolean;
}

async function authedGet<T>(path: string): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  const json = (await res.json().catch(() => ({}))) as { data?: T };
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

/** Perfil público de un usuario por su id (Firebase UID). */
export function fetchUserProfile(id: string): Promise<UserProfile> {
  return authedGet<UserProfile>(`/user/profile/${encodeURIComponent(id)}`);
}

/** Busca jugadores por nombre, username o email. */
export function searchUsers(q: string): Promise<UserSearchResult[]> {
  return authedGet<UserSearchResult[]>(`/user/search?q=${encodeURIComponent(q)}`);
}

/** Busca jugadores y clubs por nombre, username o email. */
export function searchUsersAndClubs(q: string): Promise<UserSearchResult[]> {
  return authedGet<UserSearchResult[]>(`/user/search-all?q=${encodeURIComponent(q)}`);
}

/* ───────────── Listas de seguidores / seguidos ───────────── */

/** Usuario embebido en cada fila de follow (SELECT_FROM_USER del backend). */
interface FollowUser {
  id: string;
  username: string;
  name: string | null;
  profilePicture: string | null;
}

/**
 * El controller de follow devuelve `{ data, total }` y el TransformInterceptor lo
 * envuelve otra vez → tras `authedGet` (que desenvuelve la capa externa) queda
 * `{ data: rows, total }`. Por eso se lee `.data` de nuevo.
 */
interface FollowListResponse<Row> {
  data: Row[];
  total: number;
}

function withAt(username: string): string {
  return username.startsWith('@') ? username : `@${username}`;
}

function toFollowItem(u: FollowUser): FollowItem {
  return {
    id: u.id,
    name: u.name ?? u.username,
    username: withAt(u.username),
    profilePicture: u.profilePicture ?? undefined,
  };
}

/** Seguidores de un usuario: cada fila trae el usuario en `follower`. */
export async function fetchFollowers(id: string): Promise<FollowItem[]> {
  const res = await authedGet<FollowListResponse<{ follower: FollowUser }>>(
    `/follow/followers/${encodeURIComponent(id)}`,
  );
  return (res?.data ?? []).map((row) => toFollowItem(row.follower));
}

/** Usuarios que un usuario sigue: cada fila trae el usuario en `user`. */
export async function fetchFollowing(id: string): Promise<FollowItem[]> {
  const res = await authedGet<FollowListResponse<{ user: FollowUser }>>(
    `/follow/following/${encodeURIComponent(id)}`,
  );
  return (res?.data ?? []).map((row) => toFollowItem(row.user));
}
