/**
 * Admin de partidas como club: crear (`POST /game`) y cancelar una reserva de
 * otro usuario (`PATCH /game/:id/cancel-reservation`). Dos cosas a fijar:
 *   1. Guarda de rol (`assertClub`) — un player NUNCA debe llegar a tocar la
 *      red con estas dos funciones (mutan datos de terceros).
 *   2. El payload exacto de `createClubGame` — mismo contrato que ya usa
 *      `CreateGameDialog.jsx` del desktop contra el backend real.
 */
import { createClubGame, cancelClubReservation, finishClubGame } from '../games';

const club = { id: 'club-1', isClub: true };
const player = { id: 'player-1', isClub: false };

describe('createClubGame / cancelClubReservation', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('un player (o sesión sin usuario) nunca toca la red', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(createClubGame(player, {
      jobId: 'job-1', cameraIds: ['cam-1'], courtId: 'court-1',
      scheduledStartAt: '2026-09-02T12:00:00.000Z', scheduledEndAt: '2026-09-02T13:30:00.000Z', category: 3,
    }, [{ userId: 'u1' }])).rejects.toThrow(/club/);

    await expect(cancelClubReservation(player, 'game-1')).rejects.toThrow(/club/);
    await expect(finishClubGame(player, 'game-1')).rejects.toThrow(/club/);
    await expect(createClubGame(null, {
      jobId: 'job-1', cameraIds: [], courtId: 'c', scheduledStartAt: '', scheduledEndAt: '', category: 1,
    }, [])).rejects.toThrow(/club/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('createClubGame manda POST /game con el contrato exacto del desktop', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 201, json: async () => ({ data: { id: 'new-game' } }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await createClubGame(club, {
      jobId: 'job-1', cameraIds: ['cam-1', 'cam-2'], courtId: 'court-1',
      scheduledStartAt: '2026-09-02T12:00:00.000Z', scheduledEndAt: '2026-09-02T13:30:00.000Z', category: 3,
    }, [{ userId: 'u1' }, { userId: 'u2' }]);

    expect(result).toEqual({ id: 'new-game' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/game');
    expect(url).not.toContain('/game/');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    expect(JSON.parse(init.body as string)).toEqual({
      game: {
        jobId: 'job-1', cameraIds: ['cam-1', 'cam-2'], courtId: 'court-1',
        scheduledStartAt: '2026-09-02T12:00:00.000Z', scheduledEndAt: '2026-09-02T13:30:00.000Z', category: 3,
      },
      players: [{ userId: 'u1' }, { userId: 'u2' }],
    });
  });

  it('cancelClubReservation manda PATCH a /game/:id/cancel-reservation (no /cancel, que es del jugador-dueño)', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: {} }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await cancelClubReservation(club, 'game-42');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/game/game-42/cancel-reservation');
    expect(init.method).toBe('PATCH');
  });

  it('propaga el error (con status) si el backend rechaza', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 403, json: async () => ({}) })) as unknown as typeof fetch;

    await expect(cancelClubReservation(club, 'game-1')).rejects.toMatchObject({ status: 403 });
  });

  it('finishClubGame manda PATCH a /game/:id con {status:"FINISHED"} — el mismo editGame del desktop', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: {} }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await finishClubGame(club, 'game-42');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/game/game-42');
    expect(url).not.toContain('/game/game-42/'); // sin sub-ruta — distinto de cancel-reservation
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ status: 'FINISHED' });
  });
});
