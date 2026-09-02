import { useCallback, useEffect, useState } from 'react';
import { fetchMyGames, type BackendMyGame } from '../api/games';
import { formatClubDate, formatClubTime } from '../lib/clubTime';
import type { GameApplication, UpcomingGameData, UpcomingGamePlayer } from '../data/types';

/**
 * useMyGames — partidas del usuario autenticado (programadas/en espera/en vivo)
 * en las que participa. Consume GET /game/mine y mapea → `UpcomingGameData`
 * (con equipos, rol y postulaciones) para reutilizar `UpcomingMatchSheet`.
 *
 * Necesita el `userId` (Firebase UID) para derivar `isCreator`/`myTeam` desde
 * los `gamePlayers`. Mismo patrón que `hooks/useOpenGames.ts`.
 */

/**
 * ⚠️ **En hora del CLUB, no del teléfono** (`lib/clubTime`). Acá había un
 * `toLocaleTimeString()` que convertía a la zona del dispositivo: una reserva de
 * las 12:30 se mostraba como **08:30** en Venezuela. El `scheduledStartAt` que
 * guarda el backend es una *etiqueta* escrita en UTC, no un instante a convertir.
 */
const fmtTime = formatClubTime;
const fmtDate = formatClubDate;

function mapPlayer(p: BackendMyGame['gamePlayers'][number]): UpcomingGamePlayer {
  return {
    id: p.user.id,
    username: '@' + p.user.username,
    name: p.user.name ?? p.user.username,
    profilePicture: p.user.profilePicture ?? undefined,
    team: p.team === 1 || p.team === 2 ? p.team : undefined,
    // El backend ya marca al organizador con isCaptain; la app lo muestra como HOST.
    isHost: p.isCaptain === true,
  };
}

function mapApplication(a: BackendMyGame['applications'][number]): GameApplication {
  return {
    id: a.id,
    status: a.status,
    applicant: {
      // `id` es lo que permite abrir su perfil desde la fila; `category`, ver su
      // nivel sin salir de la hoja. Sin los dos, aceptar es adivinar por el nombre.
      id: a.applicant.id,
      username: '@' + a.applicant.username,
      name: a.applicant.name ?? a.applicant.username,
      profilePicture: a.applicant.profilePicture ?? undefined,
      category: a.applicant.category ?? null,
    },
    partner: a.partner
      ? {
          id: a.partner.id,
          username: '@' + a.partner.username,
          name: a.partner.name ?? a.partner.username,
          profilePicture: a.partner.profilePicture ?? undefined,
          category: a.partner.category ?? null,
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
    category: g.category ?? null,
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
