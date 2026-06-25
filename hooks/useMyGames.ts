import { useCallback, useEffect, useState } from 'react';
import { fetchMyGames, type BackendMyGame } from '../api/games';
import type { GameApplication, UpcomingGameData, UpcomingGamePlayer } from '../data/types';

/**
 * useMyGames — partidas del usuario autenticado (programadas/en espera/en vivo)
 * en las que participa. Consume GET /game/mine y mapea → `UpcomingGameData`
 * (con equipos, rol y postulaciones) para reutilizar `UpcomingMatchSheet`.
 *
 * Necesita el `userId` (Firebase UID) para derivar `isCreator`/`myTeam` desde
 * los `gamePlayers`. Mismo patrón que `hooks/useOpenGames.ts`.
 */

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

function mapPlayer(p: BackendMyGame['gamePlayers'][number]): UpcomingGamePlayer {
  return {
    id: p.user.id,
    username: '@' + p.user.username,
    name: p.user.name ?? p.user.username,
    profilePicture: p.user.profilePicture ?? undefined,
    team: p.team === 1 || p.team === 2 ? p.team : undefined,
  };
}

function mapApplication(a: BackendMyGame['applications'][number]): GameApplication {
  return {
    id: a.id,
    status: a.status,
    applicant: {
      id: a.applicant.id,
      username: '@' + a.applicant.username,
      name: a.applicant.name ?? a.applicant.username,
      profilePicture: a.applicant.profilePicture ?? undefined,
    },
    partner: a.partner
      ? {
          id: a.partner.id,
          username: '@' + a.partner.username,
          name: a.partner.name ?? a.partner.username,
          profilePicture: a.partner.profilePicture ?? undefined,
        }
      : undefined,
  };
}

function mapMyGame(g: BackendMyGame, userId?: string): UpcomingGameData {
  const captain = g.gamePlayers.find((p) => p.isCaptain);
  const mine = userId ? g.gamePlayers.find((p) => p.userId === userId) : undefined;
  const myTeam = mine?.team === 1 || mine?.team === 2 ? mine.team : undefined;

  return {
    id: g.id,
    time: fmtTime(g.scheduledStartAt),
    date: fmtDate(g.scheduledStartAt),
    court: g.padelCourt?.name ?? 'Cancha',
    club: '',
    players: g.gamePlayers.map(mapPlayer),
    following: 'club',
    isOpenForPlayers: g.isOpenForPlayers,
    maxPlayers: 4,
    isCreator: !!captain && captain.userId === userId,
    applications: g.applications.map(mapApplication),
    status: g.status,
    myTeam,
    viewerIsParticipant: !!mine,
  };
}

export function useMyGames(userId?: string) {
  const [myGames, setMyGames] = useState<UpcomingGameData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const arr = await fetchMyGames();
      setMyGames(arr.map((g) => mapMyGame(g, userId)));
    } catch (err) {
      console.error('[useMyGames] load failed:', err);
      setMyGames([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { myGames, loading, refresh: load };
}
