import { fetchClubCameras, saveCameraCohn } from '../../api/cameras';
import { provisionFromPhone } from '../cohn/bluetooth';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => 'test-token') }), { virtual: true });
jest.mock('react-native', () => ({ Platform: { OS: 'android', Version: 35 }, PermissionsAndroid: {} }), { virtual: true });

const club = { id: 'club', isClub: true };
const player = { id: 'player', isClub: false };
const credentials = { ipAddress: '192.168.1.2', username: 'u', password: 'p', certificate: 'cert' };
const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterAll(() => { global.fetch = originalFetch; });

test('players cannot list, save or initialize Bluetooth', async () => {
  await expect(fetchClubCameras(player)).rejects.toThrow(/club/);
  await expect(saveCameraCohn(player, 'camera', credentials)).rejects.toThrow(/club/);
  await expect(provisionFromPhone(player, '6997', 'WiFi', 'secret', new AbortController().signal, () => {})).rejects.toThrow(/club/);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('a camera outside the authenticated list cannot be updated', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 'other' }] }) });
  await expect(saveCameraCohn(club, 'camera', credentials)).rejects.toThrow(/club/);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('club saves the Desktop-compatible contract without the WiFi password', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: 'camera' }] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {} }) });
  await saveCameraCohn(club, 'camera', credentials);
  const [url, options] = (global.fetch as jest.Mock).mock.calls[1];
  expect(url).toContain('/camera/camera/cohn');
  expect(options.method).toBe('PUT');
  expect(JSON.parse(options.body)).toEqual(credentials);
});

test('cancellation before saving never sends a PUT', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 'camera' }] }) });
  const abort = new AbortController(); abort.abort();
  await expect(saveCameraCohn(club, 'camera', credentials, abort.signal)).rejects.toThrow(/cancelado/);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('an already cancelled operation never requests native permissions', async () => {
  const abort = new AbortController(); abort.abort();
  await expect(provisionFromPhone(club, '6997', 'WiFi', 'secret', abort.signal, () => {})).rejects.toThrow(/cancelado/);
});
