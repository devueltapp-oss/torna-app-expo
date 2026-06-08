/**
 * useUserProfile — trae el perfil público real de un usuario (GET /user/profile/:id)
 * y sus highlights (GET /highlights?userId=), y lo mapea a la forma `PlayerPublic`
 * que consume `PlayerProfilePublicView`.
 *
 * La identidad (nombre, username, región, conteos, isFollowing) y los highlights
 * son reales. Los bloques sin endpoint todavía (fotos, partido en vivo, listas de
 * seguidores) llegan vacíos — la pantalla muestra estados vacíos, no datos falsos.
 */
import { useEffect, useState, useCallback } from 'react';
import { fetchUserProfile, fetchFollowers, fetchFollowing } from '../api/users';
import { fetchUserHighlights, type UserHighlight } from '../api/highlights';
import type { PlayerPublic, PlayerClip } from '../data/types';

function withAt(username: string): string {
  return username.startsWith('@') ? username : `@${username}`;
}

/** Segundos → "M:SS". */
function formatLength(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** ISO date → etiqueta humana (Hoy / Ayer / hace N días / fecha corta). */
function formatClipDate(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `hace ${days} días`;
  return then.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function mapHighlight(h: UserHighlight): PlayerClip {
  return {
    id: h.id,
    title: h.title ?? 'Highlight',
    length: formatLength(h.duration),
    date: formatClipDate(h.createdAt),
    videoUrl: h.clipUrl,
  };
}

export function useUserProfile(id: string | undefined) {
  const [player, setPlayer] = useState<PlayerPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // El perfil es lo crítico; highlights y listas de follow degradan a [] si fallan.
      const [p, highlights, followersList, followingList] = await Promise.all([
        fetchUserProfile(id),
        fetchUserHighlights(id).catch(() => [] as UserHighlight[]),
        fetchFollowers(id).catch(() => []),
        fetchFollowing(id).catch(() => []),
      ]);
      setPlayer({
        id: p.id,
        name: p.name ?? p.username,
        username: withAt(p.username),
        club: '',
        location: p.region ?? '',
        followers: p.followersCount ?? 0,
        isFollowing: p.isFollowing ?? false,
        notifyOnMatch: false,
        isLiveNow: false,
        liveGame: null,
        clips: highlights.map(mapHighlight),
        photos: [],
        followingCount: p.followingCount ?? 0,
        followersList,
        followingList,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil.');
      setPlayer(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { player, loading, error, refresh: load };
}
