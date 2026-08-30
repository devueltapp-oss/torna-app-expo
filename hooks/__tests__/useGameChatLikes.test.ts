/**
 * Likes de mensajes en el chat de la partida, desde la app.
 *
 * Reglas del producto que este test fija:
 *   - Una persona likea un mensaje **una sola vez**: volver a tocar el corazón
 *     lo quita (toggle), nunca suma dos.
 *   - Puede likear **varios mensajes distintos** en el mismo chat.
 *   - El contador que se muestra es el total del servidor (cuánta gente lo
 *     likeó), así que la respuesta del POST pisa el valor optimista.
 *   - Si el POST falla, el corazón vuelve como estaba.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useGameChat } from '../useGameChat';
import {
  fetchGameChat,
  markGameChatRead,
  toggleGameChatMessageLike,
  type GameChatMessage,
} from '../../api/games';

jest.mock('../../api/games');
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => false }));

const mockFetch = fetchGameChat as jest.MockedFunction<typeof fetchGameChat>;
// El hook marca el chat como leído al montar; con `jest.mock` automático devolvería
// undefined y el `.catch(...)` reventaría.
const mockMarkRead = markGameChatRead as jest.MockedFunction<typeof markGameChatRead>;
const mockToggle = toggleGameChatMessageLike as jest.MockedFunction<
  typeof toggleGameChatMessageLike
>;

function msg(id: string, over: Partial<GameChatMessage> = {}): GameChatMessage {
  return {
    id,
    gameId: 'g1',
    senderId: 'u2',
    username: 'ana',
    name: 'Ana',
    profilePicture: null,
    content: `mensaje ${id}`,
    createdAt: `2026-08-20T12:0${id.slice(-1)}:00.000Z`,
    likesCount: 0,
    likedByMe: false,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue([msg('m1'), msg('m2')]);
  mockMarkRead.mockResolvedValue(undefined);
});

async function setup() {
  const hook = renderHook(() => useGameChat('g1'));
  await waitFor(() => expect(hook.result.current.messages).toHaveLength(2));
  return hook;
}

describe('useGameChat — likes', () => {
  it('likea un mensaje: corazón encendido y contador del servidor', async () => {
    mockToggle.mockResolvedValue({ messageId: 'm1', likesCount: 1, likedByMe: true });
    const { result } = await setup();

    await act(async () => { await result.current.toggleLike('m1'); });

    expect(mockToggle).toHaveBeenCalledWith('g1', 'm1');
    const m1 = result.current.messages.find((m) => m.id === 'm1')!;
    expect(m1.likedByMe).toBe(true);
    expect(m1.likesCount).toBe(1);
    // El otro mensaje no se toca.
    expect(result.current.messages.find((m) => m.id === 'm2')!.likesCount).toBe(0);
  });

  it('volver a tocar el mismo mensaje lo quita (no suma dos)', async () => {
    mockToggle.mockResolvedValueOnce({ messageId: 'm1', likesCount: 1, likedByMe: true });
    mockToggle.mockResolvedValueOnce({ messageId: 'm1', likesCount: 0, likedByMe: false });
    const { result } = await setup();

    await act(async () => { await result.current.toggleLike('m1'); });
    await act(async () => { await result.current.toggleLike('m1'); });

    const m1 = result.current.messages.find((m) => m.id === 'm1')!;
    expect(m1.likedByMe).toBe(false);
    expect(m1.likesCount).toBe(0);
  });

  it('la misma persona puede likear varios mensajes del chat', async () => {
    mockToggle.mockImplementation(async (_g, messageId) => ({
      messageId,
      likesCount: 1,
      likedByMe: true,
    }));
    const { result } = await setup();

    await act(async () => { await result.current.toggleLike('m1'); });
    await act(async () => { await result.current.toggleLike('m2'); });

    expect(result.current.messages.every((m) => m.likedByMe)).toBe(true);
  });

  it('varias personas sobre el mismo mensaje: manda el total del servidor', async () => {
    // Otros dos ya lo habían likeado; al sumarme el servidor devuelve 3.
    mockFetch.mockResolvedValue([msg('m1', { likesCount: 2 }), msg('m2')]);
    mockToggle.mockResolvedValue({ messageId: 'm1', likesCount: 3, likedByMe: true });
    const { result } = await setup();

    await act(async () => { await result.current.toggleLike('m1'); });

    expect(result.current.messages.find((m) => m.id === 'm1')!.likesCount).toBe(3);
  });

  it('si el POST falla, el corazón vuelve como estaba', async () => {
    mockToggle.mockRejectedValue(new Error('500'));
    const { result } = await setup();

    await act(async () => { await result.current.toggleLike('m1'); });

    const m1 = result.current.messages.find((m) => m.id === 'm1')!;
    expect(m1.likedByMe).toBe(false);
    expect(m1.likesCount).toBe(0);
  });

  it('no intenta likear un mensaje optimista (todavía sin id del servidor)', async () => {
    const { result } = await setup();

    await act(async () => { await result.current.toggleLike('temp-123'); });

    expect(mockToggle).not.toHaveBeenCalled();
  });
});

/**
 * No leídos del chat de partida (2026-08-30). Abrir el chat tiene que limpiar el badge
 * del inbox; el contador real lo calcula el backend desde `GamePlayer.lastReadAt`.
 */
describe('useGameChat — marcar como leído', () => {
  it('al montar marca el chat como leído', async () => {
    renderHook(() => useGameChat('g1'));
    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith('g1'));
  });

  it('si falla, no rompe el chat (es best-effort)', async () => {
    mockMarkRead.mockRejectedValue(new Error('sin red'));
    const hook = renderHook(() => useGameChat('g1'));
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(2));
  });
});
