import { fragment, PacketAssembler, encode, decode, textField } from '../cohn/protocol';
import { assertClub, provision, type CohnTransport } from '../cohn/provision';

describe('COHN móvil', () => {
  it('rechaza players y sesiones cerradas antes de tocar Bluetooth', async () => {
    expect(() => assertClub(null)).toThrow(/club/);
    expect(() => assertClub({ id: 'p', isClub: false })).toThrow(/club/);
    expect(() => assertClub({ id: 'c', isClub: true })).not.toThrow();
  });

  it('reconstruye un certificado fragmentado y conserva SSID Unicode', () => {
    const bytes = encode({ 1: 'WiFi Pádel', 2: 'x'.repeat(1200) });
    const assembler = new PacketAssembler();
    let result: number[] | undefined;
    for (const packet of fragment(bytes)) {
      expect(packet.length).toBeLessThanOrEqual(20);
      result = assembler.push(packet);
    }
    expect(result).toEqual(bytes);
    expect(textField(decode(result!), 1)).toBe('WiFi Pádel');
    expect(() => new PacketAssembler().push([0x80, 1])).toThrow();
    expect(() => decode([0x12, 20, 1])).toThrow();
  });

  it.each([false, true])('enlaza una red configurada=%s y obtiene credenciales', async (configured) => {
    const requests: number[][] = [];
    const replies = [
      [0x0f, 0],
      [2, 0x82, ...encode({ 1: 1 })],
      [2, 0x0b, ...encode({ 1: 5, 2: 7, 3: 1 })],
      [2, 0x83, ...encode({ 1: 1, 3: encode({ 1: 'Jeyu', 5: configured ? 2 : 1 }) })],
      [2, configured ? 0x84 : 0x85, ...encode({ 1: 1 })],
      [2, 0x0c, ...encode({ 1: configured ? 6 : 5 })],
      [0xf5, 0xef, ...encode({ 1: 0, 2: 5 })],
      [0xf1, 0xe7, ...encode({ 1: 1 })],
      [0xf5, 0xef, ...encode({ 1: 1, 2: 27, 3: 'u', 4: 'p', 5: '192.168.1.2', 7: 'Jeyu' })],
      [0xf5, 0xee, ...encode({ 1: 1, 2: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----' })],
    ];
    const transport: CohnTransport = {
      send: async (_, payload) => { requests.push(payload); },
      receive: async () => replies.shift()!,
    };
    const creds = await provision(transport, 'Jeyu', 'secret', () => {});
    expect(creds.ipAddress).toBe('192.168.1.2');
    expect(requests.some((p) => p[0] === 2 && p[1] === (configured ? 4 : 5))).toBe(true);
    expect(requests.some((p) => p[0] === 0xf1 && p[1] === 0x66)).toBe(false);
  });

  it('propaga un rechazo de la GoPro sin emitir credenciales', async () => {
    const transport: CohnTransport = { send: async () => {}, receive: async () => [0x0f, 2] };
    await expect(provision(transport, 'Jeyu', 'secret', () => {})).rejects.toThrow(/fecha/);
  });
});
