/**
 * useNotificationBadge — solo el contador de la campanita (GET /notification/unread-count).
 *
 * Va aparte de `useNotifications` a propósito: los contenedores de tabs
 * (`MainPlayer`/`MainClub`) lo montan permanentemente y no tiene sentido traer 20 filas
 * cada vez que el usuario vuelve a Inicio.
 *
 * Se refresca en tres momentos: al montar, al recuperar el foco de la app, y cuando
 * llega un push con la app abierta (`addPushReceivedListener`).
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { fetchUnreadCount } from '../api/notifications';
import { addPushReceivedListener } from '../services/notifications';

export function useNotificationBadge(enabled: boolean = true) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetchUnreadCount();
      setCount(res?.count ?? 0);
    } catch {
      // Sin conexión el badge simplemente no se actualiza; no se limpia para no
      // "perder" no leídos que sí existen en el server.
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Un push nuevo con la app abierta ya cambió el contador del server.
  useEffect(() => {
    if (!enabled) return undefined;
    return addPushReceivedListener(() => {
      refresh();
    });
  }, [enabled, refresh]);

  // Volver a la app desde background: pudo haber llegado algo mientras tanto.
  useEffect(() => {
    if (!enabled) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [enabled, refresh]);

  return { count, refresh, setCount };
}
