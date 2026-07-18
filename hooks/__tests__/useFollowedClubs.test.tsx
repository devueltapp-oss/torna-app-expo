/**
 * Integración de "Clubs que seguís" en la reserva. Confirma el contrato que evita
 * el bug reportado (ni clubs, ni mensaje, o carga infinita):
 *  - devuelve los CLUBS seguidos (filtra isClub);
 *  - `loading` SIEMPRE termina en false → la UI muestra lista o mensaje, nunca spinner eterno;
 *  - error o cuelgue del backend → clubs [] (mensaje "no encontrados"), sin quedar cargando.
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { useFollowedClubs } from '../useFollowedClubs';
import type { FollowItem } from '../../data/types';

const club = (id: string, name: string): FollowItem => ({ id, name, username: `@${name}`, isClub: true });
const player = (id: string, name: string): FollowItem => ({ id, name, username: `@${name}`, isClub: false });

describe('useFollowedClubs', () => {
  it('devuelve los clubs seguidos (filtra isClub) y termina de cargar', async () => {
    const fetchFollowing = jest
      .fn()
      .mockResolvedValue([club('c1', 'PadelBA'), player('p1', 'juan'), club('c2', 'PadelSur')]);

    const { result } = renderHook(() => useFollowedClubs('u1', fetchFollowing));

    expect(result.current.loading).toBe(true); // arranca cargando
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.clubs.map((c) => c.id)).toEqual(['c1', 'c2']); // solo clubs
    expect(fetchFollowing).toHaveBeenCalledWith('u1');
  });

  it('si seguís solo players → clubs vacío (UI muestra mensaje), sin quedar cargando', async () => {
    const fetchFollowing = jest.fn().mockResolvedValue([player('p1', 'juan')]);
    const { result } = renderHook(() => useFollowedClubs('u1', fetchFollowing));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.clubs).toEqual([]);
  });

  it('si el backend FALLA → clubs vacío y loading false (NO queda en carga infinita)', async () => {
    const fetchFollowing = jest.fn().mockRejectedValue(new Error('HTTP 500'));
    const { result } = renderHook(() => useFollowedClubs('u1', fetchFollowing));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.clubs).toEqual([]);
  });

  it('si el fetch SE CUELGA (nunca resuelve) → el timeout corta: loading false, clubs [] (nunca infinito)', async () => {
    const fetchFollowing = jest.fn(() => new Promise<FollowItem[]>(() => {})); // nunca resuelve
    const { result } = renderHook(() => useFollowedClubs('u1', fetchFollowing, 50)); // timeout corto

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 800 });
    expect(result.current.clubs).toEqual([]);
  });

  it('sin userId → no consulta, clubs [], loading false', async () => {
    const fetchFollowing = jest.fn();
    const { result } = renderHook(() => useFollowedClubs(undefined, fetchFollowing));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.clubs).toEqual([]);
    expect(fetchFollowing).not.toHaveBeenCalled();
  });
});
