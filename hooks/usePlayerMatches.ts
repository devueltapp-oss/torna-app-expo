import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { LibraryMatch } from '../data/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

/**
 * Item crudo que devuelve `GET /game/player/:id/history`
 * (GameService.listGamesByPlayer). Solo trae partidos FINISHED con
 * recordingUrl, así que cada uno es editable en el VideoEditor.
 */
interface PlayerMatchApi {
  id: string;
  status: string;
  createdAt: string;
  recordingUrl: string;
  clipsCount: number;
  hasClips: boolean;
  cover: string | null;
  court: string | null;
  durationInSeconds: number;
}

function formatDurationLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')} min`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function mapToLibraryMatch(item: PlayerMatchApi): LibraryMatch {
  const court = item.court ?? 'Cancha';
  return {
    id: item.id,
    kind: 'match',
    title: court,
    subtitle: undefined,
    surface: 'HARD',
    cameras: 1,
    highlightsCount: item.clipsCount ?? 0,
    isPublic: false,
    // recordingUrl es el video almacenado (B2) que el editor recorta on-device.
    recordingUrl: item.recordingUrl,
    durationSeconds: item.durationInSeconds ?? 0,
    durationLabel: formatDurationLabel(item.durationInSeconds ?? 0),
    date: formatDate(item.createdAt),
  };
}

/**
 * Lista los partidos grabados del jugador (con recordingUrl real en B2) para
 * la Librería. Reemplaza `MOCK_MY_MATCHES_V2`: el video que se pasa al editor
 * sale de la API, no de un mock.
 */
export function usePlayerMatches(playerId: string | undefined) {
  const [matches, setMatches] = useState<LibraryMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!playerId) {
      setMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const res = await fetch(`${API_URL}/game/player/${playerId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: PlayerMatchApi[] = Array.isArray(json) ? json : json.data ?? [];
      setMatches(list.map(mapToLibraryMatch));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus partidos.');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  return { matches, loading, error, refresh: load };
}
