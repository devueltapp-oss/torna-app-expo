import { acquireCameraControl } from './controlLease';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { assertClub, type ClubIdentity, type CohnCredentials } from './provision';

type Command = 'state' | 'start' | 'stop' | 'keepAlive';
type NativeControl = { request(credentials: CohnCredentials, command: Command, port: number): Promise<string> };
let occupied = false;
export const LOCAL_PREVIEW_PORT = 18554;
export const localPreviewSupported = Platform.OS === 'android';

/** One local receiver at a time. Keep the lease through start, keepalive and cleanup. */
export async function openLocalPreview(user: ClubIdentity, credentials: CohnCredentials, signal: AbortSignal, onFailure: (message: string) => void, onBeforeStart: () => Promise<void> = async () => {}) {
  assertClub(user);
  if (!localPreviewSupported) throw new Error('El preview local está disponible en Android.');
  if (occupied) throw new Error('Cerrá el preview anterior antes de abrir otra cámara.');
  const native = requireOptionalNativeModule<NativeControl>('TornaCohn');
  if (!native) throw new Error('Instalá la nueva compilación de Torna para usar el preview local.');
  const releaseControl = acquireCameraControl();
  occupied = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closing = false;
  let startAttempted = false;
  let closePromise: Promise<void> | undefined;
  let inFlight: Promise<string> = Promise.resolve('');
  const request = (command: Command) => (inFlight = native.request(credentials, command, LOCAL_PREVIEW_PORT));
  const close = () => {
    if (closePromise) return closePromise;
    closing = true; clearTimeout(timer);
    closePromise = (async () => {
      await inFlight.catch(() => {});
      try { if (startAttempted) await request('stop'); }
      finally { releaseControl(); occupied = false; signal.removeEventListener('abort', abort); }
    })();
    return closePromise;
  };
  const abort = () => { void close().catch(() => onFailure('No se confirmó el cierre en la cámara. Revisá su conexión antes de volver a usarla.')); };
  const heartbeat = async () => {
    if (closing) return;
    try { await request('keepAlive'); }
    catch { onFailure('Se perdió la conexión con la cámara. Comprobá el WiFi y reintentá.'); await close().catch(() => {}); return; }
    if (!closing) timer = setTimeout(heartbeat, 3000);
  };
  try {
    if (signal.aborted) throw new Error('Preview cancelado.');
    // Check connectivity before taking over the UDP output.
    await request('state');
    if (signal.aborted) throw new Error('Preview cancelado.');
    // Bind our UDP receiver before telling the camera to send: the GoPro starts
    // pushing packets as soon as `start` responds and never retries the ones
    // sent while nobody on this phone was listening yet.
    await onBeforeStart();
    if (signal.aborted) throw new Error('Preview cancelado.');
    startAttempted = true;
    await request('start');
    if (signal.aborted) { await close(); throw new Error('Preview cancelado.'); }
    signal.addEventListener('abort', abort);
    timer = setTimeout(heartbeat, 3000);
    return { close };
  } catch (error) {
    await close().catch(() => {});
    throw error;
  }
}
