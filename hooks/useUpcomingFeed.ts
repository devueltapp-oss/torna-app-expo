/**
 * useUpcomingFeed — próximas partidas del Inicio: **las mías + las de la gente y
 * los clubes que sigo**.
 *
 * Consume `GET /game/upcoming-feed`, que resuelve todo en **una sola query con
 * `OR`**. Eso es lo que garantiza que una partida alcanzable por varios caminos
 * —sigo al club donde se juega *y* a uno de los jugadores— aparezca **una sola
 * vez**: la deduplicación es una propiedad de la consulta, no código del cliente
 * que se pueda olvidar.
 *
 * Por eso este hook **no mergea nada** con `useMyGames`: el endpoint ya incluye
 * las propias (el backend suma el UID del usuario a la lista de seguidos). Si
 * acá se concatenaran las dos listas volverían los duplicados.
 */
import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { formatClubDate, formatClubTime } from '../lib/clubTime';
import type { UpcomingGameData, UpcomingGamePlayer } from '../data/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const TOKEN_KEY = 'torna_auth_token';

interface BackendFeedGame {
  id: string;
  status: string;
  isOpenForPlayers: boolean;
  category?: number | null;
  scheduledStartAt?: string | null;
  scheduledEndAt?: string | null;
  padelCourt?: {
    name?: string | null;
    club?: { id: string; name?: string | null; username: string } | null;
  } | null;
  gamePlayers: Array<{
    userId: string;
    team?: number | null;
    isCaptain: boolean;
    user: { id: string; username: string; name?: string | null; profilePicture?: string | null };
  }>;
  applications?: Array<{
    id: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    applicant: { id: string; name?: string | null; username: string; profilePicture?: string | null; category?: number | null };
    partner?: { id: string; name?: string | null; username: string; profilePicture?: string | null; category?: number | null } | null;
  }>;
}

function mapPlayer(p: BackendFeedGame['gamePlayers'][number]): UpcomingGamePlayer {
  return {
    id: p.user.id,
    username: '@' + p.user.username,
    name: p.user.name ?? p.user.username,
    profilePicture: p.user.profilePicture ?? undefined,
    team: p.team === 1 || p.team === 2 ? p.team : undefined,
    isHost: p.isCaptain === true,
  };
}

function mapGame(g: BackendFeedGame, userId?: string): UpcomingGameData {
  const captain = g.gamePlayers.find((p) => p.isCaptain);
  const mine = userId ? g.gamePlayers.find((p) => p.userId === userId) : undefined;
  const myTeam = mine?.team === 1 || mine?.team === 2 ? mine.team : undefined;

  return {
    id: g.id,
    // ⚠️ En hora del CLUB (`lib/clubTime`): el `scheduledStartAt` es una etiqueta
    // escrita en UTC, no un instante a convertir. Ver la nota en `useMyGames`.
    time: formatClubTime(g.scheduledStartAt),
    date: formatClubDate(g.scheduledStartAt),
    court: g.padelCourt?.name ?? 'Cancha',
    club: g.padelCourt?.club?.name ?? g.padelCourt?.club?.username ?? '',
    players: g.gamePlayers.map(mapPlayer),
    following: 'club',
    isOpenForPlayers: g.isOpenForPlayers,
    maxPlayers: 4,
    isCreator: !!captain && captain.userId === userId,
    applications: (g.applications ?? []).map((a) => ({
      id: a.id,
      status: a.status,
      applicant: {
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
    })),
    status: g.status,
    myTeam,
    viewerIsParticipant: !!mine,
    category: g.category ?? null,
  };
}

export function useUpcomingFeed(userId?: string) {
  const [games, setGames] = useState<UpcomingGameData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? '';
      const res = await fetch(`${API_URL}/game/upcoming-feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: any = await res.json().catch(() => ({}));
      const arr: BackendFeedGame[] = (json && 'data' in json ? json.data : json) ?? [];
      setGames(arr.map((g) => mapGame(g, userId)));
    } catch (err) {
      // Un backend viejo todavía no tiene la ruta: el strip queda vacío y el
      // resto del Inicio funciona igual.
      console.error('[useUpcomingFeed] load failed:', err);
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { games, loading, refresh: load };
}
