/**
 * Confirma que la app DISTINGUE un highlight privado de uno público al traer
 * "Mis highlights" (GET /highlights/my): mapea `isEnabled` del backend a
 * `isPublic` (true = público / false = privado). Es lo que permite que el perfil
 * filtre y que el toggle sepa el estado de partida.
 */
import { renderHook, waitFor } from '@testing-library/react-native';
import { useMyHighlights } from '../useMyHighlights';
import { fetchMyHighlights, type MyHighlight } from '../../api/highlights';

jest.mock('../../api/highlights');

const mockFetchMine = fetchMyHighlights as jest.MockedFunction<
  typeof fetchMyHighlights
>;

function makeMine(id: string, isEnabled: boolean): MyHighlight {
  return {
    id,
    title: `Highlight ${id}`,
    description: null,
    clipUrl: `https://cdn/${id}.mp4`,
    thumbnailUrl: null,
    duration: 42,
    createdAt: new Date().toISOString(),
    likesCount: 0,
    gameId: `game-${id}`,
    isEnabled,
  };
}

describe('useMyHighlights — mapeo isEnabled → isPublic', () => {
  afterEach(() => jest.clearAllMocks());

  it('marca el privado (isEnabled=false) como isPublic=false y el público como true', async () => {
    mockFetchMine.mockResolvedValue([
      makeMine('priv', false),
      makeMine('pub', true),
    ]);

    const { result } = renderHook(() => useMyHighlights('u1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const byId = Object.fromEntries(
      result.current.highlights.map((h) => [h.id, h]),
    );
    expect(byId.priv.isPublic).toBe(false);
    expect(byId.pub.isPublic).toBe(true);
  });

  it('sin userId no pide highlights (gate de sesión)', async () => {
    const { result } = renderHook(() => useMyHighlights(undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetchMine).not.toHaveBeenCalled();
    expect(result.current.highlights).toEqual([]);
  });
});
