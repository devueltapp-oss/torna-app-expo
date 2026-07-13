/**
 * useInbox — inbox de Chats: conversaciones DM + chats grupales de partidas
 * (GET /chat/inbox). Carga al montar, `refresh()` manual y re-fetch al recuperar
 * el foco (para reflejar mensajes nuevos al volver a la pestaña).
 */
import { useCallback, useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { fetchInbox, type InboxItem } from '../api/chat';

export function useInbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchInbox());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refrescar al recuperar el foco (volver a la pestaña Chats).
  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  return { items, loading, refresh: load };
}
