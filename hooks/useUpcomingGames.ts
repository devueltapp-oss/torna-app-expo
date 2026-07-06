/**
 * useUpcomingGames — próximas partidas del usuario (GET /game/:id/upcoming vía
 * `fetchUpcomingByUser`), mapeadas a `UpcomingGameData` para el carrusel
 * "Próximos" del Home y para abrir `UpcomingMatchSheet`.
 *
 * El endpoint NO incluye `padelCourt` ni `applications`, así que el nombre de
 * cancha cae a "Cancha" y las postulaciones quedan vacías. Sí trae
 * `scheduledStartAt` (hora/fecha reales) y los `gamePlayers` con equipo/capitán.
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchUpcomingByUser, type BackendUpcomingGame } from '../api/games';
import type { UpcomingGameData, UpcomingGamePlayer } from '../data/types';

function fmtTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function mapPlayer(p: BackendUpcomingGame['gamePlayers'][number]): UpcomingGamePlayer {
  return {
    id: p.user.id,
    username: '@' + p.user.username,
    name: p.user.name ?? p.user.username,
    profilePicture: p.user.profilePicture ?? undefined,
    team: p.team === 1 || p.team === 2 ? p.team : undefined,
  };
}

function mapGame(g: BackendUpcomingGame, userId?: string): UpcomingGameData {
  const captain = g.gamePlayers.find((p) => p.isCaptain);
  const mine = userId ? g.gamePlayers.find((p) => p.userId === userId) : undefined;
  const myTeam = mine?.team === 1 || mine?.team === 2 ? mine.team : undefined;
  return {
    id: g.id,
    time: fmtTime(g.scheduledStartAt),
    date: fmtDate(g.scheduledStartAt),
    court: 'Cancha',
    club: '',
    players: g.gamePlayers.map(mapPlayer),
    following: 'club',
    isOpenForPlayers: g.isOpenForPlayers ?? false,
    maxPlayers: 4,
    isCreator: !!captain && captain.userId === userId,
    applications: [],
    status: g.status,
    myTeam,
    viewerIsParticipant: !!mine,
  };
}

export function useUpcomingGames(userId?: string) {
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGameData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setUpcomingGames([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const arr = await fetchUpcomingByUser(userId);
      setUpcomingGames(arr.map((g) => mapGame(g, userId)));
    } catch (err) {
      console.error('[useUpcomingGames] load failed:', err);
      setUpcomingGames([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return { upcomingGames, loading, refresh: load };
}
