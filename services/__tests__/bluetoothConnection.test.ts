import {PermissionsAndroid} from 'react-native';
import {connectCameraFromPhone} from '../cohn/bluetooth';
import {provision} from '../cohn/provision';
const mockBle = {start:jest.fn(async()=>{}), checkState:jest.fn(async()=>'on'),
 onDiscoverPeripheral:jest.fn(),scan:jest.fn(),stopScan:jest.fn(async()=>{}),
 connect:jest.fn(async()=>{}),createBond:jest.fn(async()=>{}),retrieveServices:jest.fn(async()=>{}),
 onDisconnectPeripheral:jest.fn(()=>({remove:jest.fn()})),onDidUpdateValueForCharacteristic:jest.fn(()=>({remove:jest.fn()})),
 write:jest.fn(async()=>{}),startNotification:jest.fn(async()=>{}),disconnect:jest.fn(async()=>{})};
jest.mock('react-native',()=>({Platform:{OS:'android',Version:35},PermissionsAndroid:{
 PERMISSIONS:{BLUETOOTH_SCAN:'scan',BLUETOOTH_CONNECT:'connect',ACCESS_FINE_LOCATION:'location'},
 RESULTS:{GRANTED:'granted',DENIED:'denied',NEVER_ASK_AGAIN:'never'},requestMultiple:jest.fn()
}}));
jest.mock('react-native-ble-manager',()=>({__esModule:true,default:mockBle}));
jest.mock('../cohn/provision',()=>({...jest.requireActual('../cohn/provision'),provision:jest.fn()}));
const user={id:'club',isClub:true};
beforeEach(()=>{
 jest.clearAllMocks(); mockBle.startNotification.mockImplementation(async()=>{});
 (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({scan:'granted',connect:'granted'});
 mockBle.onDiscoverPeripheral.mockImplementation(fn=>{mockBle.scan.mockImplementation(async()=>{fn({id:'gopro',name:'GoPro 1234'});});return {remove:jest.fn()};});
});
test('network notifications use Camera Management rather than Control & Query',async()=>{
 mockBle.startNotification.mockImplementation(async (_id?: string, service?: string, characteristic?: string)=>{
   if(characteristic?.includes('0092') && !service?.includes('0090')) throw Error('Characteristic not found');
 });
 const session=await connectCameraFromPhone(user,'1234',new AbortController().signal,jest.fn(),jest.fn());
 expect(mockBle.startNotification).toHaveBeenCalledWith('gopro','b5f90090-aa8d-11e3-9046-0002a5d5c51b','b5f90092-aa8d-11e3-9046-0002a5d5c51b');
 (provision as jest.Mock).mockImplementationOnce(async transport => { await transport.send('network',[2,2]); return {}; });
 await session.configureWifi('wifi','pass',new AbortController().signal,jest.fn());
 expect(mockBle.write).toHaveBeenCalledWith('gopro','b5f90090-aa8d-11e3-9046-0002a5d5c51b','b5f90091-aa8d-11e3-9046-0002a5d5c51b',expect.any(Array),20);
 await session.close();
});
test('requests nearby-device permissions before scan; retains BLE until closed',async()=>{
 const disconnected=jest.fn();
 const session=await connectCameraFromPhone(user,'1234',new AbortController().signal,jest.fn(),disconnected);
 expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith(['scan','connect']);
 expect((PermissionsAndroid.requestMultiple as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(mockBle.scan.mock.invocationCallOrder[0]);
 expect(mockBle.connect).toHaveBeenCalledWith('gopro',{autoconnect:false});
 expect(mockBle.startNotification).toHaveBeenCalledTimes(3);
 expect(mockBle.disconnect).not.toHaveBeenCalled();
 (provision as jest.Mock).mockResolvedValue({ipAddress:'192.168.1.2'});
 await session.configureWifi('club','password',new AbortController().signal,jest.fn());
 expect(mockBle.connect).toHaveBeenCalledTimes(1);
 await session.close();expect(mockBle.disconnect).toHaveBeenCalledWith('gopro');expect(disconnected).toHaveBeenCalledTimes(1);
});
test('denied permissions never scan or connect',async()=>{
 (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({scan:'denied',connect:'denied'});
 await expect(connectCameraFromPhone(user,'1234',new AbortController().signal,jest.fn(),jest.fn())).rejects.toThrow(/Permití/);
 expect(mockBle.scan).not.toHaveBeenCalled();expect(mockBle.connect).not.toHaveBeenCalled();
});
test('blocked permissions explain how to recover',async()=>{
 (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({scan:'never',connect:'never'});
 await expect(connectCameraFromPhone(user,'1234',new AbortController().signal,jest.fn(),jest.fn())).rejects.toThrow(/permisos de la app/);
 expect(mockBle.scan).not.toHaveBeenCalled();
});
test('a player never requests Bluetooth permissions',async()=>{
 await expect(connectCameraFromPhone({id:'player',isClub:false},'1234',new AbortController().signal,jest.fn(),jest.fn())).rejects.toThrow();
 expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
});
