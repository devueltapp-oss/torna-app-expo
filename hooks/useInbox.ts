/**
 * useInbox — inbox de Chats: conversaciones DM + chats grupales de partidas
 * (GET /chat/inbox). Carga al montar, `refresh()` manual y re-fetch al recuperar
 * el foco (para reflejar mensajes nuevos al volver a la pestaña).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { fetchInbox, deleteDirectChat, type InboxItem } from '../api/chat';
import { deleteGameChat } from '../api/games';

export function useInbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  // El updater de setState puede correr DESPUÉS del await, así que el valor a
  // restaurar en caso de error se lee de un ref, no del estado. Mismo patrón que
  // los likes y la campanita.
  const itemsRef = useRef<InboxItem[]>([]);
  itemsRef.current = items;

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

  /**
   * Borra un chat **solo para el usuario actual** (el otro sigue viendo el hilo).
   * Optimista: la fila desaparece al toque y vuelve si el backend falla.
   *
   * Ojo: el chat reaparece solo si le vuelven a escribir, así que después de
   * borrar NO se refresca el inbox — el backend ya lo está filtrando y un
   * refetch solo agregaría un parpadeo.
   */
  const remove = useCallback(async (item: InboxItem) => {
    const previous = itemsRef.current;
    setItems(previous.filter((it) => !(it.kind === item.kind && it.id === item.id)));
    try {
      if (item.kind === 'dm') {
        if (!item.otherUserId) throw new Error('Conversación sin usuario');
        await deleteDirectChat(item.otherUserId);
      } else {
        await deleteGameChat(item.id);
      }
      return true;
    } catch {
      setItems(previous); // revertir: el chat sigue estando
      return false;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refrescar al recuperar el foco (volver a la pestaña Chats).
  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  return { items, loading, refresh: load, remove };
}
