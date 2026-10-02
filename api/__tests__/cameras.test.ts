/**
 * Configuraciones de WiFi guardadas (`CameraConfig`, 2026-10-02) — mismo
 * `GET/POST /camera-config` que usa `CameraDialog.jsx` del desktop con su
 * `<Select>` "Configuración WiFi". Reemplaza el campo libre de SSID/password
 * que tenía "Enlazar GoPro".
 */
import { fetchCameraConfigs, createCameraConfig } from '../cameras';

const club = { id: 'club-1', isClub: true };
const player = { id: 'player-1', isClub: false };

describe('fetchCameraConfigs / createCameraConfig', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.clearAllMocks(); });

  it('un player nunca toca la red', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchCameraConfigs(player)).rejects.toThrow(/club/);
    await expect(createCameraConfig(player, { name: 'x', wifiSsid: 'x', wifiPassword: 'x' })).rejects.toThrow(/club/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetchCameraConfigs hace GET /camera-config con el Bearer token', async () => {
    const configs = [{ id: 'cfg-1', name: 'WiFi del club', wifiSsid: 'Jeyu', wifiPassword: 'secret' }];
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: configs }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchCameraConfigs(club);

    expect(result).toEqual(configs);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/camera-config');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it('createCameraConfig manda POST /camera-config con el payload exacto', async () => {
    const created = { id: 'cfg-2', name: 'Cancha 2', wifiSsid: 'JeyuGuest', wifiPassword: 'otra' };
    const fetchMock = jest.fn(async () => ({ ok: true, status: 201, json: async () => ({ data: created }) }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await createCameraConfig(club, { name: 'Cancha 2', wifiSsid: 'JeyuGuest', wifiPassword: 'otra' });

    expect(result).toEqual(created);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/camera-config');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Cancha 2', wifiSsid: 'JeyuGuest', wifiPassword: 'otra' });
  });

  it('una lista inválida del backend no se acepta en silencio', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: { not: 'an array' } }) })) as unknown as typeof fetch;

    await expect(fetchCameraConfigs(club)).rejects.toThrow(/inválida/);
  });
});
