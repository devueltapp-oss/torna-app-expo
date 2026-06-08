/**
 * Cliente de highlights.
 *
 *   GET   /highlights?userId=<id>  → highlights públicos de un usuario (perfil)
 *   GET   /highlights/my           → TODOS los highlights del dueño (librería privada)
 *   PATCH /highlights/:id/toggle   → invierte visibilidad (isEnabled público/privado)
 *
 * Para highlights, `isEnabled` ES la visibilidad: true = público, false = privado.
 * El backend envuelve toda respuesta en { data, statusCode }; los helpers desenvuelven `data`.
 */
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

export interface UserHighlight {
  id: string;
  title: string | null;
  clipUrl: string;
  thumbnailUrl: string | null;
  duration: number; // segundos
  createdAt: string;
  likesCount: number;
}

/** Highlight propio (GET /highlights/my): incluye visibilidad (`isEnabled`). */
export interface MyHighlight extends UserHighlight {
  gameId: string;
  isEnabled: boolean; // true = público, false = privado
}

async function token(): Promise<string> {
  return (await SecureStore.getItemAsync(TOKEN_KEY)) ?? '';
}

function unwrap<T>(json: any): T {
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

async function authedGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return unwrap<T>(await res.json().catch(() => ({})));
}

/** Highlights públicos (isEnabled) de un usuario, ordenados por fecha desc. */
export function fetchUserHighlights(userId: string): Promise<UserHighlight[]> {
  return authedGet<UserHighlight[]>(`/highlights?userId=${encodeURIComponent(userId)}`);
}

/** TODOS los highlights del usuario autenticado (públicos + privados), fecha desc. */
export function fetchMyHighlights(): Promise<MyHighlight[]> {
  return authedGet<MyHighlight[]>('/highlights/my');
}

/** Invierte la visibilidad pública/privada de un highlight propio. */
export async function toggleHighlightVisibility(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/highlights/${encodeURIComponent(id)}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${await token()}` },
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
}
