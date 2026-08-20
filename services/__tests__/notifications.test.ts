/**
 * Ruteo de notificaciones push: `resolvePushTarget` traduce el `additionalData`
 * que manda torna-api a la pantalla que hay que abrir.
 *
 * Los 8 tipos de acá son los que el backend emite hoy (game.controller,
 * game.service, chat.service). Si el backend suma uno, este test es el lugar
 * donde se ve que la app lo ignora.
 */
import { resolvePushTarget } from '../notifications';

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
});
