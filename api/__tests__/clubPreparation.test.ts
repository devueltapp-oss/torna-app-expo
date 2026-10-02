import { fetchClubGames, prepareClubGame } from '../games';
const club = {id:'club',isClub:true};
// `jest.restoreAllMocks()` no deshace una reasignación directa de
// `global.fetch` (solo revierte spies de `jest.spyOn`) — sin restaurar el
// original a mano, el mock quedaba filtrado al siguiente archivo de test que
// corre en el mismo proceso (`--runInBand`), causando fallas intermitentes
// en `api/__tests__/cameras.test.ts` según el orden de ejecución.
const originalFetch = global.fetch;
afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch; });
test('accepts the paginated agenda including reservations without cameras', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok:true,json:async()=>({data:{data:[{gameId:'g',gameStatus:'SCHEDULED',isReservation:true,courtName:'Central',scheduledStartAt:'2026-10-02T18:00:00Z',players:[],createdAt:''}]}})});
  expect(await fetchClubGames('club')).toEqual([expect.objectContaining({gameId:'g',courtName:'Central'})]);
});
test('preparing a reservation attaches cameras without setting LIVE', async () => {
  global.fetch = jest.fn().mockResolvedValue({ok:true,json:async()=>({data:{id:'g'}})});
  await prepareClubGame(club,'g',['cam1','cam2']);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/game/g/start-stream'),expect.objectContaining({method:'POST',body:JSON.stringify({cameraIds:['cam1','cam2']})}));
});
test('players cannot prepare club cameras',async()=>{
  global.fetch=jest.fn();
  await expect(prepareClubGame({id:'p',isClub:false},'g',['c'])).rejects.toThrow();
  expect(global.fetch).not.toHaveBeenCalled();
});
