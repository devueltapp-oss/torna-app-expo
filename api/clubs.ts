/**
 * Cliente de clubes / canchas / reservas.
 *
 *   GET  /padel-court?clubId=             → canchas de un club
 *   GET  /padel-court/:id                 → una cancha
 *   GET  /padel-court/:id/slots?date=     → slots de un día
 *   POST /game/reserve                    → crear reserva (partida sin cámaras)
 *
 * El backend envuelve toda respuesta en { data, statusCode } (TransformInterceptor).
 */
import * as SecureStore from 'expo-secure-store';
import type { ClubCourtPublic, Slot, SearchableCourt } from '../data/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

async function token(): Promise<string> {
  return (await SecureStore.getItemAsync(TOKEN_KEY)) ?? '';
}

function unwrap<T>(json: any): T {
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

async function authedGet<T>(path: string, timeoutMs = 15000): Promise<T> {
  // Timeout: una request colgada (sin esto) dejaría la pantalla de reserva
  // cargando para siempre. AbortController la corta a los 15s. Mismo patrón que
  // api/users.ts.
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

async function authedPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    const err = new Error(payload.message ?? `HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  return unwrap<T>(await res.json().catch(() => ({})));
}

const SURFACES = ['CLAY', 'GRASS', 'HARD', 'CARPET'] as const;
function normalizeSurface(s?: string | null): ClubCourtPublic['surface'] {
  const up = (s ?? '').toUpperCase();
  return (SURFACES as readonly string[]).includes(up)
    ? (up as ClubCourtPublic['surface'])
    : 'HARD';
}

interface BackendCourt {
  id: string;
  name: string;
  surface: string | null;
  description: string | null;
}

function mapCourt(c: BackendCourt): ClubCourtPublic {
  return {
    id: c.id,
    name: c.name,
    surface: normalizeSurface(c.surface),
    cams: 0,
    indoor: false,
    nextSlot: '',
  };
}

/** Canchas de un club. */
export async function fetchClubCourts(clubId: string): Promise<ClubCourtPublic[]> {
  const courts = await authedGet<BackendCourt[]>(
    `/padel-court?clubId=${encodeURIComponent(clubId)}`,
  );
  return courts.map(mapCourt);
}

/** Una cancha por id. */
export async function fetchCourt(courtId: string): Promise<ClubCourtPublic> {
  const c = await authedGet<BackendCourt>(`/padel-court/${encodeURIComponent(courtId)}`);
  return mapCourt(c);
}

/** Slots de una cancha para un día (YYYY-MM-DD). */
export function fetchCourtSlots(courtId: string, date: string): Promise<Slot[]> {
  return authedGet<Slot[]>(
    `/padel-court/${encodeURIComponent(courtId)}/slots?date=${encodeURIComponent(date)}`,
  );
}

interface BackendCourtSearch {
  id: string;
  name: string;
  club: string;
  clubId: string;
  surface: string | null;
  hasCameras: boolean;
}

/** Búsqueda de canchas por texto (nombre de cancha o club). GET /padel-court/search?q= */
export async function searchCourts(q: string): Promise<SearchableCourt[]> {
  const rows = await authedGet<BackendCourtSearch[]>(
    `/padel-court/search?q=${encodeURIComponent(q)}`,
  );
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    club: c.club,
    clubId: c.clubId,
    surface: normalizeSurface(c.surface),
    hasCameras: c.hasCameras,
  }));
}

export interface CreateReservationInput {
  courtId: string;
  date: string; // YYYY-MM-DD
  slotStart: string; // HH:mm
  durationMinutes: number; // 90 | 180
  mode: 'full' | 'search-opponents';
  partnerUserId?: string;
  opponentUserIds?: string[];
}

export interface CreatedReservation {
  id: string;
  status: string;
  isOpenForPlayers: boolean;
  scheduledStartAt: string;
  scheduledEndAt: string;
  padelCourt: { id: string; name: string; surface: string | null } | null;
  gamePlayers: Array<{
    position: number | null;
    isCaptain: boolean;
    user: { id: string; username: string; name: string | null };
  }>;
}

/** Crea una reserva (partida sin cámaras). */
export function createReservation(input: CreateReservationInput): Promise<CreatedReservation> {
  return authedPost<CreatedReservation>('/game/reserve', input);
}
