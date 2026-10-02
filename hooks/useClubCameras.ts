import { useEffect, useRef, useState } from 'react';
import { assignedCameraWifi } from '../services/cohn/assignedWifi';
import { AppState } from 'react-native';
import { fetchClubCameras, saveCameraCohn, assignCameraWifi, fetchCameraConfigs, createCameraConfig, type ClubCamera, type CameraConfig } from '../api/cameras';
import { provisionFromPhone, type CameraBluetoothSession } from '../services/cohn/bluetooth';
import type { ClubIdentity, CohnCredentials } from '../services/cohn/provision';

export function useClubCameras(user: ClubIdentity, options?: { cameraId: string; onLinked: () => void; connection?: CameraBluetoothSession }) {
  const [cameras, setCameras] = useState<ClubCamera[]>([]);
  const [selected, setSelected] = useState<ClubCamera>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // Config de WiFi elegida (2026-10-02): ya no se tipea SSID/password a mano —
  // se elige una `CameraConfig` guardada (relación WiFi → cámara → cancha,
  // mismo modelo que `CameraDialog.jsx` del desktop) o se crea una nueva.
  // `ssid`/`password` siguen siendo el dato que de verdad usa el enlace BLE
  // (`provisionFromPhone`) — ahora se completan solos al elegir la config.
  const [configs, setConfigs] = useState<CameraConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [selectedConfigId, setSelectedConfigId] = useState<string>();
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [stopped, setStopped] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<{ cameraId: string; credentials: CohnCredentials; configId?: string }>();
  const controller = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(true);
  const running = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (state) => {
      // iOS is inactive during system pairing / permission dialogs; do not cancel those.
      if (state === 'background') controller.current?.abort();
    });
    return () => { mounted.current = false; controller.current?.abort(); subscription.remove(); };
  }, []);

  const load = async () => {
    setLoading(true); setError('');
    try { const result = await fetchClubCameras(user); if (mounted.current) {
      const available = options ? result.filter(c => c.id === options.cameraId) : result;
      setCameras(available); if (options) setSelected(available[0]);
    } }
    catch { if (mounted.current) setError('No se pudieron cargar las cámaras de tu club.'); }
    finally { if (mounted.current) setLoading(false); }
  };
  useEffect(() => { void load(); }, [user.id]);

  const loadConfigs = async () => {
    setConfigsLoading(true);
    try { const result = await fetchCameraConfigs(user); if (mounted.current) setConfigs(result); }
    catch { if (mounted.current) setConfigs([]); }
    finally { if (mounted.current) setConfigsLoading(false); }
  };
  useEffect(() => { void loadConfigs(); }, [user.id]);

  useEffect(() => {
    if (!selected || busy || pending || selectedConfigId) return;
    const assigned = assignedCameraWifi(selected, configs);
    if (assigned) { setSelectedConfigId(assigned.id || undefined); setSsid(assigned.wifiSsid); setPassword(assigned.wifiPassword); }
  }, [selected, configs, busy, pending, selectedConfigId]);

  const selectConfig = (configId: string) => {
    if (running.current || pending) return;
    const config = configs.find((c) => c.id === configId);
    if (!config) return;
    setSelectedConfigId(configId); setSsid(config.wifiSsid); setPassword(config.wifiPassword);
  };

  const createConfig = async (input: { name: string; wifiSsid: string; wifiPassword: string }) => {
    const created = await createCameraConfig(user, input);
    if (mounted.current) {
      setConfigs((previous) => [...previous, created]);
      setSelectedConfigId(created.id); setSsid(created.wifiSsid); setPassword(created.wifiPassword);
    }
    return created;
  };

  const start = async () => {
    if (running.current || (!selected && !pending)) return;
    running.current = true; setBusy(true); setError('');
    const abort = new AbortController(); controller.current = abort;
    const progress = (message: string) => { if (mounted.current) setStatus(message); };
    try {
      let result = pending;
      if (!result) {
        if (!stopped) throw new Error('Detené el preview y la transmisión antes de enlazar.');
        const camera = selected!;
        const owned = await fetchClubCameras(user);
        if (!owned.some((c) => c.id === camera.id && c.bleName === camera.bleName)) throw new Error('La configuración de esta cámara cambió. Volvé a cargar la lista.');
        const credentials = options?.connection
          ? await options.connection.configureWifi(ssid, password, abort.signal, progress)
          : await provisionFromPhone(user, camera.bleName ?? '', ssid, password, abort.signal, progress);
        await options?.connection?.close();
        result = { cameraId: camera.id, credentials, configId: selectedConfigId };
        if (!mounted.current) return;
        setPending(result); setPassword('');
      }
      if (!mounted.current || abort.signal.aborted) return;
      progress('Guardando el enlace en Torna…');
      if (result.configId) await assignCameraWifi(user, result.cameraId, result.configId, abort.signal);
      await saveCameraCohn(user, result.cameraId, result.credentials, abort.signal);
      if (mounted.current) {
        const linkedCameraId = result.cameraId;
        setLinked((previous) => new Set([...previous, linkedCameraId]));
        setPending(undefined); setStopped(false);
        setSelected(undefined); setSelectedConfigId(undefined);
        setStatus('WiFi asignado y cámara conectada. La próxima conexión usará esta red.');
        options?.onLinked();
      }
    } catch (e) {
      if (mounted.current) { setStatus(''); setError(e instanceof Error ? e.message : 'No se pudo completar el enlace.'); }
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { cameras, selected, loading, busy, ssid, stopped, status, error, linked, pending: !!pending,
    configs, configsLoading, selectedConfigId, selectConfig, createConfig,
    setStopped, load, start,
    select: (camera: ClubCamera) => {
      if (running.current || pending) return;
      setSelected(camera); setSelectedConfigId(undefined); setSsid(''); setPassword(''); setStopped(false); setStatus(''); setError('');
    },
    cancel: () => controller.current?.abort(),
  };
}
