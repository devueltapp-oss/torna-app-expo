/**
 * Editar cancha como club — `updateCourt` (`PATCH /padel-court/:id`). Mismo
 * `updatePadelCourt` que usa el desktop (`CreateCourtDialog.jsx`,
 * `src/views/settings/index.jsx`): acepta un subconjunto parcial del payload
 * (`{ isActive }` solo, o `{ cameraIds }` solo, o ambos).
 */
import {
  updateCourt, fetchCourtSchedule, updateCourtSchedule,
  fetchCourtExceptions, createCourtException, deleteCourtException,
} from '../clubs';

const club = { id: 'club-1', isClub: true };
const player = { id: 'player-1', isClub: false };

describe('updateCourt', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('un player nunca toca la red', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(updateCourt(player, 'court-1', { isActive: false })).rejects.toThrow(/club/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('manda PATCH /padel-court/:id con el payload exacto (cámaras + activa)', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ data: { id: 'court-1', name: 'Cancha 1', isActive: true, cameras: [{ id: 'cam-1', identifier: 'CAM01' }] } }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await updateCourt(club, 'court-1', { cameraIds: ['cam-1'], isActive: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/padel-court/court-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ cameraIds: ['cam-1'], isActive: true });
    expect(result.name).toBe('Cancha 1');
    expect(result.cameras).toEqual([{ id: 'cam-1', identifier: 'CAM01' }]);
  });

  it('acepta un subconjunto parcial (solo isActive, sin cameraIds)', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: {} }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await updateCourt(club, 'court-1', { isActive: false });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ isActive: false });
  });

  it('propaga el error (con status) si el backend rechaza', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 403, json: async () => ({}) })) as unknown as typeof fetch;

    await expect(updateCourt(club, 'court-1', { isActive: false })).rejects.toMatchObject({ status: 403 });
  });
});

/**
 * Horarios (semanal + excepciones) — `PUT/GET /padel-court/:id/schedule` y
 * `GET/POST/DELETE /padel-court/:id/exceptions`, mismo modelo que
 * `ScheduleDialog.jsx`/`ExceptionsDialog.jsx` del desktop.
 */
describe('horarios de cancha', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.clearAllMocks(); });

  it('updateCourtSchedule manda PUT (reemplazo completo) con blockMinutes/pricePerBlock/days', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: { blockMinutes: 90, pricePerBlock: 1000, days: [] } }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const days = [{ dayOfWeek: 1, isOpen: true, openMinute: 480, closeMinute: 1320 }];
    await updateCourtSchedule(club, 'court-1', { blockMinutes: 90, pricePerBlock: 1000, days });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/padel-court/court-1/schedule');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ blockMinutes: 90, pricePerBlock: 1000, days });
  });

  it('updateCourtSchedule y las excepciones rechazan a un player', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(updateCourtSchedule(player, 'c', { blockMinutes: 60, pricePerBlock: 0, days: [] })).rejects.toThrow(/club/);
    await expect(createCourtException(player, 'c', { date: '2026-09-02', isOpen: false })).rejects.toThrow(/club/);
    await expect(deleteCourtException(player, 'c', '2026-09-02')).rejects.toThrow(/club/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('createCourtException manda POST /padel-court/:id/exceptions con el payload exacto', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 201, json: async () => ({ data: { date: '2026-12-25', isOpen: false } }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await createCourtException(club, 'court-1', { date: '2026-12-25', isOpen: false });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/padel-court/court-1/exceptions');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ date: '2026-12-25', isOpen: false });
    expect(result).toEqual({ date: '2026-12-25', isOpen: false });
  });

  it('deleteCourtException manda DELETE a /padel-court/:id/exceptions/:date', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await deleteCourtException(club, 'court-1', '2026-12-25');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/padel-court/court-1/exceptions/2026-12-25');
    expect(init.method).toBe('DELETE');
  });

  it('fetchCourtSchedule / fetchCourtExceptions son GET simples (sin guarda de rol: lectura)', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchCourtSchedule('court-1');
    await fetchCourtExceptions('court-1');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0][0] as string)).toContain('/padel-court/court-1/schedule');
    expect((fetchMock.mock.calls[1][0] as string)).toContain('/padel-court/court-1/exceptions');
  });
});
