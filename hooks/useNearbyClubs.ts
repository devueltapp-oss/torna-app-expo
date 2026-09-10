import React from 'react';
import type { NearbyClub } from '../data/types';

/**
 * Promesa con timeout: si `p` no resuelve en `ms`, cae a `fb`. Mismo patrón que
 * `useFollowedClubs.ts` — un fetch colgado no puede dejar el spinner para siempre.
 */
function withTimeout<T>(p: Promise<T>, ms: number, fb: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fb), ms))]);
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

/** Resultado de pedir la posición: `granted:false` = permiso denegado, sin coords. */
export interface PositionResult {
  granted: boolean;
  coords: GeoPosition | null;
}

export interface NearbyClubsState {
  clubs: NearbyClub[];
  loading: boolean;
  /** true solo después de que el usuario pidió la ubicación y el sistema la negó. */
  permissionDenied: boolean;
  /** Pide permiso (si hace falta) y busca — se llama desde un botón, "en contexto". */
  requestNearby: () => void;
}

/**
 * Clubes cerca del jugador, CON canchas reservables (GET /club/nearby, ya
 * filtrado del lado del backend) — picker de club de la reserva, además de
 * "Clubs que sigues" (2026-09-10: antes SOLO mostraba los seguidos).
 *
 * ⚠️ `getPosition` se inyecta a propósito, igual que `fetchNearby`: `lib/location.ts`
 * documenta explícitamente que su único destino es el aviso de partidas cercanas
 * ("no agregues acá un jugadores/clubes cerca de mí"), así que esta pantalla NO lo
 * importa — el caller (`App.tsx`) arma su propia lectura de posición con
 * `expo-location` y la pasa acá. Esto además deja el hook 100% testeable sin
 * mockear un módulo nativo.
 *
 * Permiso **solo en contexto**: al montar, si el permiso YA está concedido (p.
 * ej. porque la persona activó el aviso de partidas cercanas antes), busca
 * directo. Si no, no dispara ningún diálogo del sistema por su cuenta —
 * `requestNearby()` es lo único que lo hace, pensado para un botón "Usar mi
 * ubicación" que la persona toca a propósito.
 */
export function useNearbyClubs(
  fetchNearby: (lat: number, lng: number, radiusKm?: number) => Promise<NearbyClub[]>,
  getPosition: (requestPermission: boolean) => Promise<PositionResult>,
  timeoutMs = 8000,
): NearbyClubsState {
  const [clubs, setClubs] = React.useState<NearbyClub[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [permissionDenied, setPermissionDenied] = React.useState(false);

  const fetchRef = React.useRef(fetchNearby);
  fetchRef.current = fetchNearby;
  const positionRef = React.useRef(getPosition);
  positionRef.current = getPosition;

  const search = React.useCallback(async (coords: GeoPosition) => {
    setLoading(true);
    const rows = await withTimeout(
      fetchRef.current(coords.latitude, coords.longitude).catch(() => [] as NearbyClub[]),
      timeoutMs,
      [],
    );
    setClubs(rows);
    setLoading(false);
  }, [timeoutMs]);

  // Al montar: solo mira si YA hay permiso, sin pedirlo — `requestPermission:false`.
  React.useEffect(() => {
    let active = true;
    (async () => {
      const res = await withTimeout(
        positionRef.current(false).catch(() => ({ granted: false, coords: null } as PositionResult)),
        timeoutMs,
        { granted: false, coords: null },
      );
      if (!active || !res.granted || !res.coords) return;
      await search(res.coords);
    })();
    return () => { active = false; };
  }, [search, timeoutMs]);

  const requestNearby = React.useCallback(() => {
    (async () => {
      setLoading(true);
      const res = await withTimeout(
        positionRef.current(true).catch(() => ({ granted: false, coords: null } as PositionResult)),
        timeoutMs,
        { granted: false, coords: null },
      );
      if (!res.granted || !res.coords) {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }
      setPermissionDenied(false);
      await search(res.coords);
    })();
  }, [search, timeoutMs]);

  return { clubs, loading, permissionDenied, requestNearby };
}
