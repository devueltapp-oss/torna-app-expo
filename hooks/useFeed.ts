/**
 * useFeed — feed social del Home del player: highlights públicos de los usuarios
 * que sigue (GET /highlights/feed vía `fetchFeed`), mapeados a `FeedPost`.
 *
 * El `id` del FeedPost ES el id del highlight → habilita like/comentarios al
 * abrirlo en el visor. Si no sigue a nadie (o sin highlights), queda `[]` y el
 * Home muestra su estado vacío (sin la sección).
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchFeed, type FeedHighlight } from '../api/highlights';
import type { FeedPost } from '../data/types';

function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** ISO → etiqueta relativa corta ("Ahora", "5m", "3h", "2d", o fecha). */
function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const min = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(then).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function mapFeed(h: FeedHighlight): FeedPost {
  return {
    id: h.id, // = id del highlight → like/comentarios en el visor
    type: 'highlight',
    author: {
      name: h.author.name ?? h.author.username,
      username: '@' + h.author.username,
      role: h.author.isClub ? 'club' : 'player',
    },
    duration: fmtDuration(h.duration),
    caption: h.title ?? undefined,
    postedAt: relTime(h.createdAt),
    likes: h.likesCount,
    comments: h.commentsCount,
    videoUrl: h.clipUrl,
  };
}

export function useFeed(userId?: string) {
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setFeed([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchFeed();
      setFeed(rows.map(mapFeed));
    } catch (err) {
      console.error('[useFeed] load failed:', err);
      setFeed([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return { feed, loading, refresh: load };
}
