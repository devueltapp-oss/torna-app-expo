import { assertClub, type ClubIdentity } from './provision';
import { connectCameraFromPhone } from './bluetooth';
import { fetchClubCameras } from '../../api/cameras';
import { fetchClubGames, fetchClubGameCameras, finishClubGame, setGameLiveStatus } from '../../api/games';

export interface ControlClubStreamOptions {
  /**
   * Saltea el bloqueo cuando una cámara no confirma por BLE que dejó de
   * transmitir (p. ej. fuera de rango o apagada) — el club nunca debe
   * quedar sin forma de cerrar una partida por una cámara inalcanzable.
   * NO saltea las validaciones previas (partida en el estado esperado,
   * cámaras del club con `bleName`, ninguna compartida con otra partida
   * LIVE): esas son chequeos de seguridad reales, no de conectividad.
   */
  force?: boolean;
  /** Mensajes en español, listos para mostrar en la UI (ver `GamesScreen`). */
  onProgress?: (message: string) => void;
}

let controlling = false;
/**
 * All cameras must confirm stopped before publishing the game transition —
 * salvo que `options.force` esté activo para esa cámara puntual.
 *
 * Instrumentado con `[FINISH DEBUG]` (mismo criterio que `[STREAM DEBUG]` de
 * `useGameDetail.ts`/`GameDetailScreen.tsx`): pausar/finalizar depende de un
 * round-trip BLE real contra la GoPro, así que un fallo silencioso acá (sin
 * log) es indistinguible de "no pasa nada" para quien lo prueba. Dejar estos
 * logs — no son para borrar antes de producción, son el único rastro de en
 * qué paso se cae un intento real.
 */
export async function controlClubStream(
  user: ClubIdentity | null,
  gameId: string,
  action: 'pause' | 'finish',
  options: ControlClubStreamOptions = {},
) {
  const { force = false, onProgress = () => {} } = options;
  const log = (...args: unknown[]) => { if (__DEV__) console.log('[FINISH DEBUG]', ...args); };
  log('start', { gameId, action, force });
  assertClub(user);
  if (controlling) throw new Error('Esperá a que termine la acción anterior.');
  controlling = true;
  try {
    onProgress('Verificando la partida…');
    const games = await fetchClubGames(user.id);
    const game = games.find(g => g.gameId === gameId);
    log('fetched games', { count: games.length, gameStatus: game?.gameStatus });
    if (!game || !(action === 'pause' ? ['LIVE'] : ['LIVE', 'STOPPED']).includes(game.gameStatus)) {
      throw new Error('La partida cambió de estado. Actualizá la lista.');
    }
    const [cameras, owned] = await Promise.all([fetchClubGameCameras(user, gameId), fetchClubCameras(user)]);
    log('fetched cameras', { cameras: cameras.map(c => ({ id: c.id, bleName: c.bleName })), ownedCount: owned.length });
    if (!cameras.length || cameras.some(c => !owned.some(o => o.id === c.id) || !c.bleName)) {
      throw new Error('No se pueden verificar las cámaras de esta partida. Revisá su configuración.');
    }
    const otherLive = await Promise.all(games.filter(g => g.gameId !== gameId && g.gameStatus === 'LIVE').map(g => fetchClubGameCameras(user, g.gameId)));
    if (otherLive.flat().some(c => cameras.some(target => target.id === c.id))) throw new Error('Una cámara está asociada a otra partida en vivo. Revisá la asignación antes de detenerla.');
    for (const camera of cameras) {
      const label = camera.identifier || camera.bleName;
      onProgress(`Conectando con ${label}…`);
      log('connecting BLE to', camera.bleName);
      try {
        const session = await connectCameraFromPhone(user, camera.bleName!, new AbortController().signal, onProgress, () => log('BLE disconnected', camera.bleName));
        try {
          onProgress(`Deteniendo ${label}…`);
          await session.stopLive(action === 'finish');
          log('stopLive OK', camera.bleName);
        } finally { await session.close(); }
      } catch (error) {
        log('camera confirmation FAILED', camera.bleName, error instanceof Error ? error.message : error);
        if (!force) {
          const message = error instanceof Error ? error.message : 'No se pudo confirmar la cámara.';
          const wrapped = new Error(message);
          (wrapped as Error & { cameraConfirmationFailed?: boolean }).cameraConfirmationFailed = true;
          throw wrapped;
        }
        // force=true: seguimos con las demás cámaras y con el cambio de estado igual.
      }
    }
    onProgress(action === 'pause' ? 'Pausando la partida…' : 'Finalizando la partida…');
    if (action === 'pause') await setGameLiveStatus(user, gameId, 'stop');
    else await finishClubGame(user, gameId);
    log('done', { action, force });
  } catch (error) {
    log('FAILED', error instanceof Error ? error.message : error);
    throw error;
  } finally { controlling = false; }
}
