// Open GoPro packet framing and the protobuf wire types used by COHN.
// https://gopro.github.io/OpenGoPro/docs/ble/protocol/data_protocol/
import { Buffer } from 'buffer';

export type Fields = Map<number, Array<number | number[]>>;

function varint(value: number): number[] {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Valor protobuf inválido.');
  const result: number[] = [];
  do {
    const byte = value % 128;
    value = Math.floor(value / 128);
    result.push(byte | (value ? 0x80 : 0));
  } while (value);
  return result;
}

export function encode(fields: Record<number, number | string | number[]>): number[] {
  return Object.entries(fields).flatMap(([key, value]) => {
    if (typeof value === 'number') return [...varint(Number(key) * 8), ...varint(value)];
    const bytes = typeof value === 'string' ? [...Buffer.from(value, 'utf8')] : value;
    return [...varint(Number(key) * 8 + 2), ...varint(bytes.length), ...bytes];
  });
}

export function decode(bytes: number[]): Fields {
  const fields: Fields = new Map();
  let index = 0;
  const read = () => {
    let result = 0;
    for (let shift = 0; shift < 49; shift += 7) {
      if (index >= bytes.length) throw new Error('Respuesta protobuf truncada.');
      const byte = bytes[index++];
      result += (byte & 0x7f) * 2 ** shift;
      if (!(byte & 0x80)) return result;
    }
    throw new Error('Varint protobuf inválido.');
  };
  while (index < bytes.length) {
    const key = read(); const field = Math.floor(key / 8); const wire = key % 8;
    if (!field) throw new Error('Campo protobuf inválido.');
    let value: number | number[];
    if (wire === 0) value = read();
    else {
      const length = wire === 2 ? read() : wire === 1 ? 8 : wire === 5 ? 4 : -1;
      if (length < 0 || index + length > bytes.length) throw new Error('Respuesta protobuf inválida.');
      value = bytes.slice(index, index + length); index += length;
    }
    fields.set(field, [...(fields.get(field) ?? []), value]);
  }
  return fields;
}

export function numberField(fields: Fields, key: number): number | undefined {
  const value = fields.get(key)?.[0];
  return typeof value === 'number' ? value : undefined;
}

export function textField(fields: Fields, key: number): string {
  const value = fields.get(key)?.[0];
  return Array.isArray(value) ? Buffer.from(value).toString('utf8') : '';
}

export function fragment(payload: number[]): number[][] {
  if (!payload.length || payload.length > 8191) throw new Error('Paquete GoPro demasiado grande.');
  const packets = [[0x20 | (payload.length >> 8), payload.length & 0xff, ...payload.slice(0, 18)]];
  for (let offset = 18; offset < payload.length; offset += 19) packets.push([0x80, ...payload.slice(offset, offset + 19)]);
  return packets;
}

export class PacketAssembler {
  private length = 0;
  private bytes: number[] = [];
  push(packet: number[]): number[] | undefined {
    if (!packet.length) throw new Error('Paquete BLE vacío.');
    const first = packet[0]; let header = 1;
    if (first & 0x80) {
      if (!this.length) throw new Error('Continuación BLE sin cabecera.');
    } else {
      const format = (first >> 5) & 3;
      header = format + 1;
      if (format === 3 || packet.length < header) throw new Error('Cabecera BLE inválida.');
      this.length = format === 0 ? first & 31 : format === 1 ? ((first & 31) << 8) | packet[1] : (packet[1] << 8) | packet[2];
      this.bytes = [];
      if (!this.length || this.length > 16384) throw new Error('Respuesta BLE demasiado grande.');
    }
    this.bytes.push(...packet.slice(header));
    if (this.bytes.length > this.length) throw new Error('Longitud BLE incorrecta.');
    if (this.bytes.length !== this.length) return undefined;
    const complete = this.bytes; this.bytes = []; this.length = 0;
    return complete;
  }
}
