/**
 * Cliente de partidas (game).
 *
 *   GET   /game/mine                          → mis partidas (programadas/en espera/en vivo)
 *   POST  /game/:id/apply                     → postularme (con compañero opcional)
 *   PATCH /game/:id/applications/:appId/accept → aceptar postulación (capitán)
 *   PATCH /game/:id/applications/:appId/reject → rechazar postulación (capitán)
 *   PATCH /game/:id/cancel                    → cancelar la partida entera (capitán)
 *   POST  /game/:id/leave                     → darme de baja (miembro no capitán)
 *   POST  /game/:id/cancel-pair               → dar de baja a la pareja retadora (equipo 2)
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
  // Timeout: una request colgada (sin esto) dejaría la pantalla cargando para
  // siempre. AbortController la corta a los 15s. Mismo patrón que api/users.ts.
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

async function authedSend<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await token()}`,
    },
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

/* ─────────── Tipos de la respuesta cruda de GET /game/mine ─────────── */

export interface BackendGameUser {
  id: string;
  username: string;
  name?: string | null;
  profilePicture?: string | null;
}

export interface BackendMyGamePlayer {
  userId: string;
  team?: number | null;
  isCaptain: boolean;
  user: BackendGameUser;
}

export interface BackendMyGameApplication {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  applicant: BackendGameUser;
  partner?: BackendGameUser | null;
}

export interface BackendMyGame {
  id: string;
  status: string;
  isOpenForPlayers: boolean;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  padelCourt?: { name?: string | null } | null;
  gamePlayers: BackendMyGamePlayer[];
  applications: BackendMyGameApplication[];
}

/* ─────────── Funciones ─────────── */

export function fetchMyGames(): Promise<BackendMyGame[]> {
  return authedGet<BackendMyGame[]>('/game/mine');
}

/* ─────────── Partidas de un club (GET /game/club/:id) ─────────── */

/**
 * Forma cruda de `listGamesByClub`. ⚠️ Es **camera-céntrica** (partidas con cámara
 * del club / transmitidas): `court` es el identificador de la cámara primaria y NO
 * trae `scheduledStartAt` ni nombre de cancha — solo `createdAt`.
 */
export interface BackendClubGame {
  gameId: string;
  gameStatus: string;
  court: string | null;
  players: Array<{
    id: string;
    username: string;
    name?: string | null;
    profilePicture?: string | null;
  }>;
  createdAt: string;
}

export function fetchClubGames(clubId: string): Promise<BackendClubGame[]> {
  return authedGet<BackendClubGame[]>(`/game/club/${encodeURIComponent(clubId)}`);
}

/* ─────────── Próximas partidas de un usuario (GET /game/:id/upcoming) ─────────── */

/**
 * Forma cruda de `getUpcomingByUser`. Trae `scheduledStartAt` y `gamePlayers` con
 * el usuario embebido, pero NO incluye `padelCourt` ni `applications`. El backend
 * responde `{ message, data }`; acá devolvemos solo `data`.
 */
export interface BackendUpcomingGame {
  id: string;
  status: string;
  scheduledStartAt?: string | null;
  isOpenForPlayers?: boolean;
  gamePlayers: Array<{
    userId: string;
    team?: number | null;
    isCaptain?: boolean;
    user: {
      id: string;
      username: string;
      name?: string | null;
      profilePicture?: string | null;
    };
  }>;
}

/**
 * Próximas partidas del usuario. Pasamos `scheduledStartAt` = +30 días como cota
 * superior para abrir la ventana (sin el parámetro, el backend acota a HOY 8–22h).
 */
export async function fetchUpcomingByUser(userId: string): Promise<BackendUpcomingGame[]> {
  const horizon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const res = await authedGet<{ message: string; data: BackendUpcomingGame[] }>(
    `/game/${encodeURIComponent(userId)}/upcoming?scheduledStartAt=${encodeURIComponent(horizon)}`,
  );
  return res?.data ?? [];
}

export function applyToGame(gameId: string, partnerId?: string): Promise<unknown> {
  return authedSend('POST', `/game/${gameId}/apply`, partnerId ? { partnerId } : {});
}

export function acceptApplication(gameId: string, appId: string): Promise<unknown> {
  return authedSend('PATCH', `/game/${gameId}/applications/${appId}/accept`);
}

export function rejectApplication(gameId: string, appId: string): Promise<unknown> {
  return authedSend('PATCH', `/game/${gameId}/applications/${appId}/reject`);
}

export function cancelGame(gameId: string): Promise<unknown> {
  return authedSend('PATCH', `/game/${gameId}/cancel`);
}

export function leaveGame(gameId: string): Promise<unknown> {
  return authedSend('POST', `/game/${gameId}/leave`);
}

export function cancelChallengerPair(gameId: string): Promise<unknown> {
  return authedSend('POST', `/game/${gameId}/cancel-pair`);
}

/* ─────────── Comentarios de un partido (chat del stream) ─────────── */

export interface GameComment {
  id: string;
  userId: string;
  username: string;
  name: string | null;
  profilePicture: string | null;
  comment: string;
  createdAt: string;
}

/** Comentarios de un partido (GET /game/:id/comments), más antiguos primero. */
export function fetchGameComments(gameId: string): Promise<GameComment[]> {
  return authedGet<GameComment[]>(`/game/${encodeURIComponent(gameId)}/comments`);
}

/** Comenta un partido (POST /game/:id/comments) y devuelve el comentario creado. */
export function addGameComment(gameId: string, comment: string): Promise<GameComment> {
  return authedSend('POST', `/game/${encodeURIComponent(gameId)}/comments`, { comment });
}

/* ─────────── Chat privado de la partida (participantes) ─────────── */

export interface GameChatMessage {
  id: string;
  gameId: string;
  senderId: string;
  username: string;
  name: string | null;
  profilePicture: string | null;
  content: string;
  createdAt: string;
}

/**
 * Historial del chat de una partida (GET /game/:id/chat), más antiguos primero.
 * `since` (ISO) opcional → solo mensajes posteriores (poll incremental). Solo
 * participantes: la API devuelve 403 a quien no juega la partida.
 */
export function fetchGameChat(gameId: string, since?: string): Promise<GameChatMessage[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  return authedGet<GameChatMessage[]>(`/game/${encodeURIComponent(gameId)}/chat${qs}`);
}

/** Envía un mensaje al chat de la partida (POST /game/:id/chat). */
export function sendGameChatMessage(gameId: string, content: string): Promise<GameChatMessage> {
  return authedSend('POST', `/game/${encodeURIComponent(gameId)}/chat`, { content });
}

/** Suscribirse a notificaciones de un partido (POST /game/:id/watch). */
export function watchGame(gameId: string): Promise<unknown> {
  return authedSend('POST', `/game/${gameId}/watch`);
}

/** Cancelar la suscripción de notificaciones de un partido (DELETE /game/:id/watch). */
export function unwatchGame(gameId: string): Promise<unknown> {
  return authedSend('DELETE', `/game/${gameId}/watch`);
}

/**
 * Registra el resultado propio de una partida finalizada (gané/perdí).
 * Solo participantes de un game con endedAt != null. Una vez registrado no se
 * puede cambiar (el backend devuelve 400 en el segundo intento).
 */
export function registerGameResult(
  gameId: string,
  isWinner: boolean,
): Promise<{ success: boolean; message: string }> {
  return authedSend('POST', `/game/${gameId}/register-result`, { isWinner });
}
