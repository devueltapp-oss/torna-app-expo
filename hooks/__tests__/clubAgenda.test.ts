import {renderHook,waitFor} from '@testing-library/react-native';
import {useClubGames} from '../useClubGames';
import {fetchClubGames} from '../../api/games';
jest.mock('../../api/games',()=>({fetchClubGames:jest.fn()}));
test('uses court and scheduled wall-clock time instead of camera and creation date',async()=>{
 (fetchClubGames as jest.Mock).mockResolvedValue([{gameId:'g',gameStatus:'SCHEDULED',court:'CAM-1',courtName:'Central',courtId:'court1',players:[],scheduledStartAt:'2026-10-02T18:30:00Z',createdAt:'2026-09-01T02:00:00Z'}]);
 const {result}=renderHook(()=>useClubGames('club'));
 await waitFor(()=>expect(result.current.loading).toBe(false));
 expect(result.current.games[0]).toMatchObject({court:'Central',time:'18:30',courtId:'court1'});
});
