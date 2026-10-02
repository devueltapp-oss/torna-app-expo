import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchClubCourts, fetchCourtSlots } from '../api/clubs';
import { fetchUserProfile } from '../api/users';
import type { ClubCourtPublic } from '../data/types';
import type { CourtSlots } from '../lib/reservation';
import type { DayOption } from '../screens/ReserveBlocksScreen';

/**
 * Extracción EXACTA de la lógica que vivía inline en `ReserveBlocksContainer`
 * (`App.tsx`) — fetch de canchas activas del club + slots del día por cancha,
 * con `withTimeout` (un fetch colgado no debe dejar el spinner para siempre) y
 * un `loadToken` anti-carrera (si el usuario cambia de día rápido, una
 * respuesta vieja que llega tarde no debe pisar la nueva).
 *
 * Extraído 2026-10-02 porque pasa a tener DOS consumidores sin relación:
 * `ReserveBlocksContainer` (reserva del player) y `ClubCreateGameContainer`
 * (agendar como club) — mismo flujo de "elegir bloque libre", distinto paso 2.
 */
export function useCourtBlocksForDay(clubId: string | undefined, days: DayOption[]) {
  const [courts, setCourts] = useState<ClubCourtPublic[]>([]);
  const [courtSlots, setCourtSlots] = useState<CourtSlots<ClubCourtPublic>[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubName, setClubName] = useState('');
  const [clubLoc, setClubLoc] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  useEffect(() => {
    if (!clubId) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    // En RN el fetch a veces cuelga sin resolver: sin timeout el spinner quedaría para
    // siempre. `withTimeout` garantiza que la carga SIEMPRE cierre.
    const withTimeout = <T,>(p: Promise<T>, ms: number, fb: T): Promise<T> =>
      Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fb), ms))]);
    (async () => {
      const cs = await withTimeout(
        fetchClubCourts(clubId).catch(() => [] as ClubCourtPublic[]), 6000, [],
      );
      const prof = await withTimeout(
        fetchUserProfile(clubId)
          .then((p) => ({ name: p.name ?? p.username, lat: p.latitude, lng: p.longitude }))
          .catch(() => null),
        6000, null,
      );
      if (!active) return;
      // Cancha inactiva = sin slots ni reservas: no entra a la grilla (igual que el desktop).
      setCourts(cs.filter((c) => c.active !== false));
      if (prof) { setClubName(prof.name); setClubLoc({ lat: prof.lat, lng: prof.lng }); }
    })();
    return () => { active = false; };
  }, [clubId]);

  // Un token por carga: si el usuario cambia de día rápido, la respuesta vieja que llega
  // tarde no debe pisar la nueva.
  const loadToken = useRef(0);
  const loadSlots = useCallback((iso: string | undefined, list: ClubCourtPublic[]) => {
    const token = ++loadToken.current;
    if (!iso || list.length === 0) { setCourtSlots([]); setLoading(false); return; }
    setLoading(true);
    Promise.all(
      list.map(async (court) => ({
        court,
        slots: await fetchCourtSlots(court.id, iso).catch(() => []),
      })),
    ).then((res) => {
      if (token !== loadToken.current) return;
      setCourtSlots(res);
      setLoading(false);
    });
  }, []);

  useEffect(() => { loadSlots(days[0]?.iso, courts); }, [loadSlots, days, courts]);

  return { clubName, clubLoc, courts, courtSlots, loading, loadSlots };
}
