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
    thumbnailUrl: h.thumbnailUrl,
  };
}

/**
 * Garantiza que la promesa settlee: si tarda más de `ms`, rechaza. Red de
 * seguridad contra requests colgadas (en RN el AbortController de `fetch` no
 * siempre cancela), para que la pantalla NUNCA quede en carga infinita.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`La petición tardó demasiado (timeout ${ms / 1000}s)`)), ms),
    ),
  ]);
}

export function useUserProfile(id: string | undefined) {
  const [player, setPlayer] = useState<PlayerPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      // Sin id no hay nada que cargar: marcamos error (en vez de quedar en
      // "loading" para siempre) para que la pantalla muestre un estado claro.
      setError('Perfil no disponible.');
      setPlayer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // 1) Perfil = lo crítico. En cuanto resuelve, la pantalla ya puede renderizar.
    //    NO lo metemos en el mismo Promise.all que los datos secundarios: si uno
    //    de esos cuelga, no debe dejar el perfil (y la pantalla) cargando para
    //    siempre. `withTimeout` además garantiza que esto SIEMPRE settlee.
    let p: Awaited<ReturnType<typeof fetchUserProfile>>;
    try {
      p = await withTimeout(fetchUserProfile(id), 15000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el perfil.');
      setPlayer(null);
      setLoading(false);
      return;
    }

    setPlayer({
      id: p.id,
      name: p.name ?? p.username,
      username: withAt(p.username),
      club: '',
      location: p.region ?? '',
      followers: p.followersCount ?? 0,
      isFollowing: p.isFollowing ?? false,
      notifyOnMatch: p.notifyOnMatch ?? false,
      isLiveNow: p.isLiveNow ?? false,
      // El backend solo da el id del partido LIVE; el visor (GameDetail) trae el
      // resto. Construimos un PlayerLiveGame mínimo para el tile + navegación.
      liveGame: p.isLiveNow && p.liveGameId
        ? { id: p.liveGameId, court: '', club: '', viewers: 0, players: [] }
        : null,
      clips: [],
      photos: [],
      followingCount: p.followingCount ?? 0,
      followersList: [],
      followingList: [],
    });
    setLoading(false);

    // 2) Datos secundarios (highlights + listas de follow): enriquecen el perfil
    //    ya visible. Cada uno con su propio timeout y degradan a [] si fallan/cuelgan,
    //    así las listas de seguidores/seguidos siempre quedan disponibles (o vacías),
    //    nunca colgadas. NO bloquean el render del perfil.
    const [highlights, followersList, followingList] = await Promise.all([
      withTimeout(fetchUserHighlights(id), 15000).catch(() => [] as UserHighlight[]),
      withTimeout(fetchFollowers(id), 15000).catch(() => []),
      withTimeout(fetchFollowing(id), 15000).catch(() => []),
    ]);
    setPlayer((prev) =>
      prev ? { ...prev, clips: highlights.map(mapHighlight), followersList, followingList } : prev,
    );
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { player, loading, error, refresh: load };
}
