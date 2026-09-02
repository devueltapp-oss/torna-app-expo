/**
 * Cliente de direcciones (`/geo`) — traduce entre texto y coordenadas.
 *
 *   GET /geo/status                                  → { configured }
 *   GET /geo/autocomplete?text=&latitude=&longitude= → AddressSuggestion[]
 *   GET /geo/reverse?latitude=&longitude=            → AddressSuggestion | null
 *
 * ⚠️ **La clave de Geoapify NO está en la app.** El backend hace la llamada al
 * proveedor: una clave dentro del APK la extrae cualquiera con un descompresor y
 * regala la cuota. Si ves un `EXPO_PUBLIC_GEOAPIFY_*` en un PR, está mal.
 *
 * ⚠️ Esto es solo para **ubicar un club** (rol club). La cercanía de las
 * partidas la calcula el backend con un haversine en SQL y no llama a ningún
 * tercero — ver `api/nearby.ts`.
 */
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

export interface AddressSuggestion {
  id: string;
  /** Dirección completa en un renglón. Es lo que se guarda. */
  label: string;
  /** Las dos líneas son para pintar la lista: `label` entero no se lee en una fila. */
  line1: string;
  line2: string;
  latitude: number;
  longitude: number;
}

async function get<T>(path: string): Promise<T> {
  const auth = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? '';
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${auth}` },
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

/**
 * ¿Vale la pena mostrar el buscador de direcciones?
 *
 * Sin `GEOAPIFY_API_KEY` en el backend, cada tecla daría 503. "Usar mi ubicación
 * actual" **no** depende de Geoapify, así que la pantalla sigue sirviendo sin la
 * clave — solo hay que saber qué camino ofrecer. Nunca lanza: un backend viejo
 * sin la ruta cuenta como "no configurado".
 */
export async function isGeoConfigured(): Promise<boolean> {
  try {
    const res = await get<{ configured: boolean }>('/geo/status');
    return !!res?.configured;
  } catch {
    return false;
  }
}

/** `near` **ordena** por cercanía, no recorta: un club lejano sigue apareciendo. */
export function searchAddress(
  text: string,
  near?: { latitude: number; longitude: number },
): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({ text });
  if (near) {
    params.set('latitude', String(near.latitude));
    params.set('longitude', String(near.longitude));
  }
  return get<AddressSuggestion[]>(`/geo/autocomplete?${params.toString()}`);
}

/** `null` si esas coordenadas no tienen dirección (un descampado). No es un error. */
export function reverseAddress(
  latitude: number,
  longitude: number,
): Promise<AddressSuggestion | null> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });
  return get<AddressSuggestion | null>(`/geo/reverse?${params.toString()}`);
}
