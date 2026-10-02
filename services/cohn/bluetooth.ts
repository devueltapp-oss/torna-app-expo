import { acquireCameraControl } from './controlLease';
import { PermissionsAndroid, Platform } from 'react-native';
import { assertClub, provision, readExistingCohn, type ClubIdentity, type CohnChannel, type CohnCredentials, type CohnTransport } from './provision';
import { fragment, PacketAssembler } from './protocol';
import { startNativeLivestream, stopNativeLivestream, type LivestreamTarget } from './liveStream';

const service = '0000fea6-0000-1000-8000-00805f9b34fb';
const uuid = (suffix: string) => `b5f9${suffix}-aa8d-11e3-9046-0002a5d5c51b`;
const characteristics = {
  command: [uuid('0072'), uuid('0073')],
  query: [uuid('0076'), uuid('0077')],
  network: [uuid('0091'), uuid('0092')],
};
// Network Management belongs to GP-0090, not the advertised FEA6 service.
const channelServices: Record<CohnChannel, string> = { command: service, query: service, network: uuid('0090') };
let busy = false;
let initialized: Promise<void> | undefined;

function bounded<T>(task: Promise<T>, signal: AbortSignal, ms = 30000): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => finish(new Error('Enlace cancelado.'));
    const timer = setTimeout(() => finish(new Error('La cámara no respondió a tiempo.')), ms);
    const finish = (error?: Error, value?: T) => {
      clearTimeout(timer); signal.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(value as T);
    };
    signal.addEventListener('abort', abort);
    task.then((value) => finish(undefined, value), () => finish(new Error('Falló la comunicación Bluetooth. Comprobá el emparejamiento de la cámara.')));
    if (signal.aborted) abort();
  });
}

class Inbox {
  private messages: number[][] = [];
  private waiter?: { resolve: (p: number[]) => void; reject: (e: Error) => void };
  private error?: Error;
  push(message: number[]) {
    if (this.waiter) { const waiter = this.waiter; this.waiter = undefined; waiter.resolve(message); }
    else if (this.messages.length < 100) this.messages.push(message);
    else this.fail(new Error('Demasiadas respuestas Bluetooth pendientes.'));
  }
  fail(error: Error) { this.error = error; this.waiter?.reject(error); this.waiter = undefined; }
  async next(signal: AbortSignal, ms: number): Promise<number[]> {
    if (signal.aborted) throw new Error('Enlace cancelado.');
    if (this.error) throw this.error;
    const message = this.messages.shift();
    if (message) return message;
    try {
      return await bounded(new Promise<number[]>((resolve, reject) => { this.waiter = { resolve, reject }; }), signal, ms);
    } finally { this.waiter = undefined; }
  }
}

/** Native module is imported only after the club guard, never during Player startup. */
async function withCameraBluetooth<T>(user: ClubIdentity | null, bleName: string,
  signal: AbortSignal, progress: (message: string) => void, operation: (transport: CohnTransport) => Promise<T>, onLost: () => void = () => {}): Promise<T> {
  assertClub(user);
  if (signal.aborted) throw new Error('Enlace cancelado.');
  if (!/^\d{4}$/.test(bleName)) throw new Error('La cámara debe tener sus cuatro dígitos GoPro configurados en Desktop.');
  if (busy) throw new Error('Ya hay una cámara enlazándose. Esperá a que termine.');
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') throw new Error('El enlace requiere la app instalada en Android o iPhone.');
  const releaseControl = acquireCameraControl();
  busy = true;
  let id: string | undefined;
  const subscriptions: Array<{ remove(): void }> = [];
  let manager: typeof import('react-native-ble-manager').default | undefined;
  try {
    progress('Preparando Bluetooth…');
    if (Platform.OS === 'android') {
      const permissions = Number(Platform.Version) >= 31
        ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const results = await PermissionsAndroid.requestMultiple(permissions);
      if (permissions.some((p) => results[p] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) throw new Error('El permiso de Bluetooth está bloqueado. Abrí los permisos de la app y habilitá Dispositivos cercanos.');
      if (permissions.some((p) => results[p] !== PermissionsAndroid.RESULTS.GRANTED)) throw new Error('Permití el acceso a Bluetooth para enlazar la cámara.');
    }
    if (signal.aborted) throw new Error('Enlace cancelado.');
    try { manager = require('react-native-ble-manager').default; }
    catch { throw new Error('Esta versión de Torna no incluye Bluetooth. Instalá la nueva compilación de la app.'); }
    const ble = manager;
    if (!ble) throw new Error('El módulo Bluetooth no está disponible en esta compilación.');
    initialized ??= ble.start({ showAlert: true }).catch((error: unknown) => { initialized = undefined; throw error; });
    await bounded(initialized, signal);
    if (await ble.checkState() !== 'on') throw new Error('Activá Bluetooth en el teléfono y volvé a intentar.');

    progress(`Buscando GoPro ${bleName}…`);
    const found = new Promise<string>((resolve) => {
      subscriptions.push(ble.onDiscoverPeripheral((device) => {
        if ((device.name || device.advertising?.localName) === `GoPro ${bleName}`) resolve(device.id);
      }));
    });
    // Attach a rejection handler before starting native scan.
    const waiting = bounded(found, signal, 20000);
    void waiting.catch(() => {});
    await bounded(ble.scan({ serviceUUIDs: [service], seconds: 20, allowDuplicates: false }), signal);
    id = await waiting;
    await ble.stopScan();
    progress('Conectando. Aceptá el emparejamiento si el teléfono lo solicita…');
    await bounded(ble.connect(id, { autoconnect: false }), signal);
    if (Platform.OS === 'android') await bounded(ble.createBond(id), signal, 60000);
    await bounded(ble.retrieveServices(id), signal);
    const queues = { command: new Inbox(), query: new Inbox(), network: new Inbox() };
    const assemblers = { command: new PacketAssembler(), query: new PacketAssembler(), network: new PacketAssembler() };
    const fail = (error: Error) => Object.values(queues).forEach((q) => q.fail(error));
    subscriptions.push(ble.onDisconnectPeripheral((event) => {
      if (event.peripheral === id) { fail(new Error('La cámara perdió la conexión Bluetooth.')); onLost(); }
    }));
    subscriptions.push(ble.onDidUpdateValueForCharacteristic((event) => {
      if (event.peripheral !== id) return;
      const channel = (Object.keys(characteristics) as CohnChannel[]).find((key) => characteristics[key][1] === event.characteristic.toLowerCase());
      if (!channel) return;
      try { const complete = assemblers[channel].push(event.value); if (complete) queues[channel].push(complete); }
      catch { fail(new Error('Se recibió una respuesta Bluetooth inválida.')); }
    }));
    for (const channel of Object.keys(characteristics) as CohnChannel[]) {
      progress(channel === 'network' ? 'Activando el canal de red de la GoPro…' : 'Activando los controles Bluetooth…');
      await bounded(ble.startNotification(id, channelServices[channel], characteristics[channel][1]), signal);
    }
    const connectedId = id;
    const transport: CohnTransport = {
      async send(channel, payload) {
        if (signal.aborted) throw new Error('Enlace cancelado.');
        for (const packet of fragment(payload)) await bounded(ble.write(connectedId, channelServices[channel], characteristics[channel][0], packet, 20), signal);
      },
      receive: (channel, ms = 30000) => queues[channel].next(signal, ms),
    };
    return await operation(transport);
  } finally {
    subscriptions.forEach((subscription) => subscription.remove());
    if (manager) {
      const cleanup = new AbortController();
      await bounded(manager.stopScan(), cleanup.signal, 5000).catch(() => {});
      if (id) await bounded(manager.disconnect(id), cleanup.signal, 5000).catch(() => {});
    }
    releaseControl();
    busy = false;
  }
}

export async function provisionFromPhone(user: ClubIdentity | null, bleName: string, ssid: string, password: string,
  signal: AbortSignal, progress: (message: string) => void): Promise<CohnCredentials> {
  return withCameraBluetooth(user, bleName, signal, progress, t => provision(t, ssid, password, progress));
}

export interface CameraBluetoothSession {
  configureWifi(ssid: string, password: string, signal: AbortSignal, progress: (message: string) => void): Promise<CohnCredentials>;
  readNetwork(): Promise<CohnCredentials | null>;
  /** Configures + starts the camera's own RTMP push and resolves once it confirms it's actually streaming. */
  goLive(wifi: { ssid: string; password: string }, target: LivestreamTarget, signal: AbortSignal, progress: (message: string) => void): Promise<void>;
  stopLive(): Promise<void>;
  close(): Promise<void>;
}

/** Keep BLE connected across the explicit connect and configure buttons. */
export function connectCameraFromPhone(user: ClubIdentity | null, bleName: string, signal: AbortSignal,
  progress: (message: string) => void, onDisconnected: () => void): Promise<CameraBluetoothSession> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let release: (() => void) | undefined;
    let pending: Promise<unknown> | undefined;
    let closing = false;
    const abort = () => { closing = true; controller.abort(); void Promise.resolve(pending).catch(() => {}).finally(() => release?.()); };
    signal.addEventListener('abort', abort);
    if (signal.aborted) abort();
    const finished = withCameraBluetooth(user, bleName, controller.signal, progress, async transport => {
      const held = new Promise<void>(done => { release = done; });
      const run = <T,>(fn: () => Promise<T>): Promise<T> => {
        if (closing || controller.signal.aborted) return Promise.reject(new Error('Bluetooth desconectado. Volvé a conectar la cámara.'));
        if (pending) return Promise.reject(new Error('Esperá a que termine el comando anterior.'));
        const task = fn(); pending = task;
        return task.finally(() => { if (pending === task) pending = undefined; });
      };
      if (controller.signal.aborted) throw new Error('Conexión cancelada.');
      resolve({
        readNetwork: () => run(() => readExistingCohn(transport)),
        configureWifi: (ssid, password, operationSignal, update) => run(async () => {
          operationSignal.addEventListener('abort', abort);
          try { if (operationSignal.aborted) abort(); return await provision(transport, ssid, password, update); }
          finally { operationSignal.removeEventListener('abort', abort); }
        }),
        goLive: (wifi, target, operationSignal, update) => run(async () => {
          operationSignal.addEventListener('abort', abort);
          try { if (operationSignal.aborted) abort(); return await startNativeLivestream(transport, wifi, target, operationSignal, update); }
          finally { operationSignal.removeEventListener('abort', abort); }
        }),
        stopLive: () => run(() => stopNativeLivestream(transport)),
        close: async () => { abort(); await finished; },
      });
      await held;
    }, abort).finally(() => { signal.removeEventListener('abort', abort); onDisconnected(); });
    void finished.catch(reject);
  });
}
