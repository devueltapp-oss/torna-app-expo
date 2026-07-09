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
  /** Si el usuario autenticado tiene activadas las notificaciones de partidos de :id. */
  notifyOnMatch: boolean;
  /** True si el usuario participa ahora en un partido LIVE. */
  isLiveNow: boolean;
  /** Id del partido LIVE en el que juega (para abrir el visor), o null. */
  liveGameId: string | null;
}

export interface UserSearchResult {
  id: string;
  username: string;
  name: string | null;
  /** `/user/search-all` no devuelve email; opcional para reflejar la realidad. */
  email?: string;
  profilePicture: string | null;
  region: string | null;
  isClub: boolean;
}

async function authedGet<T>(path: string, timeoutMs = 15000): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  // Timeout: sin esto, una request que cuelga deja la pantalla cargando para
  // siempre (no hay forma de que el hook resuelva). AbortController la corta.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      signal: ctrl.signal,
    });
  } catch (e) {
    if ((e as any)?.name === 'AbortError') {
      throw new Error(`La petición tardó demasiado (timeout ${timeoutMs / 1000}s): ${path}`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
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

/* ───────────── Seguir / dejar de seguir ───────────── */

/** POST autenticado sin desenvolver respuesta (para acciones sin cuerpo útil). */
async function authedPost(path: string, body: unknown): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
}

/** Seguir a un usuario (player o club) por su id (Firebase UID). `POST /follow`. */
export function followUser(userId: string): Promise<void> {
  return authedPost('/follow', { userId });
}

/** Dejar de seguir a un usuario por su id. `POST /follow/unfollow`. */
export function unfollowUser(userId: string): Promise<void> {
  return authedPost('/follow/unfollow', { userId });
}

/* ───────────── Listas de seguidores / seguidos ───────────── */

/** Usuario embebido en cada fila de follow (SELECT_FROM_USER del backend). */
interface FollowUser {
  id: string;
  username: string;
  name: string | null;
  profilePicture: string | null;
  isClub?: boolean;
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
    isClub: u.isClub ?? false,
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

/**
 * Activa/desactiva las notificaciones de partidos de un usuario seguido
 * (PATCH /follow/notify/:userId). Persiste `Follower.notifyOnMatch`.
 */
export async function setFollowNotify(userId: string, notify: boolean): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const res = await fetch(`${API_URL}/follow/notify/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
    body: JSON.stringify({ notify }),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
}
