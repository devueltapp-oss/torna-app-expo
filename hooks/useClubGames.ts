/**
 * useClubGames — partidas de un club (GET /game/club/:id vía `fetchClubGames`).
 *
 * ⚠️ El endpoint es **camera-céntrico**: devuelve las partidas con cámara del club
 * (transmitidas), con `court` = identificador de la cámara primaria y sin
 * `scheduledStartAt` (solo `createdAt`). Por eso la hora/fecha se derivan de
 * `createdAt` y el nombre de cancha cae al identificador de cámara.
 *
 * Expone tres vistas de la misma carga:
 *   - `games`    → `GameListData[]`     (tab "Juegos" del admin)
 *   - `live`     → `LivePreview[]`      (carrusel "en vivo ahora" del perfil de club)
 *   - `upcoming` → `UpcomingPublicGame[]` (próximos partidos del perfil de club)
 */
import { formatClubTime, formatClubDate } from '../lib/clubTime';
import { useCallback, useEffect, useState } from 'react';
import { fetchClubGames, type BackendClubGame } from '../api/games';
import type { GameStatus } from '../components/ui';
import type { GameListData, MatchParticipant } from '../components/cards';
import type { LivePreview, UpcomingPublicGame } from '../data/types';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

/** Normaliza el estado del backend al subconjunto que entiende la UI (`GameStatus`). */
function mapStatus(s: string): GameStatus {
  switch (s) {
    case 'LIVE': return 'LIVE';
    case 'FINISHED': return 'FINISHED';
    case 'STOPPED': return 'STOPPED';
    case 'CANCELLED': return 'CANCELLED';
    case 'WAITING':
    case 'SCHEDULED':
    default: return 'SCHEDULED';
  }
}

function toParticipant(p: BackendClubGame['players'][number]): MatchParticipant {
  return {
    username: p.username.startsWith('@') ? p.username : '@' + p.username,
    name: p.name ?? p.username,
    profilePicture: p.profilePicture ?? undefined,
  };
}

function toGameListData(g: BackendClubGame): GameListData {
  return {
    id: g.gameId,
    courtId: g.courtId,
    court: g.courtName ?? g.court ?? 'Cancha',
    cam: g.court ?? '—',
    players: g.players.length,
    time: g.scheduledStartAt ? formatClubTime(g.scheduledStartAt) : fmtTime(g.createdAt),
    date: g.scheduledStartAt ? (formatClubDate(g.scheduledStartAt) ?? '') : fmtDate(g.createdAt),
    status: mapStatus(g.gameStatus),
  };
}

export function useClubGames(clubId?: string) {
  const [games, setGames] = useState<GameListData[]>([]);
  const [live, setLive] = useState<LivePreview[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingPublicGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clubId) {
      setGames([]); setLive([]); setUpcoming([]); setLoading(false);
      return;
    }
    setLoading(true); setError(null);
    try {
      const raw = await fetchClubGames(clubId);
      setGames(raw.map(toGameListData));
      setLive(
        raw
          .filter((g) => g.gameStatus === 'LIVE')
          .map((g) => ({
            id: g.gameId,
            court: g.courtName ?? g.court ?? 'Cancha',
            players: g.players.map(toParticipant),
          })),
      );
      setUpcoming(
        raw
          .filter((g) => g.gameStatus === 'SCHEDULED' || g.gameStatus === 'WAITING')
          .map((g) => ({
            id: g.gameId,
            court: g.courtName ?? g.court ?? 'Cancha',
            time: g.scheduledStartAt ? formatClubTime(g.scheduledStartAt) : fmtTime(g.createdAt),
            date: g.scheduledStartAt ? (formatClubDate(g.scheduledStartAt) ?? '') : fmtDate(g.createdAt),
            players: g.players.length,
          })),
      );
    } catch (err) {
      setError('No se pudo cargar la agenda. Deslizá para reintentar.');
      setGames([]); setLive([]); setUpcoming([]);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => { load(); }, [load]);

  return { games, live, upcoming, loading, error, refresh: load };
}
