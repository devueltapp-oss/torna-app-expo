/**
 * Ruteo de notificaciones push: `resolvePushTarget` traduce el `additionalData`
 * que manda torna-api a la pantalla que hay que abrir.
 *
 * Los 8 tipos de acá son los que el backend emite hoy (game.controller,
 * game.service, chat.service). Si el backend suma uno, este test es el lugar
 * donde se ve que la app lo ignora.
 */
import { OneSignal } from 'react-native-onesignal';
import {
  resolvePushTarget,
  addPushReceivedListener,
  initNotifications,
  __resetForTests,
} from '../notifications';

describe('resolvePushTarget', () => {
  it('manda al visor del partido los tres eventos con gameId', () => {
    for (const type of ['STREAMING_STARTED', 'RECORDING_READY', 'GAME_FINISHED']) {
      expect(resolvePushTarget({ type, gameId: 'g1' })).toEqual({
        name: 'GameDetail',
        params: { gameId: 'g1' },
      });
    }
  });

  it('manda al chat de la partida y al DM', () => {
    expect(resolvePushTarget({ type: 'NEW_CHAT_MESSAGE', gameId: 'g1' })).toEqual({
      name: 'GameChat',
      params: { gameId: 'g1' },
    });
    expect(resolvePushTarget({ type: 'NEW_DM_MESSAGE', fromUserId: 'u9' })).toEqual({
      name: 'DirectChat',
      params: { userId: 'u9' },
    });
  });

  it('manda al hub de partidos los eventos de baja/cancelación', () => {
    for (const type of ['GAME_CANCELLED', 'GAME_PLAYER_LEFT', 'GAME_PAIR_CANCELLED']) {
      expect(resolvePushTarget({ type, gameId: 'g1' })).toEqual({
        name: 'MainPlayer',
        params: { initialTab: 'games' },
      });
    }
  });

  it('acepta los nombres en minúscula que todavía manda producción', () => {
    // El backend desplegado emite game_cancelled / game_player_left /
    // game_pair_cancelled. La app no debe esperar al deploy para navegar.
    expect(resolvePushTarget({ type: 'game_cancelled', gameId: 'g1' })).toEqual({
      name: 'MainPlayer',
      params: { initialTab: 'games' },
    });
  });

  it('no navega si falta el dato que la pantalla necesita', () => {
    expect(resolvePushTarget({ type: 'STREAMING_STARTED' })).toBeNull();
    expect(resolvePushTarget({ type: 'NEW_CHAT_MESSAGE' })).toBeNull();
    expect(resolvePushTarget({ type: 'NEW_DM_MESSAGE' })).toBeNull();
  });

  it('ignora tipos desconocidos y payloads vacíos', () => {
    expect(resolvePushTarget({ type: 'ALGO_NUEVO', gameId: 'g1' })).toBeNull();
    expect(resolvePushTarget({})).toBeNull();
    expect(resolvePushTarget(null)).toBeNull();
    expect(resolvePushTarget(undefined)).toBeNull();
  });

  // Tipos nuevos de la campanita. La MISMA tabla resuelve el tap en la lista
  // in-app (NotificationsScreen le pasa el `data` guardado).
  it('GAME_SCHEDULED (un seguido agendó) abre el detalle de esa partida', () => {
    expect(resolvePushTarget({ type: 'GAME_SCHEDULED', gameId: 'g1' })).toEqual({
      name: 'GameDetail',
      params: { gameId: 'g1' },
    });
    expect(resolvePushTarget({ type: 'game_scheduled', gameId: 'g1' })).toEqual({
      name: 'GameDetail',
      params: { gameId: 'g1' },
    });
    // Sin gameId no hay a dónde ir.
    expect(resolvePushTarget({ type: 'GAME_SCHEDULED' })).toBeNull();
  });

  it('"te sumaron" y "se postularon" van al hub de partidos', () => {
    for (const type of ['GAME_PLAYER_ADDED', 'GAME_APPLICATION_RECEIVED']) {
      expect(resolvePushTarget({ type, gameId: 'g1' })).toEqual({
        name: 'MainPlayer',
        params: { initialTab: 'games' },
      });
    }
  });
});

/**
 * Aviso de push recibido: lo consume `useNotificationBadge` para actualizar el
 * contador de la campanita sin esperar al próximo foco. Se dispara desde los DOS
 * listeners de OneSignal ('click' y 'foregroundWillDisplay').
 */
describe('addPushReceivedListener', () => {
  /** Dispara el handler que `initNotifications` registró para ese evento. */
  function fireOneSignal(event: 'click' | 'foregroundWillDisplay', data: unknown) {
    const calls = (OneSignal.Notifications.addEventListener as jest.Mock).mock.calls;
    const handler = calls.filter((c) => c[0] === event).pop()?.[1];
    if (!handler) throw new Error(`initNotifications no registró '${event}'`);
    handler({ notification: { additionalData: data }, preventDefault: jest.fn() });
  }

  beforeEach(() => {
    __resetForTests();
    jest.clearAllMocks();
    // El app id de OneSignal se inyecta desde `jest.config.js` (babel lo inlina).
    initNotifications({ current: null } as any);
  });

  afterEach(() => __resetForTests());

  it('avisa con el additionalData cuando el usuario toca un push', () => {
    const cb = jest.fn();
    addPushReceivedListener(cb);

    fireOneSignal('click', { type: 'GAME_SCHEDULED', gameId: 'g1' });

    expect(cb).toHaveBeenCalledWith({ type: 'GAME_SCHEDULED', gameId: 'g1' });
  });

  it('también avisa con la app en primer plano (banner)', () => {
    const cb = jest.fn();
    addPushReceivedListener(cb);

    fireOneSignal('foregroundWillDisplay', { type: 'STREAMING_STARTED', gameId: 'g2' });

    expect(cb).toHaveBeenCalledWith({ type: 'STREAMING_STARTED', gameId: 'g2' });
  });

  it('el unsubscribe corta la suscripción', () => {
    const cb = jest.fn();
    const off = addPushReceivedListener(cb);
    off();

    fireOneSignal('click', { type: 'GAME_SCHEDULED', gameId: 'g1' });

    expect(cb).not.toHaveBeenCalled();
  });

  it('un listener que explota no rompe la cadena de push', () => {
    const bueno = jest.fn();
    addPushReceivedListener(() => {
      throw new Error('boom');
    });
    addPushReceivedListener(bueno);

    expect(() => fireOneSignal('click', { type: 'GAME_SCHEDULED', gameId: 'g1' })).not.toThrow();
    expect(bueno).toHaveBeenCalled();
  });
});
