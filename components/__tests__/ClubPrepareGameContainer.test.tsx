/**
 * Bug real (2026-10-03): una partida DETENIDA (`STOPPED`) es una cámara que
 * nunca se conectó o se cortó, no una partida terminada — el horario sigue
 * siendo válido. Antes, `Preparation` trataba `STOPPED` igual que
 * `FINISHED`/`CANCELLED` ("terminal") y mostraba "Esta partida ya terminó o
 * fue cancelada" en vez de dejar reconectar la cámara.
 *
 * Bug real (2026-10-03, segundo): "Preparar WiFi para preview" navegaba a una
 * ruta `ClubCameras` aparte — el usuario pidió explícitamente no perder el
 * foco entre vistas para enlazar por BLE. Ahora `InlineCameraLink` monta
 * `ClubCamerasScreen` DENTRO de esta misma pantalla, sin `navigation.navigate`.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ClubPrepareGameContainer } from '../ClubPrepareGameContainer';
import { ThemeProvider } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { fetchClubGames, fetchClubGameCameras, prepareClubGame } from '../../api/games';
import { fetchClubCameras } from '../../api/cameras';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../api/games', () => ({
  fetchClubGames: jest.fn(), fetchClubGameCameras: jest.fn(), prepareClubGame: jest.fn(),
  setGameLiveStatus: jest.fn(async () => {}),
}));
jest.mock('../../api/cameras', () => ({
  fetchClubCameras: jest.fn(), fetchCameraCohn: jest.fn(), saveCameraCohn: jest.fn(), assignCameraWifi: jest.fn(async () => {}),
  // `InlineCameraLink` monta `useClubCameras`, que además carga las
  // configuraciones de WiFi guardadas — sin mockear esto, el hook se queda
  // esperando para siempre y el test nunca asienta.
  fetchCameraConfigs: jest.fn(async () => []), createCameraConfig: jest.fn(),
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const stoppedGame = { gameId: 'g1', gameStatus: 'STOPPED', courtName: 'Cancha 1', court: 'CAM01', isReservation: false, players: [], createdAt: '' };
const camera = { id: 'cam-1', identifier: 'CAM01', bleName: '1234' };

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue({ user: { id: 'club-1', isClub: true } });
  (fetchClubGames as jest.Mock).mockResolvedValue([stoppedGame]);
  (fetchClubCameras as jest.Mock).mockResolvedValue([camera]);
  (fetchClubGameCameras as jest.Mock).mockResolvedValue([camera]);
});

test('una partida STOPPED NO se trata como terminal: se puede reconectar la cámara', async () => {
  const utils = renderWithTheme(
    <ClubPrepareGameContainer route={{ params: { gameId: 'g1' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => () => {}) }} />,
  );

  await waitFor(() => expect(utils.getByText('Cancha 1 · —')).toBeTruthy());
  // Antes esto mostraba "Esta partida ya terminó o fue cancelada" y bloqueaba todo.
  expect(utils.queryByText('Esta partida ya terminó o fue cancelada.')).toBeNull();
  expect(utils.getByText('Preparar WiFi para preview')).toBeTruthy();
});

test('"Preparar WiFi para preview" en una partida STOPPED abre el enlace INLINE (no navega a ninguna ruta)', async () => {
  const navigate = jest.fn();
  const utils = renderWithTheme(
    <ClubPrepareGameContainer route={{ params: { gameId: 'g1' } }} navigation={{ goBack: jest.fn(), navigate, addListener: jest.fn(() => () => {}) }} />,
  );
  await waitFor(() => expect(utils.getByText('Preparar WiFi para preview')).toBeTruthy());

  fireEvent.press(utils.getByText('Preparar WiFi para preview'));

  // Mismo componente, SIN navegar: reemplaza la vista en el lugar.
  await waitFor(() => expect(utils.getByText('Conectar cámara')).toBeTruthy());
  expect(navigate).not.toHaveBeenCalledWith('ClubCameras', expect.anything());
  expect(utils.queryByText(/El estado de la partida cambió/)).toBeNull();

  // "Volver a la partida" cierra el enlace y vuelve a Preparar partida.
  fireEvent.press(utils.getByText('Volver a la partida'));
  await waitFor(() => expect(utils.getByText('Preparar WiFi para preview')).toBeTruthy());
});

test('"Iniciar preparación de cámaras" llama a prepareClubGame (no marca LIVE, solo adjunta cámaras)', async () => {
  (prepareClubGame as jest.Mock).mockResolvedValue(undefined);
  const noPrep = { ...stoppedGame };
  (fetchClubGameCameras as jest.Mock).mockResolvedValueOnce([]); // sin cámaras adjuntas aún → prepared=false
  const utils = renderWithTheme(
    <ClubPrepareGameContainer route={{ params: { gameId: 'g1' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => () => {}) }} />,
  );
  await waitFor(() => expect(utils.getByText('Cámaras para esta partida')).toBeTruthy());

  fireEvent.press(utils.getByText('CAM01'));
  fireEvent.press(utils.getByText('Iniciar preparación de cámaras'));

  await waitFor(() => expect(prepareClubGame).toHaveBeenCalledWith({ id: 'club-1', isClub: true }, 'g1', ['cam-1']));
});

test('shows an explicit BLE action that starts connection without WiFi configuration',async()=>{
 const bluetooth = require('../../services/cohn/bluetooth');
 const close = jest.fn(async()=>{});
 const connect = jest.spyOn(bluetooth,'connectCameraFromPhone').mockResolvedValue({close,readNetwork:jest.fn(),configureWifi:jest.fn()});
 const utils=renderWithTheme(<ClubPrepareGameContainer route={{params:{gameId:'g1'}}} navigation={{goBack:jest.fn(),navigate:jest.fn(),addListener:jest.fn(()=>()=>{})}}/>);
 await waitFor(()=>expect(utils.getByText('Conectar cámara por Bluetooth')).toBeTruthy());
 expect(connect).not.toHaveBeenCalled();
 fireEvent.press(utils.getByText('Conectar cámara por Bluetooth'));
 await waitFor(()=>expect(utils.getByText('Bluetooth conectado')).toBeTruthy());
 expect(connect).toHaveBeenCalledWith({id:'club-1',isClub:true},'1234',expect.anything(),expect.any(Function),expect.any(Function));
 utils.unmount();expect(close).toHaveBeenCalled();connect.mockRestore();
});

test('uses assigned WiFi without opening the WiFi selection view',async()=>{
 const bluetooth=require('../../services/cohn/bluetooth');
 (fetchClubCameras as jest.Mock).mockResolvedValue([{...camera,wifiSsid:'Jeyu',wifiPassword:'secret'}]);
 const credentials={ipAddress:'192.168.1.2',username:'u',password:'p',certificate:'cert'};
 const configureWifi=jest.fn(async()=>credentials);
 const connect=jest.spyOn(bluetooth,'connectCameraFromPhone').mockResolvedValue({close:jest.fn(async()=>{}),readNetwork:jest.fn(async()=>null),configureWifi});
 const utils=renderWithTheme(<ClubPrepareGameContainer route={{params:{gameId:'g1'}}} navigation={{goBack:jest.fn(),navigate:jest.fn(),addListener:jest.fn(()=>()=>{})}}/>);
 await waitFor(()=>expect(utils.getByText('WiFi asignado: Jeyu')).toBeTruthy());
 fireEvent.press(utils.getByText('Preparar WiFi para preview'));
 await waitFor(()=>expect(utils.getByText('WiFi listo para previsualizar')).toBeTruthy());
 expect(configureWifi).toHaveBeenCalledWith('Jeyu','secret',expect.anything(),expect.any(Function));
 expect(utils.getByText('Preparar partida')).toBeTruthy();
 utils.unmount();connect.mockRestore();
});

test('can change WiFi even when the camera already has an assigned network',async()=>{
 (fetchClubCameras as jest.Mock).mockResolvedValue([{...camera,wifiSsid:'Jeyu',wifiPassword:'secret',cameraConfigId:'cfg'}]);
 const utils=renderWithTheme(<ClubPrepareGameContainer route={{params:{gameId:'g1'}}} navigation={{goBack:jest.fn(),navigate:jest.fn(),addListener:jest.fn(()=>()=>{})}}/>);
 await waitFor(()=>expect(utils.getByText('Cambiar red WiFi')).toBeTruthy());
 fireEvent.press(utils.getByText('Cambiar red WiFi'));
 await waitFor(()=>expect(utils.getByText('Elegí la red WiFi para esta cámara')).toBeTruthy());
 expect(utils.getByText('+ Nueva configuración de WiFi')).toBeTruthy();
});

test('"Iniciar streaming" arranca la transmisión nativa sin pasar por "Preparar WiFi para preview" ni el preview', async () => {
  const bluetooth = require('../../services/cohn/bluetooth');
  const games = require('../../api/games');
  (fetchClubCameras as jest.Mock).mockResolvedValue([
    { ...camera, wifiSsid: 'Jeyu', wifiPassword: 'secret', rtmpServer: 'rtmp://host/app/stream' },
  ]);
  const goLive = jest.fn(async () => {});
  const connect = jest.spyOn(bluetooth, 'connectCameraFromPhone').mockResolvedValue({
    close: jest.fn(async () => {}), readNetwork: jest.fn(), configureWifi: jest.fn(), goLive,
  });
  const utils = renderWithTheme(
    <ClubPrepareGameContainer route={{ params: { gameId: 'g1' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => () => {}) }} />,
  );
  await waitFor(() => expect(utils.getByText('Iniciar streaming')).toBeTruthy());
  // No se tocó "Preparar WiFi para preview": goLive() hace su propio joinWifi por BLE.
  expect(utils.queryByText('WiFi listo para previsualizar')).toBeNull();

  fireEvent.press(utils.getByText('Iniciar streaming'));

  await waitFor(() => expect(goLive).toHaveBeenCalledWith(
    { ssid: 'Jeyu', password: 'secret' },
    expect.objectContaining({ url: 'rtmp://host/app/stream' }),
    expect.anything(), expect.any(Function),
  ));
  await waitFor(() => expect(games.setGameLiveStatus).toHaveBeenCalledWith({ id: 'club-1', isClub: true }, 'g1', 'start'));
  connect.mockRestore();
});

/**
 * Bug real (2026-10-06): una partida puede tener varias cámaras, cada una
 * transmitiendo su propio ángulo por su cuenta. Arrancar la primera pone la
 * partida LIVE — y antes, eso hacía que la pantalla entera cambiara a "La
 * partida ya está en vivo. Abrí su transmisión para verla.", escondiendo el
 * control de la SEGUNDA cámara sin ninguna forma de volver a verlo. Ahora
 * LIVE ya no oculta la lista de cámaras.
 */
test('con dos cámaras, arrancar la primera NO esconde el control de la segunda', async () => {
  const bluetooth = require('../../services/cohn/bluetooth');
  const games = require('../../api/games');
  const camera1 = { ...camera, wifiSsid: 'Jeyu', wifiPassword: 'secret', rtmpServer: 'rtmp://host/app/cam1' };
  const camera2 = { id: 'cam-2', identifier: 'CAM02', bleName: '5678', wifiSsid: 'Jeyu', wifiPassword: 'secret', rtmpServer: 'rtmp://host/app/cam2' };
  (fetchClubCameras as jest.Mock).mockResolvedValue([camera1, camera2]);
  (fetchClubGameCameras as jest.Mock).mockResolvedValue([camera1, camera2]);
  (fetchClubGames as jest.Mock)
    .mockResolvedValueOnce([stoppedGame]) // carga inicial: todavía ninguna cámara transmite
    .mockResolvedValue([{ ...stoppedGame, gameStatus: 'LIVE' }]); // desde que arranca la primera
  const goLive = jest.fn(async () => {});
  const connect = jest.spyOn(bluetooth, 'connectCameraFromPhone').mockResolvedValue({
    close: jest.fn(async () => {}), readNetwork: jest.fn(), configureWifi: jest.fn(), goLive,
  });
  const utils = renderWithTheme(
    <ClubPrepareGameContainer route={{ params: { gameId: 'g1' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => () => {}) }} />,
  );
  await waitFor(() => expect(utils.getAllByText('Iniciar streaming')).toHaveLength(2));

  fireEvent.press(utils.getAllByText('Iniciar streaming')[0]);
  await waitFor(() => expect(goLive).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(games.setGameLiveStatus).toHaveBeenCalledWith({ id: 'club-1', isClub: true }, 'g1', 'start'));

  // La partida ya está LIVE, pero la segunda cámara sigue con su propio botón —
  // antes esto desaparecía por completo (solo quedaba "Ver partida").
  await waitFor(() => expect(utils.getByText(/La partida ya está en vivo/)).toBeTruthy());
  expect(utils.getByText('✓ Transmitiendo')).toBeTruthy(); // la primera, ya no ofrece "Iniciar streaming" de nuevo
  expect(utils.getByText('Iniciar streaming')).toBeTruthy(); // la segunda, todavía disponible

  fireEvent.press(utils.getByText('Iniciar streaming'));
  await waitFor(() => expect(goLive).toHaveBeenCalledTimes(2));
  connect.mockRestore();
});

/**
 * Bug real (2026-10-06, segundo): el chequeo "¿esta cámara ya está en otra
 * partida en vivo?" no excluía la partida ACTUAL de la lista de "partidas en
 * vivo" — una vez que la partida propia pasaba a LIVE (por su primera
 * cámara), arrancar la segunda se detectaba a sí misma como el conflicto.
 */
test('arrancar la segunda cámara no se bloquea a sí misma por "otra partida en vivo"', async () => {
  const bluetooth = require('../../services/cohn/bluetooth');
  const camera1 = { ...camera, wifiSsid: 'Jeyu', wifiPassword: 'secret', rtmpServer: 'rtmp://host/app/cam1' };
  const camera2 = { id: 'cam-2', identifier: 'CAM02', bleName: '5678', wifiSsid: 'Jeyu', wifiPassword: 'secret', rtmpServer: 'rtmp://host/app/cam2' };
  (fetchClubCameras as jest.Mock).mockResolvedValue([camera1, camera2]);
  (fetchClubGameCameras as jest.Mock).mockResolvedValue([camera1, camera2]);
  (fetchClubGames as jest.Mock).mockResolvedValue([{ ...stoppedGame, gameStatus: 'LIVE' }]); // ya en vivo desde el arranque
  const goLive = jest.fn(async () => {});
  const connect = jest.spyOn(bluetooth, 'connectCameraFromPhone').mockResolvedValue({
    close: jest.fn(async () => {}), readNetwork: jest.fn(), configureWifi: jest.fn(), goLive,
  });
  const utils = renderWithTheme(
    <ClubPrepareGameContainer route={{ params: { gameId: 'g1' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => () => {}) }} />,
  );
  await waitFor(() => expect(utils.getAllByText('Iniciar streaming')).toHaveLength(2));

  fireEvent.press(utils.getAllByText('Iniciar streaming')[0]);
  await waitFor(() => expect(goLive).toHaveBeenCalledTimes(1));
  expect(utils.queryByText(/transmitiendo otra partida/)).toBeNull();
  connect.mockRestore();
});

test('"Iniciar streaming" sin servidor RTMP configurado muestra el error, sin tocar la cámara', async () => {
  const bluetooth = require('../../services/cohn/bluetooth');
  (fetchClubCameras as jest.Mock).mockResolvedValue([{ ...camera, wifiSsid: 'Jeyu', wifiPassword: 'secret' }]);
  const connect = jest.spyOn(bluetooth, 'connectCameraFromPhone');
  const utils = renderWithTheme(
    <ClubPrepareGameContainer route={{ params: { gameId: 'g1' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn(), addListener: jest.fn(() => () => {}) }} />,
  );
  await waitFor(() => expect(utils.getByText('Iniciar streaming')).toBeTruthy());

  fireEvent.press(utils.getByText('Iniciar streaming'));

  await waitFor(() => expect(utils.getByText('Esta cámara no tiene un servidor de transmisión configurado. Contactá al administrador de Torna.')).toBeTruthy());
  expect(connect).not.toHaveBeenCalled();
  connect.mockRestore();
});
