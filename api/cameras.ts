import * as SecureStore from 'expo-secure-store';
import { assertClub, type ClubIdentity, type CohnCredentials } from '../services/cohn/provision';

export interface ClubCamera {
  id: string; identifier: string; bleName: string | null; cameraConfigId?: string | null; cameraConfig?: CameraConfig | null; wifiSsid?: string; wifiPassword?: string;
  // Transmisión nativa (RTMP directo de la cámara, sin relay del teléfono). Ya los
  // devuelve `GET /camera` y `GET /game/:id/cameras` (los usa el desktop para su
  // propio pipeline de encoding); acá solo se tipan para leerlos, nunca se escriben.
  rtmpServer?: string | null; resolution?: string | null; lens?: string | null;
  minBitRate?: number | null; maxBitRate?: number | null; startingBitRate?: number | null;
}
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

async function request<T>(user: ClubIdentity | null, path: string, body?: CohnCredentials | {cameraConfigId: string}, signal?: AbortSignal, method?: 'PATCH'): Promise<T> {
  assertClub(user);
  const token = await SecureStore.getItemAsync('torna_auth_token');
  if (!token) throw new Error('Volvé a iniciar sesión.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: method ?? (body ? 'PUT' : 'GET'), signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) throw new Error(res.status === 403 ? 'No tenés permiso para administrar esta cámara.' : `No se pudo comunicar con Torna (${res.status}).`);
    const json: { data?: T } & T = await res.json();
    return json.data ?? json;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

export async function fetchClubCameras(user: ClubIdentity | null): Promise<ClubCamera[]> {
  // Same authenticated, club-scoped endpoint used by Torna Desktop.
  const cameras = await request<ClubCamera[]>(user, '/camera');
  if (!Array.isArray(cameras)) throw new Error('Torna devolvió una lista de cámaras inválida.');
  return cameras;
}

export async function saveCameraCohn(user: ClubIdentity | null, cameraId: string, credentials: CohnCredentials, signal?: AbortSignal): Promise<void> {
  assertClub(user);
  // Refetch before writing: never accept an arbitrary camera ID from navigation or BLE.
  const cameras = await fetchClubCameras(user);
  if (signal?.aborted) throw new Error('Guardado cancelado.');
  if (!cameras.some((camera) => camera.id === cameraId)) throw new Error('La cámara no pertenece a las cámaras disponibles de tu club.');
  await request(user, `/camera/${encodeURIComponent(cameraId)}/cohn`, credentials, signal);
}

/**
 * Configuraciones de WiFi guardadas — `CameraConfig` (2026-10-02), la misma
 * entidad que usa `CameraDialog.jsx` del desktop con su `<Select>`
 * "Configuración WiFi" + "Nueva configuración WiFi…". Reemplaza el campo
 * libre de SSID/password que tenía "Enlazar GoPro": ahora se elige una
 * config existente (relación WiFi → cámara → cancha) o se crea una nueva.
 * ⚠️ El backend devuelve `wifiPassword` en texto plano (igual que el
 * desktop) — no se loguea ni se muestra sin ocultar, mismo criterio que las
 * credenciales COHN.
 */
export interface CameraConfig { id: string; name: string; wifiSsid: string; wifiPassword: string }

async function configRequest<T>(user: ClubIdentity | null, method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  assertClub(user);
  const token = await SecureStore.getItemAsync('torna_auth_token');
  if (!token) throw new Error('Volvé a iniciar sesión.');
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(res.status === 403 ? 'No tenés permiso para administrar configuraciones de WiFi.' : `No se pudo comunicar con Torna (${res.status}).`);
  const json: { data?: T } & T = await res.json();
  return json.data ?? json;
}

export async function fetchCameraConfigs(user: ClubIdentity | null): Promise<CameraConfig[]> {
  const configs = await configRequest<CameraConfig[]>(user, 'GET', '/camera-config');
  if (!Array.isArray(configs)) throw new Error('Torna devolvió una lista de configuraciones inválida.');
  return configs;
}

export function createCameraConfig(
  user: ClubIdentity | null,
  input: { name: string; wifiSsid: string; wifiPassword: string },
): Promise<CameraConfig> {
  return configRequest<CameraConfig>(user, 'POST', '/camera-config', input);
}

export async function fetchCameraCohn(user: ClubIdentity | null, cameraId: string): Promise<CohnCredentials | null> {
  const cameras = await fetchClubCameras(user);
  if (!cameras.some(c => c.id === cameraId)) throw new Error('La cámara no pertenece a tu club.');
  const result = await request<{provisioned: boolean; credentials: CohnCredentials | null}>(user, `/camera/${encodeURIComponent(cameraId)}/cohn`);
  return result.provisioned ? result.credentials : null;
}

/** Change only this camera's assignment, never edit the shared WiFi configuration. */
export async function assignCameraWifi(user: ClubIdentity | null, cameraId: string, cameraConfigId: string, signal?: AbortSignal): Promise<void> {
  assertClub(user);
  const [cameras, configs] = await Promise.all([fetchClubCameras(user), fetchCameraConfigs(user)]);
  if (!cameras.some(c => c.id === cameraId) || !configs.some(c => c.id === cameraConfigId)) throw new Error('La cámara y la red deben pertenecer a tu club.');
  if (signal?.aborted) throw new Error('Guardado cancelado.');
  await request(user, '/camera/' + encodeURIComponent(cameraId), {cameraConfigId}, signal, 'PATCH');
}
