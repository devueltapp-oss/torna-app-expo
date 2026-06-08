import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { UpcomingGameData } from '../data/types';

/**
 * useOpenGames — partidas ABIERTAS a las que el usuario puede postularse.
 *
 * Consume GET /game/open (backend NestJS): juegos con isOpenForPlayers=true,
 * programados/en espera, con cupo y donde el usuario no participa. Mapea la
 * respuesta → `UpcomingGameData` para reutilizar `UpcomingMatchSheet` /
 * `ApplyMatchSheet` (que ya postean a POST /game/:id/apply).
 *
 * Mismo patrón que `hooks/useLiveGames.ts`.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

interface BackendOpenGame {
  id: string;
  scheduledStartAt?: string | null;
  padelCourt?: { name?: string | null } | null;
  cameras?: Array<{
    isPrimary: boolean;
    camera: {
      identifier: string;
      cameraConfig?: {
        user?: { id: string; username: string; name?: string | null } | null;
      } | null;
    };
  }>;
  gamePlayers?: Array<{
    user: { id: string; username: string; name?: string | null; profilePicture?: string | null };
  }>;
}

function fmtTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function mapOpenGame(g: BackendOpenGame): UpcomingGameData {
  const primary =
    g.cameras?.find((c) => c.isPrimary)?.camera ?? g.cameras?.[0]?.camera;
  const club =
    primary?.cameraConfig?.user?.name ??
    primary?.cameraConfig?.user?.username ??
    'Club';

  return {
    id: g.id,
    time: fmtTime(g.scheduledStartAt),
    date: fmtDate(g.scheduledStartAt),
    court: g.padelCourt?.name ?? primary?.identifier ?? 'Cancha',
    club,
    players: (g.gamePlayers ?? []).map((gp) => ({
      id: gp.user.id,
      username: '@' + gp.user.username,
      name: gp.user.name ?? gp.user.username,
      profilePicture: gp.user.profilePicture ?? undefined,
    })),
    following: 'club',
    isOpenForPlayers: true,
    maxPlayers: 4,
    isCreator: false,
  };
}

export function useOpenGames() {
  const [openGames, setOpenGames] = useState<UpcomingGameData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token || !API_URL) {
        setOpenGames([]);
        return;
      }
      const res = await fetch(`${API_URL}/game/open`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setOpenGames([]);
        return;
      }
      const json = await res.json();
      const arr: BackendOpenGame[] = Array.isArray(json) ? json : json.data ?? [];
      setOpenGames(arr.map(mapOpenGame));
    } catch (err) {
      console.error('[useOpenGames] load failed:', err);
      setOpenGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { openGames, loading, refresh: load };
}
