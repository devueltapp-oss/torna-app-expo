import {assignedCameraWifi,prepareAssignedNetwork} from '../cohn/assignedWifi';
import {fetchCameraConfigs} from '../../api/cameras';
jest.mock('../../api/cameras',()=>({fetchCameraConfigs:jest.fn()}));
const user={id:'club',isClub:true};
const config={id:'cfg',name:'Club',wifiSsid:'Jeyu',wifiPassword:'secret'};
const camera={id:'cam',identifier:'CAM01',bleName:'6997',cameraConfigId:'cfg'};
test('uses the assigned configuration, never the first unrelated WiFi',()=>{
 expect(assignedCameraWifi(camera,[{...config,id:'other',wifiSsid:'Wrong'},config])).toEqual(config);
 expect(assignedCameraWifi({...camera,cameraConfigId:'missing'},[config])).toBeUndefined();
});
test('supports the flattened camera data returned by Desktop game cameras',()=>{
 expect(assignedCameraWifi({...camera,wifiSsid:'Jeyu',wifiPassword:'secret'},[])?.wifiSsid).toBe('Jeyu');
});
test('reuses connected COHN without reconfiguring WiFi',async()=>{
 const credentials={ipAddress:'192.168.1.2',username:'u',password:'p',certificate:'cert'};
 const session={readNetwork:jest.fn(async()=>credentials),configureWifi:jest.fn(),close:jest.fn()};
 expect(await prepareAssignedNetwork(user,camera,session,new AbortController().signal,jest.fn())).toEqual(credentials);
 expect(session.configureWifi).not.toHaveBeenCalled();
});
test('connects the assigned WiFi automatically when BLE reports no network',async()=>{
 (fetchCameraConfigs as jest.Mock).mockResolvedValue([config]);
 const session={readNetwork:jest.fn(async()=>null),configureWifi:jest.fn(async()=>({ipAddress:'192.168.1.2'})),close:jest.fn()};
 await prepareAssignedNetwork(user,camera,session as any,new AbortController().signal,jest.fn());
 expect(session.configureWifi).toHaveBeenCalledWith('Jeyu','secret',expect.anything(),expect.any(Function));
 expect(session.close).not.toHaveBeenCalled();
});
