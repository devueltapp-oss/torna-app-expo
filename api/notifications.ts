/**
 * Cliente de notificaciones in-app (la campanita).
 *
 *   GET   /notification?limit=&cursor=  → { items, nextCursor, unreadCount }
 *   GET   /notification/unread-count    → { count }
 *   PATCH /notification/:id/read        → { ok: true }
 *   PATCH /notification/read-all        → { updated }
 *
 * ⚠️ Los mensajes de chat NO están acá: se notifican solo por push y se leen en la
 * pestaña Chats (que tiene sus propios no leídos).
 *
 * El backend envuelve toda respuesta en { data, statusCode } (TransformInterceptor).
 */
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

async function token(): Promise<string> {
  return (await SecureStore.getItemAsync(TOKEN_KEY)) ?? '';
}

function unwrap<T>(json: any): T {
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

async function authedGet<T>(path: string, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${await token()}` },
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
  return unwrap<T>(await res.json().catch(() => ({})));
}

async function authedPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    const err = new Error(payload.message ?? `HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return unwrap<T>(await res.json().catch(() => ({})));
}

/** Los tipos que persiste el backend (enum `NotificationType`). Sin chats, a propósito. */
export type AppNotificationType =
  | 'GAME_SCHEDULED'
  | 'GAME_PLAYER_ADDED'
  | 'STREAMING_STARTED'
  | 'RECORDING_READY'
  | 'GAME_FINISHED'
  | 'GAME_CANCELLED'
  | 'GAME_PLAYER_LEFT'
  | 'GAME_PAIR_CANCELLED'
  | 'GAME_APPLICATION_RECEIVED';

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  body: string;
  gameId: string | null;
  entityId: string | null;
  /** El MISMO payload que viajó en el push → se le pasa a `resolvePushTarget`. */
  data: Record<string, unknown> | null;
  /** null = sin leer (punto lima en la lista). */
  readAt: string | null;
  createdAt: string;
  actor: {
    id: string;
    username: string;
    name: string | null;
    profilePicture: string | null;
  } | null;
}

export interface NotificationsPage {
  items: AppNotification[];
  /** id de la última fila; se manda como `cursor` para la página siguiente. */
  nextCursor: string | null;
  unreadCount: number;
}

/**
 * Una página de notificaciones. ⚠️ Solo `limit` y `cursor`: el `ValidationPipe` del
 * backend usa `forbidNonWhitelisted`, así que cualquier query param de más da 400.
 */
export function fetchNotifications(
  opts: { limit?: number; cursor?: string } = {},
): Promise<NotificationsPage> {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.cursor) params.set('cursor', opts.cursor);
  const q = params.toString();
  return authedGet<NotificationsPage>(`/notification${q ? `?${q}` : ''}`);
}

/** Solo el contador: es lo que alimenta el badge de la campanita. */
export function fetchUnreadCount(): Promise<{ count: number }> {
  return authedGet<{ count: number }>('/notification/unread-count');
}

export function markNotificationRead(id: string): Promise<{ ok: true }> {
  return authedPatch<{ ok: true }>(`/notification/${encodeURIComponent(id)}/read`);
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return authedPatch<{ updated: number }>('/notification/read-all');
}

/**
 * Vacía el historial. **Borra de verdad, no oculta** — y por eso la pantalla lo
 * confirma antes de llamar.
 */
export async function clearNotifications(): Promise<{ deleted: number }> {
  const res = await fetch(`${API_URL}/notification/all`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    const err = new Error(payload.message ?? `HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return unwrap<{ deleted: number }>(await res.json().catch(() => ({})));
}
