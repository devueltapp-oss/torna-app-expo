import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme';
import { fetchClubGames, fetchClubGameCameras, prepareClubGame, setGameLiveStatus, type BackendClubGame } from '../api/games';
import { fetchClubCameras, fetchCameraCohn, fetchCameraConfigs, saveCameraCohn, type ClubCamera } from '../api/cameras';
import { LocalCameraPreview } from './LocalCameraPreview';
import { useClubCameras } from '../hooks/useClubCameras';
import { ClubCamerasScreen } from '../screens/ClubCamerasScreen';
import type { CohnCredentials, ClubIdentity } from '../services/cohn/provision';
import { connectCameraFromPhone, type CameraBluetoothSession } from '../services/cohn/bluetooth';
import { assignedCameraWifi, prepareAssignedNetwork } from '../services/cohn/assignedWifi';
import { formatClubTime } from '../lib/clubTime';

/**
 * Enlazar por BLE SIN salir de "Preparar partida" (2026-10-03, pedido
 * explícito: "no tener que perder el foco entre vistas"). Antes "Conectar
 * cámara al WiFi" navegaba a la ruta `ClubCameras` completa — un screen
 * aparte, con su propio `goBack`. Ahora es el MISMO componente
 * (`ClubCamerasScreen`) pero montado inline, reemplazando momentáneamente
 * esta vista en vez de empujar una ruta nueva: `useClubCameras` vive en un
 * componente chico propio (no se puede llamar un hook condicionalmente
 * dentro de `Preparation`) que se monta/desmonta según `linking`.
 */
function InlineCameraLink({ user, cameraId, onClose, connection }: { user: ClubIdentity; cameraId: string; onClose: () => void; connection?: CameraBluetoothSession }) {
  const state = useClubCameras(user, { cameraId, onLinked: onClose, connection });
  return <ClubCamerasScreen {...state} onBack={onClose} />;
}

export function ClubPrepareGameContainer({ route, navigation }: { route: any; navigation: any }) {
  const { user } = useAuth();
  return user?.isClub === true ? <Preparation key={`${user.id}:${route.params.gameId}`} user={user} gameId={route.params.gameId} navigation={navigation} /> : null;
}

function Preparation({ user, gameId, navigation }: { user: { id: string; isClub: boolean }; gameId: string; navigation: any }) {
  const { colors } = useTheme();
  const [game, setGame] = useState<BackendClubGame>();
  const [cameras, setCameras] = useState<ClubCamera[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [prepared, setPrepared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState<string[]>([]);
  const [networkReady, setNetworkReady] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ camera: ClubCamera; credentials: CohnCredentials }>();
  const [linking, setLinking] = useState<ClubCamera>();
  const [bluetoothCameraId, setBluetoothCameraId] = useState<string>();
  const [bluetoothStatus, setBluetoothStatus] = useState('');
  const connection = useRef<CameraBluetoothSession | undefined>(undefined);
  const connectionAbort = useRef<AbortController | undefined>(undefined);
  const closeBluetooth = () => {
    connectionAbort.current?.abort();
    const previous = connection.current; connection.current = undefined;
    return previous?.close().catch(() => {});
  };
  const mounted = useRef(true);
  const running = useRef(false);
  useEffect(() => { mounted.current = true; const subscription = AppState.addEventListener('change', state => { if (state === 'background') void closeBluetooth(); }); return () => { mounted.current = false; subscription.remove(); void closeBluetooth(); }; }, []);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [games, owned, attached, configs] = await Promise.all([fetchClubGames(user.id), fetchClubCameras(user), fetchClubGameCameras(user, gameId), fetchCameraConfigs(user).catch(() => [])]);
      const found = games.find(g => g.gameId === gameId);
      if (!found) throw new Error('Esta partida no está disponible en tu club.');
      if (!mounted.current) return;
      setGame(found); setCameras(owned.map(camera => {
        const merged = {...camera, ...attached.find(c => c.id === camera.id)};
        const wifi = assignedCameraWifi(merged, configs);
        return wifi ? {...merged, wifiSsid: wifi.wifiSsid, wifiPassword: wifi.wifiPassword} : merged;
      }));
      const ids = attached.filter(c => owned.some(o => o.id === c.id)).map(c => c.id);
      setSelected(ids); setPrepared(!found.isReservation && ids.length > 0);
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'No se pudo cargar la partida.'); }
    finally { if (mounted.current) setLoading(false); }
  }, [user.id, gameId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => navigation.addListener('blur', () => { void closeBluetooth(); setPreview(undefined); setLinking(undefined); }), [navigation]);
  // STOPPED no es terminal (2026-10-03): es una cámara que nunca se conectó o
  // se cortó, no una partida que terminó. El horario sigue siendo válido y el
  // club tiene que poder volver a enganchar la cámara desde acá.
  const terminal = game && ['FINISHED', 'CANCELLED'].includes(game.gameStatus);
  const live = game?.gameStatus === 'LIVE';
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  };
  const ensureAvailable = async (cameraId?: string) => {
    const games = await fetchClubGames(user.id);
    const fresh = games.find(g => g.gameId === gameId);
    if (!fresh || !['SCHEDULED', 'WAITING', 'STOPPED'].includes(fresh.gameStatus)) throw new Error('El estado de la partida cambió. Actualizá antes de preparar sus cámaras.');
    if (cameraId) {
      const activeCameras = await Promise.all(games.filter(g => g.gameStatus === 'LIVE').map(g => fetchClubGameCameras(user, g.gameId)));
      if (activeCameras.flat().some(c => c.id === cameraId)) throw new Error('Esta cámara está transmitiendo otra partida. Elegí una cámara libre.');
    }
  };
  const connectForCamera = async (camera: ClubCamera) => {
    if (bluetoothCameraId === camera.id && connection.current) return connection.current;
    await closeBluetooth();
    if (!mounted.current) throw new Error('Conexión cancelada.');
    const abort = new AbortController(); connectionAbort.current = abort;
    const session = await connectCameraFromPhone(user, camera.bleName ?? '', abort.signal,
      message => { if (mounted.current) setBluetoothStatus(message); },
      () => { if (mounted.current) { setBluetoothCameraId(undefined); setBluetoothStatus(''); } });
    if (!mounted.current || abort.signal.aborted) { await session.close(); throw new Error('Conexión cancelada.'); }
    connection.current = session; setBluetoothCameraId(camera.id);
    setBluetoothStatus('Bluetooth listo. Se usará el WiFi asignado a la cámara.');
    return session;
  };
  const prepareNetwork = async (camera: ClubCamera) => {
    const session = await connectForCamera(camera);
    const credentials = await prepareAssignedNetwork(user, camera, session, connectionAbort.current!.signal,
      message => { if (mounted.current) setBluetoothStatus(message); });
    // Do not close a useful BLE session when network setup failed.
    await closeBluetooth();
    try { await saveCameraCohn(user, camera.id, credentials); }
    catch { if (mounted.current) setError('La cámara está lista, pero no se pudo guardar el enlace en Torna. El preview local puede continuar.'); }
    if (mounted.current) setNetworkReady(ids => ids.includes(camera.id) ? ids : [...ids, camera.id]);
    return credentials;
  };
  // Dispara el livestream nativo de la cámara (RTMP directo a Wowza, sin relay por el
  // teléfono) y SOLO si la cámara confirma que está transmitiendo, marca la partida EN
  // VIVO — mismo endpoint que usa Desktop (`PUT /game/live/:id/start`), que es quien
  // dispara STREAMING_STARTED hacia los seguidores. Si algo falla antes de esa
  // confirmación, no se notifica a nadie.
  const goLive = async (camera: ClubCamera) => {
    await ensureAvailable(camera.id);
    if (!camera.wifiSsid || !camera.wifiPassword) throw new Error('Esta cámara no tiene un WiFi asignado. Conectala al WiFi antes de transmitir.');
    if (!camera.rtmpServer) throw new Error('Esta cámara no tiene un servidor de transmisión configurado. Contactá al administrador de Torna.');
    const session = await connectForCamera(camera);
    await session.goLive({ ssid: camera.wifiSsid, password: camera.wifiPassword },
      { url: camera.rtmpServer, resolution: camera.resolution, lens: camera.lens, minBitRate: camera.minBitRate, maxBitRate: camera.maxBitRate, startingBitRate: camera.startingBitRate },
      connectionAbort.current!.signal,
      message => { if (mounted.current) setBluetoothStatus(message); });
    await setGameLiveStatus(user, gameId, 'start');
    await load();
  };
  const button = (label: string, onPress: () => void, disabled = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={{ minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: colors.bg2, opacity: disabled ? 0.45 : 1 }}>
    <Text style={{ color: colors.accentText, fontWeight: '700' }}>{label}</Text>
  </Pressable>;
  // Enlazar reemplaza esta vista entera (no navega): al cerrar, recarga para
  // traer las credenciales COHN recién guardadas — así "Previsualizar" en la
  // misma cámara, un toque después, ya las encuentra.
  if (linking) return <InlineCameraLink user={user} cameraId={linking.id} connection={bluetoothCameraId === linking.id ? connection.current : undefined} onClose={() => { setLinking(undefined); void load(); }} />;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      {button('Volver a las partidas', () => navigation.goBack(), busy)}
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Preparar partida</Text>
      {game && <Text style={{ color: colors.muted2 }}>{game.courtName ?? game.court ?? 'Cancha'} · {formatClubTime(game.scheduledStartAt)}</Text>}
      {loading ? <ActivityIndicator accessibilityLabel="Cargando partida" /> : <>
        {!!error && <Text accessibilityRole="alert" style={{ color: colors.text }}>{error}</Text>}
        {/permit|permiso/i.test(error) && button('Abrir permisos de la app', () => { void Linking.openSettings(); })}
        {!game && button('Reintentar', () => void load())}
        {(live || terminal) ? <>
          <Text style={{ color: colors.text }}>{live ? 'La partida ya está en vivo. Abrí su transmisión para verla.' : 'Esta partida ya terminó o fue cancelada.'}</Text>
          {button('Ver partida', () => navigation.navigate('GameDetail', { gameId }))}
        </> : game && <>
          <Text style={{ color: colors.muted2 }}>1. Conectá por Bluetooth · 2. Prepará el WiFi · 3. Revisá el encuadre</Text>
          {preview ? <LocalCameraPreview user={user} credentials={preview.credentials} name={preview.camera.identifier}
            onClose={() => setPreview(undefined)} onFrame={() => setVerified(ids => ids.includes(preview.camera.id) ? ids : [...ids, preview.camera.id])}
            onGoLive={() => { const camera = preview.camera; setPreview(undefined); void run(() => goLive(camera)); }} /> : <>
            {!prepared && <>
              <Text style={{ color: colors.text }}>Cámaras para esta partida</Text>
              {cameras.map(camera => <Pressable key={camera.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(camera.id), disabled: busy }} disabled={busy}
                onPress={() => setSelected(ids => ids.includes(camera.id) ? ids.filter(id => id !== camera.id) : [...ids, camera.id])}
                style={{ borderWidth: 1, borderColor: selected.includes(camera.id) ? colors.accentText : colors.line, borderRadius: 12, padding: 16 }}>
                <Text style={{ color: colors.text }}>{selected.includes(camera.id) ? '✓ ' : ''}{camera.identifier}</Text>
              </Pressable>)}
              {!cameras.length && <Text style={{ color: colors.muted2 }}>No hay cámaras registradas en tu club. Agregá una cámara antes de preparar la partida.</Text>}
              {button('Iniciar preparación de cámaras', () => void run(async () => { await ensureAvailable(); await prepareClubGame(user, gameId, selected); if (mounted.current) setPrepared(true); }), busy || !selected.length)}
            </>}
            {prepared && cameras.filter(c => selected.includes(c.id)).map(camera => <View key={camera.id} style={{ padding: 16, gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 14 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{camera.identifier}</Text>
              <Text style={{ color: colors.muted2 }}>{verified.includes(camera.id) ? '✓ Imagen recibida en este teléfono' : 'Conectá la cámara o probá su enlace guardado.'}</Text>
              <Text accessibilityLiveRegion="polite" style={{color: colors.muted2}}>{bluetoothCameraId === camera.id ? 'Bluetooth conectado' : 'Bluetooth desconectado'}</Text>
              {!!bluetoothStatus && <Text accessibilityLiveRegion="polite" style={{color: colors.muted2}}>{bluetoothStatus}</Text>}
              {button(bluetoothCameraId === camera.id ? 'Desconectar Bluetooth' : 'Conectar cámara por Bluetooth', () => void run(async () => {
                if (bluetoothCameraId === camera.id) { await closeBluetooth(); return; }
                await ensureAvailable(camera.id);
                await connectForCamera(camera);
              }), busy)}
              {busy && button('Cancelar conexión', () => connectionAbort.current?.abort())}
              {networkReady.includes(camera.id) && <Text accessibilityLiveRegion="polite" style={{color: colors.accentText}}>WiFi listo para previsualizar</Text>}
              <Text style={{color: colors.muted2}}>WiFi asignado: {camera.wifiSsid || camera.cameraConfig?.wifiSsid || 'Sin configurar'}</Text>
              {button('Cambiar red WiFi', () => void run(async () => {
                await ensureAvailable(camera.id);
                if (bluetoothCameraId !== camera.id) await closeBluetooth();
                setNetworkReady(ids => ids.filter(id => id !== camera.id));
                if (mounted.current) setLinking(camera);
              }), busy)}
              {button('Conectar cámara al WiFi', () => void run(async () => {
                await ensureAvailable(camera.id);
                if (assignedCameraWifi(camera, [])) { await prepareNetwork(camera); }
                else { if (bluetoothCameraId !== camera.id) await closeBluetooth(); if (mounted.current) setLinking(camera); }
              }), busy)}
              {Platform.OS === 'android' ? button('Previsualizar sin transmitir', () => void run(async () => {
                await ensureAvailable(camera.id);
                let credentials: CohnCredentials | null;
                if (bluetoothCameraId === camera.id && connection.current) {
                  credentials = await prepareNetwork(camera);
                } else { credentials = await fetchCameraCohn(user, camera.id); }
                if (!credentials) credentials = await prepareNetwork(camera);
                if (mounted.current) setPreview({ camera, credentials });
              }), busy) : <Text style={{ color: colors.muted2 }}>El preview local está disponible en Android.</Text>}
            </View>)}
            {prepared && <Text style={{ color: colors.muted2 }}>Revisá una cámara por vez. Cerrá su preview para continuar con la siguiente. La preparación no pone la partida en vivo.</Text>}
          </>}
        </>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
