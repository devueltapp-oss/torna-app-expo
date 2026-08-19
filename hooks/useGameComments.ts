/**
 * useGameComments — comentarios PÚBLICOS del stream de una partida.
 *
 * ⚠️ No confundir con dos cosas parecidas:
 *  - `useGameChat` → chat PRIVADO de los participantes (`GameChatMessage`).
 *  - los comentarios de highlights (`HighlightComment`, con threads/`parentId`).
 * Este hook habla con `GET·POST /game/:id/comments` (tabla `GameComment`), que es
 * un hilo plano, público, y **totalmente aislado** de los otros dos.
 *
 * Transporte igual que el chat: REST + polling corto (~3 s) SOLO mientras la
 * pantalla está enfocada y el hook está `enabled` (en el reel, solo el ítem
 * visible poll-ea). El poll es incremental vía `since` = `createdAt` del último
 * comentario confirmado por el servidor. El envío es optimista.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { fetchGameComments, addGameComment, type GameComment } from '../api/games';

const POLL_MS = 3000;

export interface UseGameComments {
  comments: GameComment[];
  loading: boolean;
  sending: boolean;
  /** Envía un comentario. Devuelve true si se persistió, false si falló. */
  send: (text: string) => Promise<boolean>;
}

export interface UseGameCommentsOptions {
  /** Si es false no hace fetch inicial ni poll (default true). */
  enabled?: boolean;
  /** Autor para la burbuja optimista. */
  author?: { id: string; username: string; name?: string | null; profilePicture?: string | null };
}

export function useGameComments(
  gameId: string,
  { enabled = true, author }: UseGameCommentsOptions = {},
): UseGameComments {
  const [comments, setComments] = useState<GameComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const isFocused = useIsFocused();

  // Último createdAt confirmado por el servidor (cursor del poll).
  const lastServerAtRef = useRef<string | undefined>(undefined);

  // Integra comentarios del servidor: dedupe por id, orden por createdAt, avanza el cursor.
  const ingest = useCallback((incoming: GameComment[]) => {
    if (incoming.length === 0) return;
    setComments((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      for (const c of incoming) byId.set(c.id, c);
      return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
    const maxAt = incoming.reduce(
      (mx, c) => (c.createdAt > mx ? c.createdAt : mx),
      lastServerAtRef.current ?? '',
    );
    lastServerAtRef.current = maxAt || lastServerAtRef.current;
  }, []);

  // Carga inicial (y recarga si cambia la partida o se habilita).
  useEffect(() => {
    if (!enabled || !gameId) return;
    let cancelled = false;
    setLoading(true);
    setComments([]);
    lastServerAtRef.current = undefined;
    fetchGameComments(gameId)
      .then((rows) => {
        if (cancelled) return;
        setComments(rows);
        lastServerAtRef.current = rows.length ? rows[rows.length - 1].createdAt : undefined;
      })
      .catch(() => { /* sin datos → lista vacía, sin mock */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameId, enabled]);

  // Poll incremental mientras la pantalla está enfocada.
  useEffect(() => {
    if (!enabled || !isFocused || !gameId) return;
    let cancelled = false;
    const timer = setInterval(() => {
      fetchGameComments(gameId, lastServerAtRef.current)
        .then((rows) => { if (!cancelled) ingest(rows); })
        .catch(() => {});
    }, POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [enabled, isFocused, gameId, ingest]);

  const send = useCallback(async (text: string): Promise<boolean> => {
    const comment = text.trim();
    if (!comment || !gameId) return false;
    const tempId = `temp-${Date.now()}`;
    const optimistic: GameComment = {
      id: tempId,
      userId: author?.id ?? '',
      username: author?.username ?? '',
      name: author?.name ?? null,
      profilePicture: author?.profilePicture ?? null,
      comment,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const created = await addGameComment(gameId, comment);
      setComments((prev) => prev.map((c) => (c.id === tempId ? created : c)));
      if ((created.createdAt ?? '') > (lastServerAtRef.current ?? '')) {
        lastServerAtRef.current = created.createdAt;
      }
      return true;
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      return false;
    } finally {
      setSending(false);
    }
  }, [gameId, author?.id, author?.username, author?.name, author?.profilePicture]);

  return { comments, loading, sending, send };
}
