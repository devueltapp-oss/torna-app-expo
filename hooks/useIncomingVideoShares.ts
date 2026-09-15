/**
 * useIncomingVideoShares — solicitudes de video compartido pendientes
 * (GET /game/shares/incoming). Alguien que capitaneó una partida FINALIZADA
 * con grabación me la compartió; puedo aceptarla (pasa a mi Biblioteca) o
 * rechazarla. Se muestran en Mi Biblioteca, arriba de "Mis partidos".
 *
 * Aceptar/rechazar es optimista: la fila desaparece de la lista al toque, y si
 * la request falla se repone (mismo patrón que `useMyGames`/aplicaciones).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  fetchIncomingVideoShares,
  acceptVideoShare,
  rejectVideoShare,
  type IncomingVideoShare,
} from '../api/games';

export function useIncomingVideoShares() {
  const [shares, setShares] = useState<IncomingVideoShare[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setShares(await fetchIncomingVideoShares());
    } catch {
      // Silencioso: no es contenido crítico, no vale la pena un banner de error.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const respond = useCallback(
    async (shareId: string, accept: boolean) => {
      const prev = shares;
      setShares((xs) => xs.filter((s) => s.id !== shareId));
      try {
        await (accept ? acceptVideoShare(shareId) : rejectVideoShare(shareId));
      } catch {
        setShares(prev);
      }
    },
    [shares],
  );

  return {
    shares,
    loading,
    refresh,
    accept: (shareId: string) => respond(shareId, true),
    reject: (shareId: string) => respond(shareId, false),
  };
}
