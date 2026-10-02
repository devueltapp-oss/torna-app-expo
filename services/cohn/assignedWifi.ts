import {fetchCameraConfigs, type ClubCamera, type CameraConfig} from '../../api/cameras';
import {assertClub, type ClubIdentity, type CohnCredentials} from './provision';
import type {CameraBluetoothSession} from './bluetooth';

export function assignedCameraWifi(camera: ClubCamera, configs: CameraConfig[]): CameraConfig | undefined {
  if (camera.wifiSsid && typeof camera.wifiPassword === 'string') return {id:camera.cameraConfigId ?? '',name:camera.wifiSsid,wifiSsid:camera.wifiSsid,wifiPassword:camera.wifiPassword};
  if (camera.cameraConfig?.wifiSsid && typeof camera.cameraConfig.wifiPassword === 'string') return camera.cameraConfig;
  return configs.find(config => config.id === camera.cameraConfigId);
}

/** Reuse COHN first. Only configure the camera's assigned WiFi when disconnected. */
export async function prepareAssignedNetwork(user: ClubIdentity, camera: ClubCamera, session: CameraBluetoothSession,
  signal: AbortSignal, progress: (message:string)=>void): Promise<CohnCredentials> {
  assertClub(user);
  if (signal.aborted) throw new Error('Conexión cancelada.');
  progress('Comprobando el enlace WiFi de la cámara…');
  const existing = await session.readNetwork();
  if (signal.aborted) throw new Error('Conexión cancelada.');
  if (existing) return existing;
  const assigned = assignedCameraWifi(camera,[]) ?? assignedCameraWifi(camera,await fetchCameraConfigs(user));
  if (!assigned) throw new Error('Esta cámara no tiene una red WiFi asignada. Configurá su WiFi antes de previsualizar.');
  if (signal.aborted) throw new Error('Conexión cancelada.');
  progress('Conectando la cámara a su WiFi asignado…');
  return session.configureWifi(assigned.wifiSsid,assigned.wifiPassword,signal,progress);
}
