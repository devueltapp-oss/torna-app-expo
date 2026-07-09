/**
 * usePartnerSearch — búsqueda de compañero al postularse a una partida abierta.
 *
 * Requisito de producto: al elegir compañero para sumarme a un partido, la
 * búsqueda debe mostrar **primero** a la gente que sigo o que me sigue
 * (mis conexiones); si el compañero no aparece ahí, el resto del orden son
 * todos los usuarios que NO son clubs.
 *
 * Cómo se cumple:
 *   - `connections`: followers + following del usuario (deduplicados). Se usan
 *     como sugerencias por defecto en el overlay cuando el input está vacío.
 *   - `searchPartners(q)`: pega a `GET /user/search` (que ya excluye clubs y al
 *     propio usuario) y **rankea** los resultados dejando las conexiones arriba,
 *     luego el resto de jugadores.
 *
 * El backend de búsqueda no conoce la relación de follow, así que el ranking se
 * hace en el cliente contra el set de ids de conexiones cacheado en el hook.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchUsers, fetchFollowers, fetchFollowing } from '../api/users';
import type { InvitablePlayer } from '../data/types';

function atHandle(username: string): string {
  return username.startsWith('@') ? username : `@${username}`;
}

export interface PartnerSearch {
  /** Gente que seguís o que te sigue (sugerencias por defecto, sin duplicados). */
  connections: InvitablePlayer[];
  /** Búsqueda rankeada: conexiones primero, luego el resto de no-clubs. */
  searchPartners: (q: string) => Promise<InvitablePlayer[]>;
}

export function usePartnerSearch(userId?: string): PartnerSearch {
  const [connections, setConnections] = useState<InvitablePlayer[]>([]);
  // Set de ids de conexiones para rankear resultados de búsqueda sin re-fetchear.
  const connectedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setConnections([]);
      connectedIds.current = new Set();
      return;
    }
    let cancelled = false;
    Promise.all([fetchFollowing(userId), fetchFollowers(userId)])
      .then(([following, followers]) => {
        if (cancelled) return;
        // Following primero (mis elegidos) y luego followers; dedupe por id.
        const byId = new Map<string, InvitablePlayer>();
        [...following, ...followers].forEach((u) => {
          if (!byId.has(u.id)) {
            byId.set(u.id, { id: u.id, name: u.name, username: atHandle(u.username) });
          }
        });
        connectedIds.current = new Set(byId.keys());
        setConnections([...byId.values()]);
      })
      .catch(() => {
        if (cancelled) return;
        setConnections([]);
        connectedIds.current = new Set();
      });
    return () => { cancelled = true; };
  }, [userId]);

  const searchPartners = useCallback(async (q: string): Promise<InvitablePlayer[]> => {
    const res = await searchUsers(q);
    const mapped: InvitablePlayer[] = res.map((u) => ({
      id: u.id,
      name: u.name ?? u.username,
      username: atHandle(u.username),
    }));
    // Estable: conexiones (rank 0) antes que el resto (rank 1), respetando el
    // orden que ya trae el backend dentro de cada grupo.
    return mapped
      .map((p, i) => ({ p, i, rank: connectedIds.current.has(p.id) ? 0 : 1 }))
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .map((x) => x.p);
  }, []);

  return useMemo(() => ({ connections, searchPartners }), [connections, searchPartners]);
}
