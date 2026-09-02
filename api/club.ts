/**
 * Ubicación del club (`/club/location`).
 *
 * Hasta 2026-09-02 no había forma de cargarla por API: `UpdateUserDto` no expone
 * lat/lng, así que solo entraba por los seeds. Sin coordenadas, un club no
 * aparece en el mapa y —lo que más importa— **sus partidas abiertas no avisan a
 * nadie**: el fan-out de `OPEN_GAME_NEARBY` se ancla en la cancha.
 */
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

export interface ClubLocation {
  id: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  hasLocation: boolean;
}

async function send<T>(method: 'GET' | 'PUT', path: string, body?: unknown): Promise<T> {
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

export function fetchClubLocation(): Promise<ClubLocation> {
  return send<ClubLocation>('GET', '/club/location');
}

/** `address` opcional: si no va, no se pisa la que ya estuviera cargada. */
export function saveClubLocation(data: {
  latitude: number;
  longitude: number;
  address?: string;
}): Promise<ClubLocation> {
  return send<ClubLocation>('PUT', '/club/location', data);
}
