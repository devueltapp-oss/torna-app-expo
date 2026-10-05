import { assertClub, type ClubIdentity } from './provision';
import { connectCameraFromPhone } from './bluetooth';
import { fetchClubCameras } from '../../api/cameras';
import { fetchClubGames, fetchClubGameCameras, finishClubGame, setGameLiveStatus } from '../../api/games';

let controlling = false;
/** All cameras must confirm stopped before publishing the game transition. */
export async function controlClubStream(user: ClubIdentity | null, gameId: string, action: 'pause' | 'finish') {
  assertClub(user);
  if (controlling) throw new Error('Esperá a que termine la acción anterior.');
  controlling = true;
  try {
    const games = await fetchClubGames(user.id);
    const game = games.find(g => g.gameId === gameId);
    if (!game || !(action === 'pause' ? ['LIVE'] : ['LIVE', 'STOPPED']).includes(game.gameStatus)) {
      throw new Error('La partida cambió de estado. Actualizá la lista.');
    }
    const [cameras, owned] = await Promise.all([fetchClubGameCameras(user, gameId), fetchClubCameras(user)]);
    if (!cameras.length || cameras.some(c => !owned.some(o => o.id === c.id) || !c.bleName)) {
      throw new Error('No se pueden verificar las cámaras de esta partida. Revisá su configuración.');
    }
    const otherLive = await Promise.all(games.filter(g => g.gameId !== gameId && g.gameStatus === 'LIVE').map(g => fetchClubGameCameras(user, g.gameId)));
    if (otherLive.flat().some(c => cameras.some(target => target.id === c.id))) throw new Error('Una cámara está asociada a otra partida en vivo. Revisá la asignación antes de detenerla.');
    for (const camera of cameras) {
      const session = await connectCameraFromPhone(user, camera.bleName!, new AbortController().signal, () => {}, () => {});
      try { await session.stopLive(); }
      finally { await session.close(); }
    }
    if (action === 'pause') await setGameLiveStatus(user, gameId, 'stop');
    else await finishClubGame(user, gameId);
  } finally { controlling = false; }
}
