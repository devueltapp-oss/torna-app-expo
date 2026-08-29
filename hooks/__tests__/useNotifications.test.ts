/**
 * `useNotifications` alimenta la campanita. Lo que se prueba es lo que el usuario
 * percibe: la lista y el contador salen del server, marcar como leída se siente
 * instantáneo (optimista) pero **vuelve atrás si el server rechaza**, y paginar no
 * duplica filas.
 */
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useNotifications } from '../useNotifications';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '../../api/notifications';

jest.mock('../../api/notifications');
// Sin esto, el refetch por foco dispara una segunda carga en cada test.
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => false }));

const mockFetch = fetchNotifications as jest.MockedFunction<typeof fetchNotifications>;
const mockRead = markNotificationRead as jest.MockedFunction<typeof markNotificationRead>;
const mockReadAll = markAllNotificationsRead as jest.MockedFunction<typeof markAllNotificationsRead>;

const notif = (id: string, over: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: 'GAME_SCHEDULED',
  title: 'Mati agendó una partida',
  body: 'sáb 30/08 19:30 · Cancha 2',
  gameId: 'g1',
  entityId: null,
  data: { type: 'GAME_SCHEDULED', gameId: 'g1' },
  readAt: null,
  createdAt: '2026-08-26T10:00:00.000Z',
  actor: null,
  ...over,
});

async function setup() {
  const hook = renderHook(() => useNotifications());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({ items: [notif('n1'), notif('n2')], nextCursor: null, unreadCount: 2 });
  mockRead.mockResolvedValue({ ok: true });
  mockReadAll.mockResolvedValue({ updated: 2 });
});

describe('useNotifications', () => {
  it('carga la primera página con su contador de no leídos', async () => {
    const { result } = await setup();

    expect(mockFetch).toHaveBeenCalledWith({ limit: 20 });
    expect(result.current.items.map((n) => n.id)).toEqual(['n1', 'n2']);
    expect(result.current.unreadCount).toBe(2);
    expect(result.current.hasMore).toBe(false);
  });

  it('si el server falla, queda vacío en vez de colgado cargando', async () => {
    mockFetch.mockRejectedValueOnce(new Error('sin red'));
    const { result } = await setup();

    expect(result.current.items).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('markRead es optimista: la fila queda leída y el contador baja al toque', async () => {
    // El POST no resuelve durante el test: si el efecto fuera esperar al server, el
    // assert de abajo fallaría.
    mockRead.mockReturnValue(new Promise(() => {}) as any);
    const { result } = await setup();

    act(() => {
      void result.current.markRead('n1');
    });

    expect(result.current.items.find((n) => n.id === 'n1')?.readAt).toBeTruthy();
    expect(result.current.unreadCount).toBe(1);
  });

  it('markRead revierte (fila y contador) si el server rechaza', async () => {
    mockRead.mockRejectedValueOnce(new Error('HTTP 500'));
    const { result } = await setup();

    await act(async () => {
      await result.current.markRead('n1');
    });

    expect(result.current.items.find((n) => n.id === 'n1')?.readAt).toBeNull();
    expect(result.current.unreadCount).toBe(2);
  });

  it('markRead sobre una ya leída no llama al server', async () => {
    mockFetch.mockResolvedValue({
      items: [notif('n1', { readAt: '2026-08-26T11:00:00.000Z' })],
      nextCursor: null,
      unreadCount: 0,
    });
    const { result } = await setup();

    await act(async () => {
      await result.current.markRead('n1');
    });

    expect(mockRead).not.toHaveBeenCalled();
  });

  it('markAllRead deja el contador en 0 y todas las filas leídas', async () => {
    const { result } = await setup();

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.items.every((n) => !!n.readAt)).toBe(true);
    expect(mockReadAll).toHaveBeenCalledTimes(1);
  });

  it('loadMore appendea con el cursor y dedupea por id', async () => {
    mockFetch.mockResolvedValueOnce({
      items: [notif('n1'), notif('n2')],
      nextCursor: 'n2',
      unreadCount: 2,
    });
    const { result } = await setup();
    expect(result.current.hasMore).toBe(true);

    // El server repite n2 (llegó algo nuevo entre páginas) y suma n3.
    mockFetch.mockResolvedValueOnce({
      items: [notif('n2'), notif('n3')],
      nextCursor: null,
      unreadCount: 3,
    });
    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockFetch).toHaveBeenLastCalledWith({ limit: 20, cursor: 'n2' });
    expect(result.current.items.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
    expect(result.current.hasMore).toBe(false);
  });

  it('sin cursor, loadMore no vuelve a pedir', async () => {
    const { result } = await setup();
    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
