/**
 * Cliente de chat: inbox unificado + mensajes directos (DM 1-a-1).
 *
 *   GET  /chat/inbox            → conversaciones (DMs + grupos de partidas), desc
 *   GET  /chat/dm/:userId?since= → hilo con un usuario (find-or-create), asc
 *   POST /chat/dm/:userId        → enviar DM { content }
 *   POST /chat/dm/:userId/read   → marcar el hilo como leído
 *
 * Los chats grupales de partidas usan los endpoints /game/:id/chat (api/games.ts).
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

async function authedSend<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
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

/** Ítem del inbox: DM 1-a-1 (`kind:'dm'`) o chat grupal de una partida (`kind:'game'`). */
export interface InboxItem {
  kind: 'dm' | 'game';
  /** conversationId (dm) o gameId (game). */
  id: string;
  /** Solo dm: Firebase UID del otro usuario (para abrir el hilo). */
  otherUserId: string | null;
  title: string;
  avatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  /** Grupo de partida finalizada/cancelada → chat de solo lectura. */
  readOnly: boolean;
}

/** Mensaje directo (misma forma que GameChatMessage, con conversationId en vez de gameId). */
export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  username: string;
  name: string | null;
  profilePicture: string | null;
  content: string;
  createdAt: string;
}

export function fetchInbox(): Promise<InboxItem[]> {
  return authedGet<InboxItem[]>('/chat/inbox');
}

export function fetchDirectChat(userId: string, since?: string): Promise<DirectMessage[]> {
  const q = since ? `?since=${encodeURIComponent(since)}` : '';
  return authedGet<DirectMessage[]>(`/chat/dm/${encodeURIComponent(userId)}${q}`);
}

export function sendDirectMessage(userId: string, content: string): Promise<DirectMessage> {
  return authedSend<DirectMessage>(`/chat/dm/${encodeURIComponent(userId)}`, { content });
}

export function markDmRead(userId: string): Promise<void> {
  return authedSend<void>(`/chat/dm/${encodeURIComponent(userId)}/read`);
}
