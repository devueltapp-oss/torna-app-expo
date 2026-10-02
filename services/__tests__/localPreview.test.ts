import {openLocalPreview} from '../cohn/localPreview';
const mockRequest=jest.fn();
jest.mock('react-native',()=>({Platform:{OS:'android'}}));
jest.mock('expo-modules-core',()=>({requireOptionalNativeModule:()=>({request:mockRequest})}));
const user={id:'club',isClub:true};
const credentials={ipAddress:'192.168.1.2',username:'u',password:'p',certificate:'cert'};
beforeEach(()=>{mockRequest.mockReset();mockRequest.mockResolvedValue('{}');jest.useFakeTimers();});
afterEach(()=>jest.useRealTimers());
test('preview uses only local commands and closes before releasing its lease',async()=>{
 const session=await openLocalPreview(user,credentials,new AbortController().signal,jest.fn());
 expect(mockRequest.mock.calls.map(c=>c[1])).toEqual(['state','start']);
 await expect(openLocalPreview(user,credentials,new AbortController().signal,jest.fn())).rejects.toThrow(/anterior/);
 await session.close();expect(mockRequest.mock.calls.map(c=>c[1])).toEqual(['state','start','stop']);
 const next=await openLocalPreview(user,credentials,new AbortController().signal,jest.fn());await next.close();
});
test('a failed connectivity probe never sends stop',async()=>{
 mockRequest.mockRejectedValueOnce(Error('offline'));
 await expect(openLocalPreview(user,credentials,new AbortController().signal,jest.fn())).rejects.toThrow('offline');
 expect(mockRequest).toHaveBeenCalledTimes(1);
});
test('a player cannot send camera commands',async()=>{
 await expect(openLocalPreview({id:'p',isClub:false},credentials,new AbortController().signal,jest.fn())).rejects.toThrow();expect(mockRequest).not.toHaveBeenCalled();
});
test('the local UDP receiver opens between the connectivity probe and start, so no packet is sent before something is listening',async()=>{
 const order:string[]=[];
 mockRequest.mockImplementation(async(_c:unknown,command:string)=>{order.push('request:'+command);return '{}';});
 const onBeforeStart=jest.fn(async()=>{order.push('receiver-ready');});
 const session=await openLocalPreview(user,credentials,new AbortController().signal,jest.fn(),onBeforeStart);
 expect(order).toEqual(['request:state','receiver-ready','request:start']);
 await session.close();
});
test('a failed receiver setup never tells the camera to start, so there is nothing to stop',async()=>{
 const onBeforeStart=jest.fn(async()=>{throw new Error('No se pudo abrir el receptor UDP.');});
 await expect(openLocalPreview(user,credentials,new AbortController().signal,jest.fn(),onBeforeStart)).rejects.toThrow('receptor UDP');
 expect(mockRequest.mock.calls.map(c=>c[1])).toEqual(['state']);
});
test('cancellation waits for a starting command before stopping',async()=>{
 let complete!: (value:string)=>void;
 mockRequest.mockResolvedValueOnce('{}').mockImplementationOnce(()=>new Promise<string>(r=>{complete=r;}));
 const controller=new AbortController();const pending=openLocalPreview(user,credentials,controller.signal,jest.fn());
 await Promise.resolve();await Promise.resolve();controller.abort();complete('{}');
 await expect(pending).rejects.toThrow(/cancelado/);expect(mockRequest.mock.calls.map(c=>c[1])).toEqual(['state','start','stop']);
});

test('camera start waits until the receiver is bound and cancellation prevents start',async()=>{
 let ready!:()=>void;
 const bound=new Promise<void>(resolve=>{ready=resolve;});
 const controller=new AbortController();
 const pending=openLocalPreview(user,credentials,controller.signal,jest.fn(),()=>bound);
 await Promise.resolve();await Promise.resolve();
 expect(mockRequest.mock.calls.map(c=>c[1])).toEqual(['state']);
 controller.abort();ready();
 await expect(pending).rejects.toThrow(/cancelado/);
 expect(mockRequest.mock.calls.map(c=>c[1])).toEqual(['state']);
 const next=await openLocalPreview(user,credentials,new AbortController().signal,jest.fn());
 await next.close();
});
