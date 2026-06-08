/**
 * useMyHighlights — todos los highlights del usuario autenticado (públicos +
 * privados) vía GET /highlights/my, mapeados a `LibraryHighlight`.
 *
 * `isPublic` se deriva de `isEnabled` del backend (true = público, false = privado).
 * El backend ya ordena por `createdAt desc` (más reciente primero). El perfil
 * propio filtra los públicos; la librería privada muestra todos.
 */
import { useEffect, useState, useCallback } from 'react';
import { fetchMyHighlights, type MyHighlight } from '../api/highlights';
import type { LibraryHighlight } from '../data/types';

function formatLength(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `hace ${days} días`;
  return then.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function mapHighlight(h: MyHighlight): LibraryHighlight {
  return {
    id: h.id,
    kind: 'highlight',
    title: h.title ?? 'Highlight',
    isPublic: h.isEnabled,
    durationSeconds: h.duration,
    durationLabel: formatLength(h.duration),
    date: formatDate(h.createdAt),
    fromMatch: h.gameId,
    streamUrl: h.clipUrl || undefined,
  };
}

export function useMyHighlights(userId: string | undefined) {
  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // `userId` no se usa en la query (el backend toma req.user), pero sirve como
    // gate: sin sesión no pedimos.
    if (!userId) {
      setHighlights([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchMyHighlights();
      setHighlights(res.map(mapHighlight));
    } catch {
      setHighlights([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { highlights, loading, refresh: load };
}
