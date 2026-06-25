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

/** Comentario de un highlight (GET /highlights/:id, POST /highlights/:id/comments). */
export interface HighlightComment {
  id: string;
  userId: string;
  username: string;
  name: string | null;
  profilePicture: string | null;
  content: string;
  createdAt: string;
}

/** Detalle de un highlight con comentarios + estado de like del usuario actual. */
export interface HighlightDetail {
  id: string;
  likesCount: number;
  isLikedByMe: boolean;
  comments: HighlightComment[];
}

async function token(): Promise<string> {
  return (await SecureStore.getItemAsync(TOKEN_KEY)) ?? '';
}

function unwrap<T>(json: any): T {
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

async function authedGet<T>(path: string, timeoutMs = 15000): Promise<T> {
  // Timeout: sin esto, una request que cuelga deja una promesa pendiente para
  // siempre. Si esta llamada vive dentro de un Promise.all (p. ej. useUserProfile),
  // un cuelgue acá congelaría toda la pantalla en estado de carga.
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

/** Highlights públicos (isEnabled) de un usuario, ordenados por fecha desc. */
export function fetchUserHighlights(userId: string): Promise<UserHighlight[]> {
  return authedGet<UserHighlight[]>(`/highlights?userId=${encodeURIComponent(userId)}`);
}

/** Detalle de un highlight: comentarios + likesCount + isLikedByMe. */
export function fetchHighlightDetail(id: string): Promise<HighlightDetail> {
  return authedGet<HighlightDetail>(`/highlights/${encodeURIComponent(id)}`);
}

/** Toggle de like sobre un highlight. Devuelve el estado resultante. */
export function toggleHighlightLike(id: string): Promise<{ liked: boolean; likesCount: number }> {
  return authedSend('POST', `/highlights/${encodeURIComponent(id)}/like`);
}

/** Agrega un comentario a un highlight y devuelve el comentario creado. */
export function addHighlightComment(id: string, content: string): Promise<HighlightComment> {
  return authedSend('POST', `/highlights/${encodeURIComponent(id)}/comments`, { content });
}

/** TODOS los highlights del usuario autenticado (públicos + privados), fecha desc. */
export function fetchMyHighlights(): Promise<MyHighlight[]> {
  return authedGet<MyHighlight[]>('/highlights/my');
}

/** Highlight recién creado que devuelve POST /highlights/from-recording. */
export interface CreatedHighlight {
  id: string;
  clipUrl: string;
  thumbnailUrl: string | null;
  duration: number;
  title: string | null;
}

/**
 * Crea un highlight recortando server-side: el backend baja el rango pedido de
 * la grabación del partido (byte-range), recorta con FFmpeg, sube el clip a B2 y
 * persiste el highlight. Reemplaza el recorte on-device (ffmpeg-kit) que
 * crasheaba la app.
 */
export async function createHighlightFromRecording(params: {
  gameId: string;
  start: number;
  end: number;
  title?: string;
  isPublic: boolean;
}): Promise<CreatedHighlight> {
  const res = await fetch(`${API_URL}/highlights/from-recording`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await token()}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`No se pudo crear el highlight (HTTP ${res.status}). ${body}`.trim());
    (err as any).status = res.status;
    throw err;
  }
  return unwrap<CreatedHighlight>(await res.json().catch(() => ({})));
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
