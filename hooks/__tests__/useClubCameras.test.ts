import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useClubCameras } from '../useClubCameras';
import { fetchClubCameras, saveCameraCohn, assignCameraWifi, fetchCameraConfigs, createCameraConfig } from '../../api/cameras';
import { provisionFromPhone } from '../../services/cohn/bluetooth';

jest.mock('../../api/cameras', () => ({
  fetchClubCameras: jest.fn(), saveCameraCohn: jest.fn(), assignCameraWifi: jest.fn(async () => {}),
  fetchCameraConfigs: jest.fn(), createCameraConfig: jest.fn(),
}));
jest.mock('../../services/cohn/bluetooth', () => ({ provisionFromPhone: jest.fn() }));
const user = { id: 'club', isClub: true };
const cameras = [{ id: 'one', identifier: 'Cancha 1', bleName: '6997' }, { id: 'two', identifier: 'Cancha 2', bleName: '1234' }];
const credentials = { ipAddress: '192.168.1.2', username: 'u', password: 'p', certificate: 'cert' };
const configs = [{ id: 'cfg-1', name: 'WiFi del club', wifiSsid: 'Jeyu', wifiPassword: 'secret' }];

beforeEach(() => {
  jest.clearAllMocks();
  (fetchClubCameras as jest.Mock).mockResolvedValue(cameras);
  (fetchCameraConfigs as jest.Mock).mockResolvedValue(configs);
  (createCameraConfig as jest.Mock).mockResolvedValue(configs[0]);
  (provisionFromPhone as jest.Mock).mockResolvedValue(credentials);
  (saveCameraCohn as jest.Mock).mockResolvedValue(undefined);
});

test('saves one camera before allowing the next and requires a fresh stopped confirmation', async () => {
  const { result } = renderHook(() => useClubCameras(user));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await waitFor(() => expect(result.current.configsLoading).toBe(false));
  act(() => { result.current.select(cameras[0]); result.current.selectConfig('cfg-1'); result.current.setStopped(true); });
  await act(async () => { await result.current.start(); });
  expect(result.current.linked.has('one')).toBe(true);
  expect(result.current.selected).toBeUndefined();
  expect(result.current.stopped).toBe(false);
  act(() => { result.current.select(cameras[1]); result.current.selectConfig('cfg-1'); });
  await act(async () => { await result.current.start(); });
  expect(provisionFromPhone).toHaveBeenCalledTimes(1);
  act(() => { result.current.setStopped(true); });
  await act(async () => { await result.current.start(); });
  expect(result.current.linked.has('two')).toBe(true);
  expect(saveCameraCohn).toHaveBeenCalledTimes(2);
});

test('failed upload can be retried without another Bluetooth provisioning', async () => {
  (saveCameraCohn as jest.Mock).mockRejectedValueOnce(new Error('Sin red'));
  const { result } = renderHook(() => useClubCameras(user));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await waitFor(() => expect(result.current.configsLoading).toBe(false));
  act(() => { result.current.select(cameras[0]); result.current.selectConfig('cfg-1'); result.current.setStopped(true); });
  await act(async () => { await result.current.start(); });
  expect(result.current.pending).toBe(true);
  expect(result.current.linked.size).toBe(0);
  await act(async () => { await result.current.start(); });
  expect(result.current.pending).toBe(false);
  expect(result.current.linked.has('one')).toBe(true);
  expect(provisionFromPhone).toHaveBeenCalledTimes(1);
});

test('createConfig crea y selecciona la configuración, lista para enlazar', async () => {
  const { result } = renderHook(() => useClubCameras(user));
  await waitFor(() => expect(result.current.configsLoading).toBe(false));

  await act(async () => { await result.current.createConfig({ name: 'WiFi del club', wifiSsid: 'Jeyu', wifiPassword: 'secret' }); });

  expect(createCameraConfig).toHaveBeenCalledWith(user, { name: 'WiFi del club', wifiSsid: 'Jeyu', wifiPassword: 'secret' });
  expect(result.current.selectedConfigId).toBe('cfg-1');
  expect(result.current.ssid).toBe('Jeyu');
  expect(result.current.configs).toContainEqual(configs[0]);
});

test('preselects the WiFi assigned to the camera without user interaction',async()=>{
 (fetchClubCameras as jest.Mock).mockResolvedValue([{...cameras[0],cameraConfigId:'cfg-1'}]);
 const {result}=renderHook(()=>useClubCameras(user,{cameraId:'one',onLinked:jest.fn()}));
 await waitFor(()=>expect(result.current.selectedConfigId).toBe('cfg-1'));
 expect(result.current.ssid).toBe('Jeyu');
});

test('changing WiFi persists the new assignment and retries saving without repeating BLE',async()=>{
 const next={id:'cfg-2',name:'Otra red',wifiSsid:'Otra',wifiPassword:'next-secret'};
 (fetchClubCameras as jest.Mock).mockResolvedValue([{...cameras[0],cameraConfigId:'cfg-1'}]);
 (fetchCameraConfigs as jest.Mock).mockResolvedValue([...configs,next]);
 (assignCameraWifi as jest.Mock).mockRejectedValueOnce(new Error('Sin red')).mockResolvedValue(undefined);
 const {result}=renderHook(()=>useClubCameras(user,{cameraId:'one',onLinked:jest.fn()}));
 await waitFor(()=>expect(result.current.selectedConfigId).toBe('cfg-1'));
 act(()=>{result.current.selectConfig('cfg-2');result.current.setStopped(true);});
 await act(async()=>{await result.current.start();});
 expect(result.current.pending).toBe(true);
 expect(assignCameraWifi).toHaveBeenCalledWith(user,'one','cfg-2',expect.anything());
 await act(async()=>{await result.current.start();});
 expect(provisionFromPhone).toHaveBeenCalledTimes(1);
 expect(provisionFromPhone).toHaveBeenCalledWith(user,'6997','Otra','next-secret',expect.anything(),expect.any(Function));
 expect(result.current.linked.has('one')).toBe(true);
});
