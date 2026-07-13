/**
 * useDirectChat — chat directo 1-a-1 con otro usuario. Espejo de `useGameChat`,
 * keyed por el UID del otro usuario en vez del gameId.
 *
 * REST + polling corto (~3s) SOLO mientras la pantalla está enfocada (se corta en
 * blur/unmount). Los usuarios offline los avisa el push de OneSignal del backend
 * (`type: 'NEW_DM_MESSAGE'`). Poll incremental por `since` = createdAt del último
 * mensaje del servidor. Envío optimista (burbuja inmediata → reemplazo por el real;
 * si falla, se quita y el texto vuelve al input vía `false`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  fetchDirectChat,
  sendDirectMessage,
  markDmRead,
  type DirectMessage,
} from '../api/chat';

const POLL_MS = 3000;

export interface UseDirectChat {
  messages: DirectMessage[];
  loading: boolean;
  sending: boolean;
  send: (content: string) => Promise<boolean>;
}

export function useDirectChat(
  userId: string,
  sender?: { id: string; username: string; name?: string | null; profilePicture?: string | null },
): UseDirectChat {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const isFocused = useIsFocused();

  const lastServerAtRef = useRef<string | undefined>(undefined);

  const ingest = useCallback((incoming: DirectMessage[]) => {
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

  // Carga inicial + marcar leído (limpia el badge del inbox).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    lastServerAtRef.current = undefined;
    fetchDirectChat(userId)
      .then((rows) => {
        if (cancelled) return;
        setMessages(rows);
        lastServerAtRef.current = rows.length ? rows[rows.length - 1].createdAt : undefined;
      })
      .catch(() => { /* sin acceso o vacío → lista vacía */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    markDmRead(userId).catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  // Poll incremental mientras la pantalla está enfocada.
  useEffect(() => {
    if (!isFocused || !userId) return;
    let cancelled = false;
    const tick = () => {
      fetchDirectChat(userId, lastServerAtRef.current)
        .then((rows) => { if (!cancelled) ingest(rows); })
        .catch(() => {});
    };
    const timer = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [isFocused, userId, ingest]);

  const send = useCallback(async (content: string): Promise<boolean> => {
    const text = content.trim();
    if (!text) return false;
    const tempId = `temp-${Date.now()}`;
    const optimistic: DirectMessage = {
      id: tempId,
      conversationId: '',
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
      const created = await sendDirectMessage(userId, text);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? created : m)));
      if ((created.createdAt ?? '') > (lastServerAtRef.current ?? '')) {
        lastServerAtRef.current = created.createdAt;
      }
      return true;
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return false;
    } finally {
      setSending(false);
    }
  }, [userId, sender?.id, sender?.username, sender?.name, sender?.profilePicture]);

  return { messages, loading, sending, send };
}
