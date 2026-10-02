import { Buffer } from 'buffer';
import { decode, encode, numberField, textField, type Fields } from './protocol';
// `assertClub`/`ClubIdentity` viven en un módulo neutro (2026-10-02): además
// de COHN, `api/games.ts` (crear/cancelar partidas como club) ahora los usa
// también. Re-exportados acá para no romper el único import existente
// (`api/cameras.ts`).
export { assertClub, type ClubIdentity } from '../../lib/assertClub';

export interface CohnCredentials { ipAddress: string; username: string; password: string; certificate: string }
export type CohnChannel = 'command' | 'query' | 'network';
export interface CohnTransport {
  send(channel: CohnChannel, payload: number[]): Promise<void>;
  receive(channel: CohnChannel, timeoutMs?: number): Promise<number[]>;
}

export function success(fields: Fields, step: string) {
  const result = numberField(fields, 1);
  if (result !== 1) throw new Error(`La GoPro rechazó ${step} (código ${result ?? 'ausente'}).`);
}

export async function response(t: CohnTransport, channel: CohnChannel, feature: number, actions: number[], deadline: number) {
  while (Date.now() < deadline) {
    const bytes = await t.receive(channel, Math.max(1, deadline - Date.now()));
    if (bytes[0] === feature && actions.includes(bytes[1])) return { action: bytes[1], fields: decode(bytes.slice(2)) };
  }
  throw new Error('La GoPro no respondió a tiempo.');
}

export async function request(t: CohnTransport, channel: CohnChannel, feature: number, action: number, fields: Record<number, number | string | number[]> = {}, timeout = 30000) {
  await t.send(channel, [feature, action, ...encode(fields)]);
  return (await response(t, channel, feature, [action | 0x80], Date.now() + timeout)).fields;
}

/** Shared by COHN provisioning and the native livestream flow: both need the camera on WiFi. */
export async function syncDate(t: CohnTransport): Promise<void> {
  const now = new Date(); const offset = -now.getTimezoneOffset();
  await t.send('command', [0x0f, 10, now.getFullYear() >> 8, now.getFullYear() & 255,
    now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), (offset >> 8) & 255, offset & 255, 0]);
  const dateResponse = await t.receive('command');
  if (dateResponse[0] !== 0x0f || dateResponse[1] !== 0) throw new Error('La GoPro rechazó el ajuste de fecha.');
}

/** Scan + connect over the NETWORK_MANAGEMENT channel. Does not touch COHN. */
export async function joinWifi(t: CohnTransport, ssid: string, password: string, progress: (message: string) => void): Promise<void> {
  if (!ssid || Buffer.byteLength(ssid, 'utf8') > 32 || Buffer.byteLength(password, 'utf8') > 63) {
    throw new Error('Revisá el nombre y la contraseña del WiFi.');
  }
  progress('Buscando el WiFi desde la cámara…');
  success(await request(t, 'network', 2, 2), 'el escaneo WiFi');
  const scanDeadline = Date.now() + 45000;
  let scan: Fields;
  while (true) {
    scan = (await response(t, 'network', 2, [0x0b], scanDeadline)).fields;
    const state = numberField(scan, 1);
    if (state === 5) break;
    if (state !== 2) throw new Error('La cámara no pudo buscar las redes WiFi.');
  }
  const scanId = numberField(scan, 2); const total = numberField(scan, 3);
  if (scanId === undefined || total === undefined || total > 1000) throw new Error('Resultado de escaneo WiFi inválido.');
  let entry: Fields | undefined;
  for (let index = 0; index < total && !entry; index += 20) {
    const list = await request(t, 'network', 2, 3, { 1: index, 2: Math.min(20, total - index), 3: scanId });
    success(list, 'la consulta de redes');
    entry = (list.get(3) ?? []).filter((v): v is number[] => Array.isArray(v)).map(decode).find((e) => textField(e, 1) === ssid);
  }
  if (!entry) throw new Error('La cámara no encontró ese WiFi. Verificá el nombre y la cobertura.');
  const flags = numberField(entry, 5) ?? 0;
  if (flags & 16) throw new Error('La GoPro no admite la seguridad de esta red WiFi.');
  progress('Conectando la GoPro al WiFi…');
  const action = flags & 2 ? 4 : 5;
  success(await request(t, 'network', 2, action, action === 4 ? { 1: ssid } : { 1: ssid, 2: password }), 'la conexión WiFi');
  const networkDeadline = Date.now() + 90000;
  while (true) {
    const state = numberField((await response(t, 'network', 2, [0x0c], networkDeadline)).fields, 1);
    if (state === 5 || state === 6) break;
    if (state === 8) throw new Error('La GoPro rechazó la contraseña del WiFi.');
    if (state !== 2) throw new Error(`La GoPro no pudo conectarse al WiFi (estado ${state}).`);
  }
}

/** Provision only over BLE. Credentials are returned to the authenticated caller, never logged. */
export async function provision(t: CohnTransport, ssid: string, password: string, progress: (message: string) => void): Promise<CohnCredentials> {
  progress('Sincronizando la fecha de la cámara…');
  await syncDate(t);
  await joinWifi(t, ssid, password, progress);

  progress('Preparando el enlace de red…');
  let status = await request(t, 'query', 0xf5, 0x6f, { 1: 0 });
  // Reuse a valid certificate; do not invalidate credentials another desktop already uses.
  if (numberField(status, 1) !== 1) success(await request(t, 'command', 0xf1, 0x67), 'la creación del certificado');
  if (numberField(status, 6) === 0) success(await request(t, 'command', 0xf1, 0x65, { 1: 1 }), 'la activación de COHN');
  const cohnDeadline = Date.now() + 60000;
  do {
    status = await request(t, 'query', 0xf5, 0x6f, { 1: 0 });
    if (numberField(status, 1) === 1 && numberField(status, 2) === 27) break;
    if (Date.now() >= cohnDeadline) throw new Error('COHN no quedó conectado al WiFi.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } while (true);
  const statusSsid = textField(status, 7);
  if (statusSsid && statusSsid !== ssid) throw new Error('La cámara se conectó a otra red WiFi.');
  const cert = await request(t, 'query', 0xf5, 0x6e);
  success(cert, 'la lectura del certificado');
  const credentials = { ipAddress: textField(status, 5), username: textField(status, 3), password: textField(status, 4), certificate: textField(cert, 2) };
  if (!credentials.username || !credentials.password || !credentials.ipAddress || !credentials.certificate.includes('-----BEGIN CERTIFICATE-----')) {
    throw new Error('La cámara devolvió credenciales incompletas.');
  }
  return credentials;
}

/** Read an existing network link without changing WiFi or rotating its certificate. */
export async function readExistingCohn(t: CohnTransport): Promise<CohnCredentials | null> {
  const status = await request(t, 'query', 0xf5, 0x6f, { 1: 0 });
  if (numberField(status, 1) !== 1 || numberField(status, 2) !== 27) return null;
  const cert = await request(t, 'query', 0xf5, 0x6e);
  success(cert, 'la lectura del certificado');
  const credentials = { ipAddress: textField(status, 5), username: textField(status, 3), password: textField(status, 4), certificate: textField(cert, 2) };
  if (!credentials.ipAddress || !credentials.username || !credentials.password || !credentials.certificate.includes('-----BEGIN CERTIFICATE-----')) throw new Error('El enlace WiFi está incompleto. Volvé a configurar la red de la cámara.');
  return credentials;
}
