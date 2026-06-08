/**
 * usePlayers — directorio de jugadores reales (GET /user/players, paginado).
 * Mapea la respuesta del backend al tipo `PlayerData` que consume `PlayersScreen`.
 */
import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { PlayerData } from '../components/cards';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

interface BackendPlayer {
  id: string;
  username: string;
  name?: string | null;
  email?: string | null;
}

export function usePlayers() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token || !API_URL) {
        setPlayers([]);
        return;
      }
      const res = await fetch(`${API_URL}/user/players?page=1&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setPlayers([]);
        return;
      }
      const json = await res.json();
      const payload = json && typeof json === 'object' && 'data' in json ? json.data : json;
      const items: BackendPlayer[] = payload?.items ?? (Array.isArray(payload) ? payload : []);
      setPlayers(
        items.map((u) => ({
          id: u.id,
          name: u.name ?? u.username,
          username: u.username.startsWith('@') ? u.username : '@' + u.username,
          email: u.email ?? '',
        })),
      );
    } catch (err) {
      console.error('[usePlayers] load failed:', err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { players, loading, refresh: load };
}
