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
 *   POST  /game/:id/share                     → compartir el video de una partida FINALIZADA (capitán)
 *   GET   /game/shares/incoming                → solicitudes de video pendientes dirigidas a mí
 *   PATCH /game/shares/:shareId/accept|reject  → aceptar/rechazar un video compartido
 *
 * El backend envuelve toda respuesta en { data, statusCode } (TransformInterceptor).
 */
import * as SecureStore from 'expo-secure-store';
import { assertClub, type ClubIdentity } from '../lib/assertClub';

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
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT',
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
  /** Trae `category` además de lo básico: la hoja muestra el nivel del postulante. */
  applicant: BackendGameUser & { category?: number | null };
  partner?: (BackendGameUser & { category?: number | null }) | null;
}

export interface BackendMyGame {
  id: string;
  status: string;
  isOpenForPlayers: boolean;
  /** Categoría/nivel: 1 = más alta, 7 = iniciación. */
  category?: number | null;
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
  courtId?: string | null;
  courtName?: string | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  isReservation?: boolean;
  court: string | null;
  players: Array<{
    id: string;
    username: string;
    name?: string | null;
    profilePicture?: string | null;
  }>;
  createdAt: string;
}

export async function fetchClubGames(clubId: string): Promise<BackendClubGame[]> {
  const result = await authedGet<BackendClubGame[] | {data: BackendClubGame[]}>(`/game/club/${encodeURIComponent(clubId)}`);
  const rows = Array.isArray(result) ? result : result.data;
  if (!Array.isArray(rows)) throw new Error('No se pudo leer la agenda del club.');
  return rows;
}

/** Prepara una reserva como Desktop; no marca LIVE ni inicia RTMP. */
export async function prepareClubGame(user: ClubIdentity | null, gameId: string, cameraIds: string[]) {
  assertClub(user);
  if (!cameraIds.length) throw new Error('Elegí al menos una cámara.');
  return authedSend('POST', `/game/${encodeURIComponent(gameId)}/start-stream`, {cameraIds});
}

export async function fetchClubGameCameras(user: ClubIdentity | null, gameId: string): Promise<import('./cameras').ClubCamera[]> {
  assertClub(user);
  const rows = await authedGet<import('./cameras').ClubCamera[]>(`/game/${encodeURIComponent(gameId)}/cameras`);
  if (!Array.isArray(rows)) throw new Error('No se pudieron leer las cámaras de la partida.');
  return rows;
}

/**
 * Mismo endpoint que usa Torna Desktop para marcar la partida EN VIVO (dispara
 * `STREAMING_STARTED` del backend hacia los seguidores) o volverla a `STOPPED`.
 * Llamar a `'start'` SOLO después de confirmar que la cámara ya está transmitiendo
 * de verdad — este endpoint no lo verifica, confía en quien lo llama.
 */
export async function setGameLiveStatus(user: ClubIdentity | null, gameId: string, action: 'start' | 'stop') {
  assertClub(user);
  return authedSend('PUT', `/game/live/${encodeURIComponent(gameId)}/${action}`);
}

/* ─────────── Admin de partidas como club (crear + cancelar) ─────────── */

/**
 * Payload de `POST /game` — mismo contrato que usa `CreateGameDialog.jsx` del
 * desktop para este caso de uso (admin de club creando una partida con
 * jugadores reales, no el `POST /game/reserve` que usa el player). El
 * backend ya soporta este endpoint hoy; nada nuevo de backend acá.
 */
export interface CreateClubGameInput {
  jobId: string;
  cameraIds: string[];
  courtId: string;
  /** Ya compuestos en UTC — ver `lib/clubTime.ts` → `toClubIsoLabel`. */
  scheduledStartAt: string;
  scheduledEndAt: string;
  /** Nivel/categoría 1–7, obligatorio (1 = más alta, 7 = iniciación). */
  category: number;
}
export interface CreateClubGameResult { id: string }

/**
 * Crea una partida como club, asignando jugadores reales de la app (no
 * placeholders). Guarda `assertClub`: igual que `api/cameras.ts`, esta
 * función muta datos de terceros (la partida queda a nombre de los
 * `players`, no del club), así que amerita la misma defensa en profundidad
 * — el backend es la autoridad real y deriva el club dueño del Bearer token,
 * no de ningún campo de este body.
 */
export async function createClubGame(
  user: ClubIdentity | null,
  game: CreateClubGameInput,
  players: { userId: string }[],
): Promise<CreateClubGameResult> {
  assertClub(user);
  return authedSend<CreateClubGameResult>('POST', '/game', { game, players });
}

/**
 * Cancela (soft) una reserva de OTRO usuario en la propia cancha del club —
 * `PATCH /game/:id/cancel-reservation`, distinto del `PATCH /game/:id/cancel`
 * que ya usa el player-dueño sobre sus propias partidas (ver `cancelGame` más
 * abajo). Deja la partida en `CANCELLED` y el backend notifica a los jugadores.
 */
export async function cancelClubReservation(user: ClubIdentity | null, gameId: string): Promise<unknown> {
  assertClub(user);
  return authedSend('PATCH', `/game/${encodeURIComponent(gameId)}/cancel-reservation`);
}

/**
 * Finaliza manualmente una partida EN VIVO — `PATCH /game/:id {status:'FINISHED'}`,
 * mismo `editGame` que usa `GameId.jsx` del desktop (botón único de "Finalizar"
 * que corta toda transmisión y dispara el procesado de la grabación en el
 * backend). Es la ÚNICA transición manual que existe sobre una partida en vivo
 * — no hay "detener sin finalizar" ni "reanudar": `FINISHED` es terminal, a
 * diferencia de `CANCELLED` (terminal también, pero sin disparar nada más).
 */
export async function finishClubGame(user: ClubIdentity | null, gameId: string): Promise<unknown> {
  assertClub(user);
  return authedSend('PATCH', `/game/${encodeURIComponent(gameId)}`, { status: 'FINISHED' });
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

/* ─────────── Compartir el video de una partida finalizada ─────────── */

export interface IncomingVideoShare {
  id: string;
  createdAt: string;
  fromUser: { id: string; username: string; name?: string | null; profilePicture?: string | null };
  game: { id: string; createdAt: string; durationSeconds?: number | null };
}

export function shareGameVideo(gameId: string, toUserId: string): Promise<unknown> {
  return authedSend('POST', `/game/${gameId}/share`, { toUserId });
}

export function fetchIncomingVideoShares(): Promise<IncomingVideoShare[]> {
  return authedGet<IncomingVideoShare[]>('/game/shares/incoming');
}

export function acceptVideoShare(shareId: string): Promise<unknown> {
  return authedSend('PATCH', `/game/shares/${shareId}/accept`);
}

export function rejectVideoShare(shareId: string): Promise<unknown> {
  return authedSend('PATCH', `/game/shares/${shareId}/reject`);
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

/**
 * Comentarios de un partido (GET /game/:id/comments), más antiguos primero.
 * `since` (ISO) trae solo los posteriores — lo usa el poll incremental de
 * `useGameComments`.
 */
export function fetchGameComments(gameId: string, since?: string): Promise<GameComment[]> {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  return authedGet<GameComment[]>(`/game/${encodeURIComponent(gameId)}/comments${qs}`);
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
  /** Cuántas personas likearon el mensaje (una por persona, máx. 1 cada una). */
  likesCount?: number;
  /** Si el usuario autenticado ya lo likeó. */
  likedByMe?: boolean;
}

/** Respuesta del toggle de like, tanto en chat de partida como en DM. */
export interface MessageLikeResult {
  messageId: string;
  likesCount: number;
  likedByMe: boolean;
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

/**
 * Marca como leído el chat de la partida (POST /game/:id/chat/read) — avanza el cursor
 * `GamePlayer.lastReadAt`, que es lo que alimenta el badge de no leídos del inbox.
 * Espejo de `markDmRead` (`api/chat.ts`).
 */
export function markGameChatRead(gameId: string): Promise<void> {
  return authedSend('POST', `/game/${encodeURIComponent(gameId)}/chat/read`);
}

/**
 * Latido del espectador (POST /game/:id/viewer-ping): "sigo mirando".
 *
 * Devuelve el conteo en la MISMA respuesta, así mostrarlo no cuesta un request
 * extra. `viewers: null` = el backend no puede saberlo (sin Redis o Redis caído);
 * en ese caso la app no muestra nada — un 0 inventado sería peor.
 */
export function pingViewer(gameId: string): Promise<{ viewers: number | null }> {
  return authedSend('POST', `/game/${encodeURIComponent(gameId)}/viewer-ping`);
}

/**
 * Borra el chat de la partida **solo para mí** (DELETE /game/:id/chat).
 *
 * No borra ningún mensaje: el resto de los participantes siguen viendo el hilo
 * completo. Sale de mi inbox y me tapa lo anterior; si alguien escribe de nuevo,
 * vuelve con lo nuevo. Espejo de `deleteDirectChat` (`api/chat.ts`).
 */
export function deleteGameChat(gameId: string): Promise<{ ok: true }> {
  return authedSend('DELETE', `/game/${encodeURIComponent(gameId)}/chat`);
}

/**
 * Like / unlike de un mensaje del chat de la partida
 * (POST /game/:id/chat/:messageId/like). Es un **toggle**: si ya lo habías
 * likeado, se lo quita. El backend garantiza un like por persona por mensaje.
 */
export function toggleGameChatMessageLike(
  gameId: string,
  messageId: string,
): Promise<MessageLikeResult> {
  return authedSend(
    'POST',
    `/game/${encodeURIComponent(gameId)}/chat/${encodeURIComponent(messageId)}/like`,
  );
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
