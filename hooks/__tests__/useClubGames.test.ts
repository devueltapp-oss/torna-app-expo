/**
 * Bug real (2026-10-02): cancelar una partida como club la mostraba como
 * "DETENIDA" (STOPPED) en "Juegos" — mapStatus colapsaba CANCELLED en
 * STOPPED. Ahora son estados distintos (`GameStatus` suma `CANCELLED`).
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { useClubGames } from '../useClubGames';
import { fetchClubGames } from '../../api/games';

jest.mock('../../api/games', () => ({ fetchClubGames: jest.fn() }));

function game(gameId: string, gameStatus: string) {
  return { gameId, gameStatus, court: 'CAM01', players: [], createdAt: '2026-09-02T12:00:00.000Z' };
}

describe('useClubGames — mapStatus', () => {
  it('CANCELLED se mapea a CANCELLED, no a STOPPED', async () => {
    (fetchClubGames as jest.Mock).mockResolvedValue([game('g1', 'CANCELLED'), game('g2', 'STOPPED')]);
    const { result } = renderHook(() => useClubGames('club-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const g1 = result.current.games.find((g) => g.id === 'g1');
    const g2 = result.current.games.find((g) => g.id === 'g2');
    expect(g1?.status).toBe('CANCELLED');
    expect(g2?.status).toBe('STOPPED'); // sin tocar: sigue siendo un estado distinto
  });
});
