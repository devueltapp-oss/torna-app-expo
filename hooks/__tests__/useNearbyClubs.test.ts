/**
 * useNearbyClubs (2026-09-10): clubes cerca del jugador para el picker de
 * reserva, además de "Clubs que sigues". `fetchNearby` y `getPosition` se
 * inyectan (mismo patrón que `useFollowedClubs`), así que no hace falta
 * mockear ningún módulo nativo.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNearbyClubs, type PositionResult } from '../useNearbyClubs';
import type { NearbyClub } from '../../data/types';

const club: NearbyClub = {
  id: 'club-1', name: 'Casa Padel', username: 'casapadel', distanceKm: 3.2,
};

describe('useNearbyClubs', () => {
  it('sin permiso todavía concedido, no busca solo ni pide nada al montar', async () => {
    const fetchNearby = jest.fn().mockResolvedValue([club]);
    const getPosition = jest.fn().mockResolvedValue({ granted: false, coords: null } as PositionResult);

    const { result } = renderHook(() => useNearbyClubs(fetchNearby, getPosition));

    await waitFor(() => expect(getPosition).toHaveBeenCalledWith(false));
    expect(fetchNearby).not.toHaveBeenCalled();
    expect(result.current.clubs).toEqual([]);
    expect(result.current.permissionDenied).toBe(false); // todavía no se pidió
  });

  it('con permiso YA concedido, busca solo al montar (sin pedir nada)', async () => {
    const fetchNearby = jest.fn().mockResolvedValue([club]);
    const getPosition = jest.fn().mockResolvedValue({
      granted: true, coords: { latitude: 10.49, longitude: -66.9 },
    } as PositionResult);

    const { result } = renderHook(() => useNearbyClubs(fetchNearby, getPosition));

    await waitFor(() => expect(result.current.clubs).toEqual([club]));
    expect(getPosition).toHaveBeenCalledWith(false);
    expect(fetchNearby).toHaveBeenCalledWith(10.49, -66.9);
  });

  it('requestNearby pide permiso (true) y busca si lo conceden', async () => {
    const fetchNearby = jest.fn().mockResolvedValue([club]);
    const getPosition = jest.fn()
      .mockResolvedValueOnce({ granted: false, coords: null } as PositionResult) // montaje
      .mockResolvedValueOnce({ granted: true, coords: { latitude: 1, longitude: 2 } } as PositionResult); // botón

    const { result } = renderHook(() => useNearbyClubs(fetchNearby, getPosition));
    await waitFor(() => expect(getPosition).toHaveBeenCalledTimes(1));

    act(() => { result.current.requestNearby(); });

    await waitFor(() => expect(result.current.clubs).toEqual([club]));
    expect(getPosition).toHaveBeenLastCalledWith(true);
    expect(result.current.permissionDenied).toBe(false);
  });

  it('requestNearby marca permissionDenied si el sistema lo niega', async () => {
    const fetchNearby = jest.fn();
    const getPosition = jest.fn()
      .mockResolvedValueOnce({ granted: false, coords: null } as PositionResult)
      .mockResolvedValueOnce({ granted: false, coords: null } as PositionResult);

    const { result } = renderHook(() => useNearbyClubs(fetchNearby, getPosition));
    await waitFor(() => expect(getPosition).toHaveBeenCalledTimes(1));

    act(() => { result.current.requestNearby(); });

    await waitFor(() => expect(result.current.permissionDenied).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(fetchNearby).not.toHaveBeenCalled();
  });

  it('un fetch que nunca resuelve no deja loading colgado (timeout)', async () => {
    const fetchNearby = jest.fn(() => new Promise<NearbyClub[]>(() => {}));
    const getPosition = jest.fn().mockResolvedValue({
      granted: true, coords: { latitude: 1, longitude: 2 },
    } as PositionResult);

    const { result } = renderHook(() => useNearbyClubs(fetchNearby, getPosition, 50));

    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 2000 });
    expect(result.current.clubs).toEqual([]);
  });
});
