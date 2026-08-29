/**
 * useNotifications — la lista de la campanita (GET /notification).
 *
 * Carga al montar, refetch al recuperar el foco (mismo patrón que `useInbox`) y
 * paginación por cursor con `loadMore`. **Sin polling por intervalo**: el dato tolera
 * latencia y la app ya se entera de lo nuevo por el push.
 *
 * `markRead`/`markAllRead` son optimistas con revert desde un ref (mismo patrón que el
 * `toggleLike` de `useGameChat`: el updater de setState puede correr después del await,
 * así que el valor previo se lee de un ref, no del updater).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../api/notifications';

const PAGE_SIZE = 20;

export interface UseNotifications {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(): UseNotifications {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const isFocused = useIsFocused();

  // Espejo del estado para poder revertir un cambio optimista después del await.
  const itemsRef = useRef<AppNotification[]>([]);
  const unreadRef = useRef(0);
  useEffect(() => {
    itemsRef.current = items;
    unreadRef.current = unreadCount;
  }, [items, unreadCount]);

  const loadingMore = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchNotifications({ limit: PAGE_SIZE });
      setItems(page.items);
      setUnreadCount(page.unreadCount);
      setCursor(page.nextCursor);
    } catch {
      setItems([]);
      setUnreadCount(0);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Al volver a la pantalla, refrescar (pudo llegar algo mientras no estaba).
  useEffect(() => {
    if (isFocused) refresh();
  }, [isFocused, refresh]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore.current) return;
    loadingMore.current = true;
    try {
      const page = await fetchNotifications({ limit: PAGE_SIZE, cursor });
      // Dedupe por id: si el server repite una fila (o llegó algo nuevo entre páginas)
      // no se duplica en la lista.
      setItems((prev) => {
        const byId = new Map(prev.map((n) => [n.id, n]));
        page.items.forEach((n) => byId.set(n.id, n));
        return [...byId.values()];
      });
      setUnreadCount(page.unreadCount);
      setCursor(page.nextCursor);
    } catch {
      // Silencioso: el usuario puede reintentar scrolleando de nuevo.
    } finally {
      loadingMore.current = false;
    }
  }, [cursor]);

  const markRead = useCallback(async (id: string) => {
    const prevItems = itemsRef.current;
    const prevUnread = unreadRef.current;
    const target = prevItems.find((n) => n.id === id);
    if (!target || target.readAt) return; // ya leída: nada que hacer

    setItems(prevItems.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount(Math.max(0, prevUnread - 1));
    try {
      await markNotificationRead(id);
    } catch {
      setItems(prevItems);
      setUnreadCount(prevUnread);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const prevItems = itemsRef.current;
    const prevUnread = unreadRef.current;
    if (prevUnread === 0) return;

    const now = new Date().toISOString();
    setItems(prevItems.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(prevItems);
      setUnreadCount(prevUnread);
    }
  }, []);

  return {
    items,
    unreadCount,
    loading,
    hasMore: !!cursor,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  };
}
