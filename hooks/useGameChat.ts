/**
 * useGameChat — chat privado de una partida (participantes).
 *
 * Transporte "híbrido REST + push": no hay WebSocket. El historial se lee/escribe
 * por REST (`GET·POST /game/:id/chat`) y los mensajes nuevos llegan por **polling
 * corto (~3s) SOLO mientras la pantalla está enfocada** (se corta en blur/unmount →
 * sin requests en background). A los usuarios offline los avisa el push de OneSignal
 * que dispara el backend (`type: 'NEW_CHAT_MESSAGE'`).
 *
 * El poll es incremental: usa `since` = `createdAt` del último mensaje del servidor
 * para traer solo lo nuevo. El envío es optimista (burbuja inmediata → se reemplaza
 * por el mensaje real; si falla, se quita y el texto vuelve al input vía `false`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  fetchGameChat,
  sendGameChatMessage,
  type GameChatMessage,
} from '../api/games';

const POLL_MS = 3000;

export interface UseGameChat {
  messages: GameChatMessage[];
  loading: boolean;
  sending: boolean;
  /** Envía un mensaje. Devuelve true si se persistió, false si falló. */
  send: (content: string) => Promise<boolean>;
}

export function useGameChat(gameId: string, sender?: { id: string; username: string; name?: string | null; profilePicture?: string | null }): UseGameChat {
  const [messages, setMessages] = useState<GameChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const isFocused = useIsFocused();

  // Último createdAt confirmado por el servidor (para el `since` del poll).
  const lastServerAtRef = useRef<string | undefined>(undefined);

  // Integra mensajes del servidor: dedupe por id, mantiene orden por createdAt y
  // avanza el cursor `since`.
  const ingest = useCallback((incoming: GameChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
    const maxAt = incoming.reduce(
      (mx, m) => (m.createdAt > mx ? m.createdAt : mx),
      lastServerAtRef.current ?? '',
    );
    lastServerAtRef.current = maxAt || lastServerAtRef.current;
  }, []);

  // Carga inicial (y recarga si cambia la partida).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    lastServerAtRef.current = undefined;
    fetchGameChat(gameId)
      .then((rows) => {
        if (cancelled) return;
        setMessages(rows);
        lastServerAtRef.current = rows.length ? rows[rows.length - 1].createdAt : undefined;
      })
      .catch(() => { /* sin acceso o vacío → lista vacía */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameId]);

  // Poll incremental mientras la pantalla está enfocada.
  useEffect(() => {
    if (!isFocused || !gameId) return;
    let cancelled = false;
    const tick = () => {
      fetchGameChat(gameId, lastServerAtRef.current)
        .then((rows) => { if (!cancelled) ingest(rows); })
        .catch(() => {});
    };
    const timer = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [isFocused, gameId, ingest]);

  const send = useCallback(async (content: string): Promise<boolean> => {
    const text = content.trim();
    if (!text) return false;
    const tempId = `temp-${Date.now()}`;
    const optimistic: GameChatMessage = {
      id: tempId,
      gameId,
      senderId: sender?.id ?? '',
      username: sender?.username ?? '',
      name: sender?.name ?? null,
      profilePicture: sender?.profilePicture ?? null,
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const created = await sendGameChatMessage(gameId, text);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? created : m)));
      if ((created.createdAt ?? '') > (lastServerAtRef.current ?? '')) {
        lastServerAtRef.current = created.createdAt;
      }
      return true;
    } catch {
      // Quitar la burbuja optimista; el screen restaura el texto al input.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return false;
    } finally {
      setSending(false);
    }
  }, [gameId, sender?.id, sender?.username, sender?.name, sender?.profilePicture]);

  return { messages, loading, sending, send };
}
