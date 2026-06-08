import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { LiveGameData } from '../components/cards';

/**
 * useLiveGames — partidas en vivo de los clubes/jugadores que sigue el usuario.
 *
 * Consume GET /game/live (backend NestJS). La URL de stream HLS viene en
 * `cameras[].camera.streamingUrl`; el club es el dueño de la cámara
 * (`cameraConfig.user`). El backend envuelve la respuesta en `{ data }`.
 *
 * Devuelve los datos mapeados al tipo `LiveGameData` que consume `HomeScreen`.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

interface BackendLiveGame {
  id: string;
  padelCourt?: { name?: string | null } | null;
  cameras?: Array<{
    isPrimary: boolean;
    camera: {
      identifier: string;
      streamingUrl: string | null;
      cameraConfig?: {
        user?: { id: string; username: string; name?: string | null } | null;
      } | null;
    };
  }>;
  gamePlayers?: Array<{ user: { username: string; name?: string | null } }>;
}

function mapLiveGame(g: BackendLiveGame): LiveGameData {
  const primary =
    g.cameras?.find((c) => c.isPrimary)?.camera ?? g.cameras?.[0]?.camera;
  const club =
    primary?.cameraConfig?.user?.name ??
    primary?.cameraConfig?.user?.username ??
    'Club';

  return {
    id: g.id,
    players: (g.gamePlayers ?? []).map((gp) => ({
      username: '@' + gp.user.username,
      name: gp.user.name ?? gp.user.username,
    })),
    club,
    court: g.padelCourt?.name ?? primary?.identifier ?? 'Cancha',
    streamUrl: primary?.streamingUrl ?? undefined,
  };
}

export function useLiveGames() {
  const [liveGames, setLiveGames] = useState<LiveGameData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token || !API_URL) {
        setLiveGames([]);
        return;
      }
      const res = await fetch(`${API_URL}/game/live`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setLiveGames([]);
        return;
      }
      const json = await res.json();
      const arr: BackendLiveGame[] = Array.isArray(json) ? json : json.data ?? [];
      setLiveGames(arr.map(mapLiveGame));
    } catch (err) {
      console.error('[useLiveGames] load failed:', err);
      setLiveGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { liveGames, loading, refresh: load };
}
