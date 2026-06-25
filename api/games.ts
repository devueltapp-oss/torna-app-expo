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
  method: 'POST' | 'PATCH',
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
