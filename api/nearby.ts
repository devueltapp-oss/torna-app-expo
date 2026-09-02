/**
 * Cliente de cercanía (`/nearby`) — avisos de partidas abiertas cerca.
 *
 *   GET    /nearby/settings   → { enabled, hasLocation, updatedAt, radiusKm }
 *   PUT    /nearby/settings   { enabled }            → misma forma
 *   PUT    /nearby/location   { latitude, longitude } → misma forma
 *   DELETE /nearby/location                          → misma forma
 *
 * Prefijo propio y no `/user/...`: el `UserController` del backend termina en
 * `@Get(':id')` y se comería un `GET /user/nearby-...`.
 *
 * El backend envuelve toda respuesta en `{ data, statusCode }`.
 */
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

export interface NearbySettings {
  /** Opt-in del aviso. Default false: nadie empieza compartiendo ubicación. */
  enabled: boolean;
  /** ¿El backend tiene una posición guardada? Sin esto no entra al fan-out. */
  hasLocation: boolean;
  /** ISO de la última vez que se reportó, o null. */
  updatedAt: string | null;
  /** Radio del aviso en km. Lo decide el backend; la app solo lo muestra. */
  radiusKm: number;
}

async function send<T>(
  method: 'GET' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const auth = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? '';
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${auth}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    const err = new Error(payload.message ?? `HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  const json: any = await res.json().catch(() => ({}));
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

export function fetchNearbySettings(): Promise<NearbySettings> {
  return send<NearbySettings>('GET', '/nearby/settings');
}

/** Apagarlo **borra** la ubicación guardada en el backend, no solo deja de usarla. */
export function setNearbyEnabled(enabled: boolean): Promise<NearbySettings> {
  return send<NearbySettings>('PUT', '/nearby/settings', { enabled });
}

/** Reporta la posición. El backend la redondea a ~110 m antes de guardarla. */
export function updateMyLocation(latitude: number, longitude: number): Promise<NearbySettings> {
  return send<NearbySettings>('PUT', '/nearby/location', { latitude, longitude });
}

/** Olvida la posición guardada. Lo llama el logout. */
export function clearMyLocation(): Promise<NearbySettings> {
  return send<NearbySettings>('DELETE', '/nearby/location');
}
