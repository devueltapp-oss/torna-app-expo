/**
 * `controlClubStream` (pausar/finalizar desde Juegos) para cada cámara de la
 * partida: conecta por BLE, confirma que dejó de transmitir (`stopLive`,
 * que ahora lanza si la GoPro no confirma — ver `liveStream.test.ts`) y
 * SOLO DESPUÉS cambia el estado del backend. Pausar usa
 * `PUT /game/live/:id/stop` (queda `STOPPED`, reanudable); finalizar usa
 * `PATCH /game/:id {status:'FINISHED'}` (terminal). Ninguna de las dos
 * toca el backend si no se pudo verificar cada cámara de la partida.
 */
import { controlClubStream } from '../cohn/gameControl';
import { connectCameraFromPhone } from '../cohn/bluetooth';
import { fetchClubCameras } from '../../api/cameras';
import { fetchClubGames, fetchClubGameCameras, finishClubGame, setGameLiveStatus } from '../../api/games';

jest.mock('../cohn/bluetooth', () => ({ connectCameraFromPhone: jest.fn() }));
jest.mock('../../api/cameras', () => ({ fetchClubCameras: jest.fn() }));
jest.mock('../../api/games', () => ({
  fetchClubGames: jest.fn(), fetchClubGameCameras: jest.fn(), finishClubGame: jest.fn(async () => {}), setGameLiveStatus: jest.fn(async () => {}),
}));

const user = { id: 'club-1', isClub: true };
const camera = { id: 'cam-1', identifier: 'CAM01', bleName: '1234' };
const liveGame = { gameId: 'g1', gameStatus: 'LIVE', courtName: 'Cancha 1', court: 'CAM01', isReservation: false, players: [], createdAt: '' };

function mockSession() {
  const session = { stopLive: jest.fn(async () => {}), close: jest.fn(async () => {}) };
  (connectCameraFromPhone as jest.Mock).mockResolvedValue(session);
  return session;
}

beforeEach(() => {
  jest.clearAllMocks();
  (fetchClubGames as jest.Mock).mockResolvedValue([liveGame]);
  (fetchClubGameCameras as jest.Mock).mockResolvedValue([camera]);
  (fetchClubCameras as jest.Mock).mockResolvedValue([camera]);
  mockSession();
});

test('pausar detiene la cámara por BLE y deja la partida STOPPED, sin finalizarla', async () => {
  const session = mockSession();
  await controlClubStream(user, 'g1', 'pause');

  expect(connectCameraFromPhone).toHaveBeenCalledWith(user, '1234', expect.anything(), expect.any(Function), expect.any(Function));
  // `releaseNetwork=false`: pausar no libera la red, la cámara sigue en la misma WiFi para reanudar.
  expect(session.stopLive).toHaveBeenCalledWith(false);
  expect(session.close).toHaveBeenCalledTimes(1);
  expect(setGameLiveStatus).toHaveBeenCalledWith(user, 'g1', 'stop');
  expect(finishClubGame).not.toHaveBeenCalled();
});

test('finalizar detiene la cámara y llama finishClubGame, sin pausar', async () => {
  const session = mockSession();
  await controlClubStream(user, 'g1', 'finish');

  // `releaseNetwork=true`: finalizar es terminal, libera la red de la cámara.
  expect(session.stopLive).toHaveBeenCalledWith(true);
  expect(finishClubGame).toHaveBeenCalledWith(user, 'g1');
  expect(setGameLiveStatus).not.toHaveBeenCalled();
});

test('onProgress recibe mensajes en cada paso', async () => {
  const onProgress = jest.fn();
  await controlClubStream(user, 'g1', 'finish', { onProgress });

  expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('Conectando'));
  expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('Finalizando'));
});

test('finalizar también corre sobre una partida STOPPED (reanudada o no, la cámara se vuelve a verificar)', async () => {
  (fetchClubGames as jest.Mock).mockResolvedValue([{ ...liveGame, gameStatus: 'STOPPED' }]);
  await controlClubStream(user, 'g1', 'finish');
  expect(finishClubGame).toHaveBeenCalledWith(user, 'g1');
});

test('si la cámara no confirma que dejó de transmitir, no se cambia el estado de la partida', async () => {
  const session = mockSession();
  session.stopLive.mockRejectedValue(new Error('La GoPro no confirmó que dejó de transmitir. No se cambió el estado de la partida.'));

  const error: any = await controlClubStream(user, 'g1', 'pause').catch((e) => e);

  expect(error.message).toMatch('no confirmó');
  // La UI usa este flag para decidir si ofrece "Forzar sin confirmar" — ver GamesScreen.
  expect(error.cameraConfirmationFailed).toBe(true);
  expect(session.close).toHaveBeenCalledTimes(1); // se libera la sesión BLE igual
  expect(setGameLiveStatus).not.toHaveBeenCalled();
  expect(finishClubGame).not.toHaveBeenCalled();
});

test('con force=true, la falla de la cámara no bloquea: se cambia el estado igual', async () => {
  const session = mockSession();
  session.stopLive.mockRejectedValue(new Error('La GoPro no confirmó que dejó de transmitir.'));

  await controlClubStream(user, 'g1', 'pause', { force: true });

  expect(session.close).toHaveBeenCalledTimes(1);
  expect(setGameLiveStatus).toHaveBeenCalledWith(user, 'g1', 'stop');
});

test('con force=true, un fallo de conexión BLE tampoco bloquea el cambio de estado', async () => {
  (connectCameraFromPhone as jest.Mock).mockRejectedValue(new Error('La cámara no respondió a tiempo.'));

  await controlClubStream(user, 'g1', 'finish', { force: true });

  expect(finishClubGame).toHaveBeenCalledWith(user, 'g1');
});

test('force=true NO saltea las validaciones (no es un problema de conectividad)', async () => {
  (fetchClubGames as jest.Mock).mockResolvedValue([{ ...liveGame, gameStatus: 'STOPPED' }]);

  await expect(controlClubStream(user, 'g1', 'pause', { force: true })).rejects.toThrow('La partida cambió de estado');
  expect(connectCameraFromPhone).not.toHaveBeenCalled();
  expect(setGameLiveStatus).not.toHaveBeenCalled();
});

test('force=true tampoco saltea el chequeo de cámara compartida con otra partida en vivo', async () => {
  const otherLive = { ...liveGame, gameId: 'g2', courtName: 'Cancha 2' };
  (fetchClubGames as jest.Mock).mockResolvedValue([liveGame, otherLive]);
  (fetchClubGameCameras as jest.Mock).mockImplementation(async () => [camera]);

  await expect(controlClubStream(user, 'g1', 'pause', { force: true })).rejects.toThrow('asociada a otra partida en vivo');
  expect(connectCameraFromPhone).not.toHaveBeenCalled();
});

test('pausar una partida que no está LIVE falla sin tocar las cámaras (la lista está desactualizada)', async () => {
  (fetchClubGames as jest.Mock).mockResolvedValue([{ ...liveGame, gameStatus: 'STOPPED' }]);

  const error: any = await controlClubStream(user, 'g1', 'pause').catch((e) => e);

  expect(error.message).toMatch('La partida cambió de estado');
  // No es una falla de conectividad — la UI NO debe ofrecer "Forzar" para esto.
  expect(error.cameraConfirmationFailed).toBeUndefined();
  expect(connectCameraFromPhone).not.toHaveBeenCalled();
  expect(setGameLiveStatus).not.toHaveBeenCalled();
});

test('una partida que ya no está en la agenda del club falla sin tocar las cámaras', async () => {
  (fetchClubGames as jest.Mock).mockResolvedValue([]);

  await expect(controlClubStream(user, 'g1', 'finish')).rejects.toThrow('La partida cambió de estado');
  expect(connectCameraFromPhone).not.toHaveBeenCalled();
});

test('una cámara sin bleName bloquea la acción antes de tocar el backend', async () => {
  (fetchClubGameCameras as jest.Mock).mockResolvedValue([{ id: 'cam-1', identifier: 'CAM01', bleName: undefined }]);

  await expect(controlClubStream(user, 'g1', 'pause')).rejects.toThrow('No se pueden verificar las cámaras');
  expect(connectCameraFromPhone).not.toHaveBeenCalled();
  expect(setGameLiveStatus).not.toHaveBeenCalled();
});

test('una cámara que no pertenece al club bloquea la acción', async () => {
  (fetchClubCameras as jest.Mock).mockResolvedValue([]); // la cámara de la partida no está entre las del club

  await expect(controlClubStream(user, 'g1', 'pause')).rejects.toThrow('No se pueden verificar las cámaras');
  expect(connectCameraFromPhone).not.toHaveBeenCalled();
});

test('una partida sin ninguna cámara asignada bloquea la acción', async () => {
  (fetchClubGameCameras as jest.Mock).mockResolvedValue([]);

  await expect(controlClubStream(user, 'g1', 'finish')).rejects.toThrow('No se pueden verificar las cámaras');
});

test('una cámara compartida con otra partida LIVE bloquea la acción, para no pisar esa transmisión', async () => {
  const otherLive = { ...liveGame, gameId: 'g2', courtName: 'Cancha 2' };
  (fetchClubGames as jest.Mock).mockResolvedValue([liveGame, otherLive]);
  (fetchClubGameCameras as jest.Mock).mockImplementation(async () => [camera]); // misma cámara en las dos partidas

  await expect(controlClubStream(user, 'g1', 'pause')).rejects.toThrow('asociada a otra partida en vivo');
  expect(connectCameraFromPhone).not.toHaveBeenCalled();
});

test('no permite dos acciones en paralelo', async () => {
  let resolveGames!: (v: unknown) => void;
  (fetchClubGames as jest.Mock).mockReturnValueOnce(new Promise(resolve => { resolveGames = resolve; }));

  const first = controlClubStream(user, 'g1', 'pause');
  await Promise.resolve().then(() => Promise.resolve()); // dejar que el primer await (fetchClubGames) quede pendiente

  await expect(controlClubStream(user, 'g1', 'finish')).rejects.toThrow('Esperá a que termine la acción anterior.');

  resolveGames([liveGame]);
  await first;
  expect(setGameLiveStatus).toHaveBeenCalledWith(user, 'g1', 'stop');
});

test('un usuario no-club no puede ejecutar ninguna acción', async () => {
  await expect(controlClubStream({ id: 'player-1', isClub: false }, 'g1', 'pause')).rejects.toThrow();
  expect(fetchClubGames).not.toHaveBeenCalled();
});
