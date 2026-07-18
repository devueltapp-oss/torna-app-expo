import React from 'react';
import type { FollowItem } from '../data/types';

/**
 * Promesa con timeout: si `p` no resuelve en `ms`, cae a `fb`. En RN el fetch a
 * veces se cuelga sin resolver — sin esto el spinner quedaría PARA SIEMPRE.
 */
function withTimeout<T>(p: Promise<T>, ms: number, fb: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fb), ms))]);
}

export interface FollowedClubs {
  clubs: FollowItem[];
  loading: boolean;
}

/**
 * Carga los CLUBS que sigue un usuario para el picker de reserva ("Clubs que seguís").
 *
 * Garantías para que la UI NUNCA quede en carga infinita:
 *  - `loading` SIEMPRE termina en `false` (timeout + catch, pase lo que pase).
 *  - error del backend o timeout → `clubs: []` (la UI muestra "clubs no encontrados"),
 *    nunca propaga una excepción.
 *  - filtra `isClub` (un club es un `User` con `isClub=true`); jugadores seguidos se
 *    descartan.
 *  - sin `userId` → `clubs: []`, `loading: false`.
 *
 * `fetchFollowing` se inyecta (testeable). Se guarda en un ref para que un fetcher
 * inline no dispare el efecto en cada render.
 */
export function useFollowedClubs(
  userId: string | undefined,
  fetchFollowing: (id: string) => Promise<FollowItem[]>,
  timeoutMs = 6000,
): FollowedClubs {
  const [clubs, setClubs] = React.useState<FollowItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const fetchRef = React.useRef(fetchFollowing);
  fetchRef.current = fetchFollowing;

  React.useEffect(() => {
    if (!userId) {
      setClubs([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const following = await withTimeout(
        fetchRef.current(userId).catch(() => [] as FollowItem[]),
        timeoutMs,
        [],
      );
      if (!active) return;
      setClubs(following.filter((f) => f.isClub));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, timeoutMs]);

  return { clubs, loading };
}
