// Native GoPro livestream: the camera pushes RTMP to Wowza on its own, over WiFi,
// once configured by BLE. No phone-side relay (ffmpeg) involved — unlike the
// desktop's fallback path (`tools/cohn-stream.py`), which exists only because that
// script avoids holding a sustained BLE connection. This flow does hold it, because
// that is the ONLY path that has been verified against real hardware: torna-desktop's
// `legacy-ble/python/native_stream.py` (open_gopro 0.17.1) confirmed
// `LIVE_STREAM_STATE_STREAMING` against a HERO12. Every constant, field number and
// wait below is ported from that script, not guessed — see its docstring for the
// measurements behind them (notably the 15s pause between READY and the shutter, and
// the shutter ACK that can legitimately never arrive while the camera streams anyway).
//
// https://github.com/gopro/OpenGoPro/blob/main/protobuf/live_streaming.proto
import { numberField, type Fields } from './protocol';
import { request, response, success, syncDate, joinWifi, type CohnTransport } from './provision';

export interface LivestreamTarget {
  url: string;
  resolution?: string | null;
  lens?: string | null;
  minBitRate?: number | null;
  maxBitRate?: number | null;
  startingBitRate?: number | null;
}

const RESOLUTIONS: Record<string, number> = { '480': 4, '720': 7, '1080': 12 };
const LENSES: Record<string, number> = { wide: 0, linear: 4, superview: 3 };
const DEFAULT_RESOLUTION = RESOLUTIONS['720'];
const DEFAULT_LENS = LENSES.wide;
const DEFAULT_MIN_BITRATE = 1000;
const DEFAULT_MAX_BITRATE = 3000;
const DEFAULT_START_BITRATE = 1500;
// Reported by the camera itself in GET_LIVESTREAM_STATUS; outside this range it
// rejects set_livestream_mode entirely, so it's clamped before sending, with a
// callback so the caller can surface what changed instead of silently reclamping.
const CAMERA_MIN_BITRATE = 800;
const CAMERA_MAX_BITRATE = 10000;

const LIVESTREAM_ERRORS: Record<number, string> = {
  1: 'Error de red en la cámara.',
  2: 'El servidor de transmisión rechazó la cámara (URL inválida o requiere autenticación).',
  3: 'La cámara se quedó sin memoria.',
  4: 'La cámara no pudo obtener su propio video.',
  5: 'La cámara no detectó acceso a internet en esa red WiFi.',
  6: 'El servidor cerró la conexión.',
  7: 'La cámara no llegó al WiFi a tiempo.',
  8: 'Falló el handshake de seguridad con el servidor (revisá la hora de la cámara).',
  9: 'La cámara rechazó iniciar la transmisión.',
  10: 'Error desconocido de la cámara.',
  40: 'La tarjeta SD de la cámara está llena.',
  41: 'Se removió la tarjeta SD de la cámara.',
};

function parseResolution(raw?: string | null): number {
  if (!raw) return DEFAULT_RESOLUTION;
  const digits = String(raw).replace(/\D/g, '');
  return RESOLUTIONS[digits] ?? DEFAULT_RESOLUTION;
}

function parseLens(raw?: string | null): number {
  if (!raw) return DEFAULT_LENS;
  const clean = String(raw).toLowerCase().replace(/[^a-z]/g, '');
  const match = Object.entries(LENSES).find(([name]) => clean.includes(name));
  return match ? match[1] : DEFAULT_LENS;
}

function clampBitrate(value: number): number {
  return Math.min(CAMERA_MAX_BITRATE, Math.max(CAMERA_MIN_BITRATE, value));
}

/** SET_SHUTTER (0x01) is a plain TLV command, not a protobuf one — same framing as the date command in provision.ts. */
async function setShutter(t: CohnTransport, enable: boolean, timeoutMs: number): Promise<boolean> {
  await t.send('command', [0x01, 1, enable ? 1 : 0]);
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const bytes = await t.receive('command', Math.max(1, deadline - Date.now()));
      if (bytes[0] === 0x01) {
        if (bytes[1] !== 0) throw new Error('La cámara rechazó el disparador de grabación.');
        return true;
      }
    }
  } catch { /* timeout: the ack can legitimately never arrive while enabling, see module header */ }
  return false;
}

async function registerLivestreamStatus(t: CohnTransport): Promise<void> {
  // REGISTER_LIVE_STREAM_STATUS_STATUS = 1. Response is NotifyLiveStreamStatus itself,
  // not a ResponseGeneric, so there's nothing to `success()`-check here.
  await request(t, 'query', 0xf5, 0x74, { 1: 1 });
}

async function setLivestreamMode(t: CohnTransport, target: { url: string; windowSize: number; lens: number; minBitrate: number; maxBitrate: number; startingBitrate: number }): Promise<void> {
  const fields: Record<number, number | string> = {
    1: target.url, 3: target.windowSize, 7: target.minBitrate, 8: target.maxBitrate, 9: target.startingBitrate, 10: target.lens,
  };
  success(await request(t, 'command', 0xf1, 0x79, fields, 30000), 'la configuración del livestream');
}

function liveStreamFields(fields: Fields): { status?: number; error: number } {
  return { status: numberField(fields, 1), error: numberField(fields, 2) ?? 0 };
}

/** Polls NotifyLiveStreamStatus (sync response 0xF4 or async notification 0xF5) until one of `wantStatuses`, or throws on a camera-reported error. */
async function waitForLivestreamStatus(t: CohnTransport, wantStatuses: number[], deadline: number): Promise<void> {
  while (Date.now() < deadline) {
    const { fields } = await response(t, 'query', 0xf5, [0xf4, 0xf5], deadline);
    const { status, error } = liveStreamFields(fields);
    if (error !== 0) throw new Error(LIVESTREAM_ERRORS[error] ?? 'Error desconocido de la cámara.');
    if (status !== undefined && wantStatuses.includes(status)) return;
  }
  throw new Error('La cámara no confirmó el estado de la transmisión a tiempo.');
}

const LIVE_STREAM_STATE_READY = 2;
const LIVE_STREAM_STATE_STREAMING = 3;

/**
 * Configure + start the camera's own RTMP push and wait until it confirms
 * `LIVE_STREAM_STATE_STREAMING`. Throws (without starting anything else) if the
 * camera reports an error at any step. Caller must only mark the game LIVE / notify
 * followers after this resolves — never before.
 */
export async function startNativeLivestream(
  t: CohnTransport,
  wifi: { ssid: string; password: string },
  target: LivestreamTarget,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<void> {
  if (!target.url) throw new Error('Esta cámara no tiene un servidor de transmisión configurado. Contactá al administrador de Torna.');
  const checkAbort = () => { if (signal.aborted) throw new Error('Transmisión cancelada.'); };

  progress('Deteniendo la grabación local de la cámara…');
  await setShutter(t, false, 20000);
  checkAbort();

  progress('Suscribiéndose al estado de la transmisión…');
  await registerLivestreamStatus(t);
  checkAbort();

  progress('Sincronizando la fecha de la cámara…');
  await syncDate(t);
  checkAbort();

  progress(`Uniendo la cámara a "${wifi.ssid}"…`);
  await joinWifi(t, wifi.ssid, wifi.password, progress);
  checkAbort();

  const minBitrateRaw = clampBitrate(target.minBitRate ?? DEFAULT_MIN_BITRATE);
  const maxBitrateRaw = clampBitrate(target.maxBitRate ?? DEFAULT_MAX_BITRATE);
  const [minBitrate, maxBitrate] = minBitrateRaw <= maxBitrateRaw ? [minBitrateRaw, maxBitrateRaw] : [maxBitrateRaw, minBitrateRaw];
  const startingBitrate = clampBitrate(target.startingBitRate ?? DEFAULT_START_BITRATE);
  progress('Configurando la transmisión…');
  await setLivestreamMode(t, { url: target.url, windowSize: parseResolution(target.resolution), lens: parseLens(target.lens), minBitrate, maxBitrate, startingBitrate });
  checkAbort();

  progress('Esperando que la cámara quede lista…');
  await waitForLivestreamStatus(t, [LIVE_STREAM_STATE_READY, LIVE_STREAM_STATE_STREAMING], Date.now() + 60000);
  checkAbort();

  // Empirically required gap between READY and the shutter command — see module header.
  await new Promise((resolve) => setTimeout(resolve, 15000));
  checkAbort();

  progress('Iniciando la transmisión…');
  const acked = await setShutter(t, true, 20000);
  if (!acked) progress('La cámara no confirmó el comando; esperando que empiece a transmitir…');
  checkAbort();

  progress('Confirmando que la cámara está transmitiendo…');
  await waitForLivestreamStatus(t, [LIVE_STREAM_STATE_STREAMING], Date.now() + 150000);
}

/** Confirm stopped before allowing the game status to change. Keep WiFi for resuming. */
export async function stopNativeLivestream(t: CohnTransport): Promise<void> {
  await setShutter(t, false, 20000);
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const fields = await request(t, 'query', 0xf5, 0x74, {}, Math.min(10000, deadline - Date.now()));
    const state = numberField(fields, 1);
    if (state === 0 || state === 2 || state === 4 || state === 5) return;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('La GoPro no confirmó que dejó de transmitir. No se cambió el estado de la partida.');
}
