/**
 * Sugerencias de compañero/rival (overlay de "Agregar jugador" en reservas y
 * postulaciones): `connections` = followers + following, sin clubs.
 *
 * Un club es un `User` como cualquier otro, así que puede aparecer en tus
 * follows (seguís al club para enterarte de sus partidas) — pero acá no sirve:
 * no se elige un club de compañero. Bug real corregido: `connections` no
 * filtraba `isClub` y los clubes seguidos aparecían como sugerencia de
 * compañero.
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { usePartnerSearch } from '../usePartnerSearch';
import type { FollowItem } from '../../data/types';
import type { UserSearchResult } from '../../api/users';

const mockFetchFollowing = jest.fn();
const mockFetchFollowers = jest.fn();
const mockSearchUsers = jest.fn();

jest.mock('../../api/users', () => ({
  fetchFollowing: (...args: unknown[]) => mockFetchFollowing(...args),
  fetchFollowers: (...args: unknown[]) => mockFetchFollowers(...args),
  searchUsers: (...args: unknown[]) => mockSearchUsers(...args),
}));

const player = (id: string, name: string): FollowItem =>
  ({ id, name, username: `@${name}`, isClub: false } as FollowItem);
const club = (id: string, name: string): FollowItem =>
  ({ id, name, username: `@${name}`, isClub: true } as FollowItem);

beforeEach(() => {
  mockFetchFollowing.mockReset();
  mockFetchFollowers.mockReset();
  mockSearchUsers.mockReset();
});

describe('usePartnerSearch — connections', () => {
  it('excluye clubs seguidos/seguidores de las sugerencias de compañero', async () => {
    mockFetchFollowing.mockResolvedValue([player('p1', 'ana'), club('c1', 'PadelBA')]);
    mockFetchFollowers.mockResolvedValue([player('p2', 'beto'), club('c2', 'PadelSur')]);

    const { result } = renderHook(() => usePartnerSearch('u1'));
    await waitFor(() => expect(result.current.connections.length).toBeGreaterThan(0));

    expect(result.current.connections.map((c) => c.id)).toEqual(['p1', 'p2']);
  });

  it('dedupea por id (following y follower a la vez), following primero', async () => {
    mockFetchFollowing.mockResolvedValue([player('p1', 'ana')]);
    mockFetchFollowers.mockResolvedValue([player('p1', 'ana'), player('p2', 'beto')]);

    const { result } = renderHook(() => usePartnerSearch('u1'));
    await waitFor(() => expect(result.current.connections.length).toBe(2));

    expect(result.current.connections.map((c) => c.id)).toEqual(['p1', 'p2']);
  });

  it('sin userId no consulta nada y connections queda vacío', async () => {
    const { result } = renderHook(() => usePartnerSearch(undefined));
    await waitFor(() => expect(result.current.connections).toEqual([]));
    expect(mockFetchFollowing).not.toHaveBeenCalled();
    expect(mockFetchFollowers).not.toHaveBeenCalled();
  });
});

describe('usePartnerSearch — searchPartners', () => {
  it('rankea las conexiones (sin clubs) antes que el resto de los resultados', async () => {
    mockFetchFollowing.mockResolvedValue([player('p1', 'ana')]);
    mockFetchFollowers.mockResolvedValue([]);
    const { result } = renderHook(() => usePartnerSearch('u1'));
    await waitFor(() => expect(result.current.connections.length).toBe(1));

    const searchResults: UserSearchResult[] = [
      { id: 'p3', name: 'carla', username: 'carla', profilePicture: null, region: null, isClub: false },
      { id: 'p1', name: 'ana', username: 'ana', profilePicture: null, region: null, isClub: false },
    ];
    mockSearchUsers.mockResolvedValue(searchResults);

    const ranked = await result.current.searchPartners('a');
    expect(ranked.map((p) => p.id)).toEqual(['p1', 'p3']); // p1 es conexión → primero
  });
});
