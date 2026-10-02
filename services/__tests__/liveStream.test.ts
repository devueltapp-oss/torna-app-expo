import { encode, decode, numberField, textField } from '../cohn/protocol';
import { startNativeLivestream, stopNativeLivestream } from '../cohn/liveStream';
import type { CohnChannel, CohnTransport } from '../cohn/provision';

type Queues = Partial<Record<CohnChannel, number[][]>>;

function makeTransport(queues: Queues) {
  const q: Record<CohnChannel, number[][]> = { command: [...(queues.command ?? [])], query: [...(queues.query ?? [])], network: [...(queues.network ?? [])] };
  const sent: Array<{ channel: CohnChannel; payload: number[] }> = [];
  const transport: CohnTransport = {
    send: async (channel, payload) => { sent.push({ channel, payload }); },
    receive: async (channel) => {
      const reply = q[channel].shift();
      if (!reply) throw new Error(`sin respuesta encolada en ${channel}`);
      return reply;
    },
  };
  return { transport, sent };
}

// Reply sequence for a successful WiFi join, identical in shape to the one `provision()`
// already exercises in cohn.test.ts (scan → list → connect → connected).
const WIFI_JOIN_REPLIES: number[][] = [
  [2, 0x82, ...encode({ 1: 1 })],
  [2, 0x0b, ...encode({ 1: 5, 2: 7, 3: 1 })],
  [2, 0x83, ...encode({ 1: 1, 3: encode({ 1: 'Jeyu', 5: 1 }) })],
  [2, 0x85, ...encode({ 1: 1 })],
  [2, 0x0c, ...encode({ 1: 5 })],
];

const wifi = { ssid: 'Jeyu', password: 'secret' };
const target = { url: 'rtmp://wowza.torna.io:1936/live/cancha-1' };

describe('livestream nativo de GoPro', () => {
  jest.useFakeTimers();

  it('configura, espera READY, dispara el shutter y confirma STREAMING', async () => {
    const { transport, sent } = makeTransport({
      command: [
        [0x01, 0], // shutter DISABLE ack
        [0x0f, 0], // date sync ack
        [0xf1, 0xf9, ...encode({ 1: 1 })], // SET_LIVESTREAM_MODE_RSP success
        [0x01, 0], // shutter ENABLE ack
      ],
      query: [
        [0xf5, 0xf4, ...encode({ 1: 0 })], // register_livestream_status sync response (IDLE)
        [0xf5, 0xf4, ...encode({ 1: 2 })], // READY
        [0xf5, 0xf5, ...encode({ 1: 3 })], // STREAMING (async notif)
      ],
      network: WIFI_JOIN_REPLIES,
    });

    const promise = startNativeLivestream(transport, wifi, target, new AbortController().signal, () => {});
    await jest.advanceTimersByTimeAsync(15000); // the empirically-required READY→shutter gap
    await expect(promise).resolves.toBeUndefined();

    const setMode = sent.find((m) => m.channel === 'command' && m.payload[0] === 0xf1 && m.payload[1] === 0x79);
    expect(setMode).toBeDefined();
    const fields = decode(setMode!.payload.slice(2));
    expect(textField(fields, 1)).toBe(target.url);
    expect(numberField(fields, 3)).toBe(7); // default 720p
    expect(numberField(fields, 10)).toBe(0); // default wide
    expect(numberField(fields, 7)).toBe(1000); // default min bitrate
    expect(numberField(fields, 8)).toBe(3000); // default max bitrate
    expect(numberField(fields, 9)).toBe(1500); // default starting bitrate
  });

  it('no es fatal que el ack del shutter de encendido nunca llegue', async () => {
    const { transport } = makeTransport({
      command: [
        [0x01, 0], // shutter DISABLE ack
        [0x0f, 0], // date sync ack
        [0xf1, 0xf9, ...encode({ 1: 1 })], // SET_LIVESTREAM_MODE_RSP success
        // no shutter ENABLE ack queued — setShutter must swallow the failed receive
      ],
      query: [
        [0xf5, 0xf4, ...encode({ 1: 0 })],
        [0xf5, 0xf4, ...encode({ 1: 2 })], // READY
        [0xf5, 0xf5, ...encode({ 1: 3 })], // STREAMING arrives anyway
      ],
      network: WIFI_JOIN_REPLIES,
    });

    const promise = startNativeLivestream(transport, wifi, target, new AbortController().signal, () => {});
    await jest.advanceTimersByTimeAsync(15000);
    await expect(promise).resolves.toBeUndefined();
  });

  it('propaga el error que reporta la cámara y no sigue adelante', async () => {
    const { transport, sent } = makeTransport({
      command: [[0x01, 0], [0x0f, 0], [0xf1, 0xf9, ...encode({ 1: 1 })]],
      query: [
        [0xf5, 0xf4, ...encode({ 1: 0 })],
        // LIVE_STREAM_ERROR_CREATESTREAM = 2: bad RTMP URL / needs auth.
        [0xf5, 0xf4, ...encode({ 1: 1, 2: 2 })],
      ],
      network: WIFI_JOIN_REPLIES,
    });

    await expect(startNativeLivestream(transport, wifi, target, new AbortController().signal, () => {}))
      .rejects.toThrow(/URL inválida o requiere autenticación/);
    // Never reached the shutter-enable step.
    expect(sent.some((m) => m.channel === 'command' && m.payload[0] === 0x01 && m.payload[2] === 1)).toBe(false);
  });

  it('rechaza sin mandar nada si la cámara no tiene servidor configurado', async () => {
    const { transport, sent } = makeTransport({});
    await expect(startNativeLivestream(transport, wifi, { url: '' }, new AbortController().signal, () => {}))
      .rejects.toThrow(/servidor de transmisión/);
    expect(sent).toHaveLength(0);
  });

  it('recorta el bitrate fuera de rango y acepta variantes de texto para resolución/lente', async () => {
    const { transport, sent } = makeTransport({
      command: [[0x01, 0], [0x0f, 0], [0xf1, 0xf9, ...encode({ 1: 1 })], [0x01, 0]],
      query: [[0xf5, 0xf4, ...encode({ 1: 0 })], [0xf5, 0xf4, ...encode({ 1: 2 })], [0xf5, 0xf5, ...encode({ 1: 3 })]],
      network: WIFI_JOIN_REPLIES,
    });

    const promise = startNativeLivestream(transport, wifi,
      { url: target.url, resolution: '1080p', lens: 'Wide Angle', minBitRate: 50, maxBitRate: 50000, startingBitRate: 20000 },
      new AbortController().signal, () => {});
    await jest.advanceTimersByTimeAsync(15000);
    await promise;

    const setMode = sent.find((m) => m.channel === 'command' && m.payload[0] === 0xf1 && m.payload[1] === 0x79);
    const fields = decode(setMode!.payload.slice(2));
    expect(numberField(fields, 3)).toBe(12); // 1080p
    expect(numberField(fields, 10)).toBe(0); // wide
    expect(numberField(fields, 7)).toBe(800); // clamped up to camera min
    expect(numberField(fields, 8)).toBe(10000); // clamped down to camera max
    expect(numberField(fields, 9)).toBe(10000); // clamped starting bitrate
  });

  it('se puede cancelar mientras espera y no manda el shutter', async () => {
    const { transport, sent } = makeTransport({
      command: [[0x01, 0], [0x0f, 0]],
      query: [[0xf5, 0xf4, ...encode({ 1: 0 })]],
      network: WIFI_JOIN_REPLIES,
    });
    const controller = new AbortController();
    const promise = startNativeLivestream(transport, wifi, target, controller.signal, () => { controller.abort(); });
    await expect(promise).rejects.toThrow(/cancelad/);
    expect(sent.some((m) => m.channel === 'command' && m.payload[0] === 0xf1 && m.payload[1] === 0x79)).toBe(false);
  });

  it('detener la transmisión apaga el shutter y libera la red', async () => {
    const { transport, sent } = makeTransport({ command: [[0x01, 0], [0xf1, 0xf8, ...encode({ 1: 1 })]] });
    await stopNativeLivestream(transport);
    expect(sent[0].payload).toEqual([0x01, 1, 0]);
    expect(sent[1].payload[0]).toBe(0xf1);
    expect(sent[1].payload[1]).toBe(0x78);
  });
});
