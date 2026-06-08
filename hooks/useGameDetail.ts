import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { GameDetailData } from '../screens';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

/**
 * `GET /game/:id` (GameService.findByIdWithCreator). Expone:
 *   - `game`   : subconjunto que el editor necesita (video almacenado + duración).
 *   - `detail` : el partido mapeado a `GameDetailData` para el visor HLS — con
 *                cámaras y stream reales (antes esto venía de un mock).
 */
export interface GameDetailApi {
  id: string;
  recordingUrl: string | null;
  durationSeconds: number | null;
}

interface BackendCamera {
  isPrimary: boolean;
  camera: {
    identifier: string;
    streamingUrl: string | null;
    cameraConfig?: {
      user?: { id: string; username: string; name?: string | null } | null;
    } | null;
  };
}

interface BackendGameDetail {
  id: string;
  status?: string;
  viewers?: number;
  recordingUrl?: string | null;
  durationSeconds?: number | null;
  padelCourt?: { name?: string | null; surface?: string | null } | null;
  cameras?: BackendCamera[];
  gamePlayers?: Array<{ user: { username: string; name?: string | null } }>;
}

const SURFACES = ['CLAY', 'GRASS', 'HARD', 'CARPET'] as const;
function normalizeSurface(s?: string | null): GameDetailData['floor'] {
  const up = (s ?? '').toUpperCase();
  return (SURFACES as readonly string[]).includes(up)
    ? (up as GameDetailData['floor'])
    : 'HARD';
}

function mapDetail(data: BackendGameDetail): GameDetailData {
  const cams = data.cameras ?? [];
  const primary = cams.find((c) => c.isPrimary)?.camera ?? cams[0]?.camera;
  const clubUser = primary?.cameraConfig?.user;
  return {
    id: data.id,
    court: data.padelCourt?.name ?? primary?.identifier ?? 'Cancha',
    floor: normalizeSurface(data.padelCourt?.surface),
    club: clubUser?.name ?? clubUser?.username ?? '',
    clubHandle: clubUser?.username ? '@' + clubUser.username : '',
    clubFollowers: 0,
    time: '',
    date: '',
    viewers: data.viewers ?? 0,
    isLive: data.status === 'LIVE',
    players: (data.gamePlayers ?? []).map((gp) => ({
      username: '@' + gp.user.username,
      name: gp.user.name ?? gp.user.username,
    })),
    cameras: cams.map((c, i) => ({
      id: c.camera.identifier || `cam-${i + 1}`,
      number: String(i + 1).padStart(2, '0'),
      label: c.camera.identifier || `Cámara ${i + 1}`,
      state: c.camera.streamingUrl ? 'available' : 'inactive',
      streamUrl: c.camera.streamingUrl ?? undefined,
    })),
  };
}

export function useGameDetail(gameId: string | undefined) {
  const [game, setGame] = useState<GameDetailApi | null>(null);
  const [detail, setDetail] = useState<GameDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!gameId) {
      setGame(null);
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const res = await fetch(`${API_URL}/game/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json && typeof json === 'object' && 'data' in json ? json.data : json;
      setGame({
        id: data.id,
        recordingUrl: data.recordingUrl ?? null,
        durationSeconds: data.durationSeconds ?? null,
      });
      setDetail(mapDetail(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el partido.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    load();
  }, [load]);

  return { game, detail, loading, error, refresh: load };
}
