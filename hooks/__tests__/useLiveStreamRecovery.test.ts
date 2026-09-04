/**
 * Reenganche de una transmisión en vivo trabada.
 *
 * El bug: la imagen se congelaba y no volvía nunca. Un HLS en vivo casi nunca
 * "falla": **se traba**. Un microcorte deja al reproductor atrás de la ventana en
 * vivo, los segmentos que pide ya se borraron y se queda esperando — sin ningún
 * evento de error. Por eso la misma URL anda en un tester web (hls.js recupera
 * solo).
 *
 * SDK 55: `expo-video` no tiene un callback de status continuo, así que el hook
 * corre su propio sampler cada segundo y lee del `player`. Estos tests manejan un
 * `player` de mentira: mutan `currentTime` / `status` / `playing` y adelantan el
 * reloj para que el sampler corra.
 *
 * Lo que fijan son los dos falsos positivos que arruinarían la experiencia si la
 * detección fuera ingenua: **pausar** y **bufferear al arrancar** no son trabas.
 */
import { act, renderHook } from '@testing-library/react-native';
import { useLiveStreamRecovery } from '../useLiveStreamRecovery';

/** `player` de expo-video de mentira: estado mutable + `addListener` con emisor. */
function makePlayer(init: Partial<FakePlayer> = {}) {
  const listeners: Record<string, ((p: any) => void)[]> = {};
  const player: FakePlayer = {
    status: 'readyToPlay',
    playing: true,
    currentTime: 1,
    duration: 0,
    bufferedPosition: 0,
    muted: false,
    loop: false,
    timeUpdateEventInterval: 0,
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    addListener: jest.fn((name: string, cb: (p: any) => void) => {
      (listeners[name] ||= []).push(cb);
      return { remove: jest.fn(() => {
        listeners[name] = (listeners[name] || []).filter((x) => x !== cb);
      }) };
    }),
    __emit(name: string, payload: any) {
      (listeners[name] || []).forEach((cb) => cb(payload));
    },
    ...init,
  };
  return player;
}

interface FakePlayer {
  status: 'idle' | 'loading' | 'readyToPlay' | 'error';
  playing: boolean;
  currentTime: number;
  duration: number;
  bufferedPosition: number;
  muted: boolean;
  loop: boolean;
  timeUpdateEventInterval: number;
  play: jest.Mock;
  pause: jest.Mock;
  replace: jest.Mock;
  addListener: jest.Mock;
  __emit: (name: string, payload: any) => void;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

/** Adelanta el reloj `ms` (el sampler del hook corre cada 1000 ms). */
function advance(ms: number) {
  act(() => { jest.advanceTimersByTime(ms); });
}

describe('useLiveStreamRecovery — detecta la traba', () => {
  it('reengancha si dice reproducir pero la posición no avanza', () => {
    const player = makePlayer({ currentTime: 5 });
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true));
    const inicial = result.current.reloadNonce;

    // Posición clavada: imagen congelada. Dentro de la tolerancia todavía no toca.
    advance(4000);
    expect(result.current.reloadNonce).toBe(inicial);

    // Pasado FROZEN_MS (6 s) sin moverse → reengancha.
    advance(5000);
    expect(result.current.reloadNonce).toBeGreaterThan(inicial);
    expect(result.current.recoveries).toBe(1);
  });

  it('reengancha si se queda buffereando sin parar', () => {
    const player = makePlayer({ status: 'loading', playing: false });
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true));
    const inicial = result.current.reloadNonce;

    advance(8000);
    expect(result.current.reloadNonce).toBe(inicial);

    // Pasado BUFFERING_MS (12 s) buffereando → reengancha.
    advance(6000);
    expect(result.current.reloadNonce).toBeGreaterThan(inicial);
  });

  it('un error de carga del player reintenta en vez de rendirse', () => {
    const player = makePlayer();
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true));
    const inicial = result.current.reloadNonce;

    act(() => player.__emit('statusChange', { status: 'error' }));

    expect(result.current.reloadNonce).toBeGreaterThan(inicial);
  });
});

describe('useLiveStreamRecovery — lo que NO es una traba', () => {
  /** Si el usuario pausó, la posición detenida es lo correcto. */
  it('estar en pausa no dispara nada', () => {
    const player = makePlayer({ playing: false, currentTime: 5 });
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true));
    const inicial = result.current.reloadNonce;

    advance(30000);

    expect(result.current.reloadNonce).toBe(inicial);
  });

  /** Bufferear un rato al arrancar o al cambiar de cámara es normal. */
  it('un buffering corto no dispara nada', () => {
    const player = makePlayer({ status: 'loading', playing: false });
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true));
    const inicial = result.current.reloadNonce;

    advance(5000);
    // Vuelve a reproducir y la posición avanza.
    act(() => {
      player.status = 'readyToPlay';
      player.playing = true;
      player.currentTime = 6;
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.reloadNonce).toBe(inicial);
  });

  it('mientras la posición avanza no toca nada', () => {
    const player = makePlayer({ currentTime: 0 });
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true));
    const inicial = result.current.reloadNonce;

    for (let i = 1; i <= 10; i++) {
      act(() => {
        player.currentTime = i * 2;
        jest.advanceTimersByTime(2000);
      });
    }

    expect(result.current.reloadNonce).toBe(inicial);
  });

  /** En un grabado, posición detenida = pausado o terminado. */
  it('desactivado (partida no en vivo) no hace nada', () => {
    const player = makePlayer({ currentTime: 5 });
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, false));
    const inicial = result.current.reloadNonce;

    advance(30000);
    act(() => player.__emit('statusChange', { status: 'error' }));

    expect(result.current.reloadNonce).toBe(inicial);
  });

  /** Escribiendo un comentario (`hold`): la detección corre pero NO reengancha. */
  it('con `hold` no reengancha aunque esté trabado', () => {
    const player = makePlayer({ currentTime: 5 });
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true, true));
    const inicial = result.current.reloadNonce;

    advance(20000);

    expect(result.current.reloadNonce).toBe(inicial);
  });
});

describe('useLiveStreamRecovery — no remonta en bucle', () => {
  /**
   * Con el stream realmente caído, cada remonte falla de nuevo al instante. Sin
   * un piso entre intentos serían decenas de remontes por segundo.
   */
  it('respeta un piso entre reintentos', () => {
    const player = makePlayer();
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true));

    act(() => player.__emit('statusChange', { status: 'error' }));
    const trasPrimero = result.current.reloadNonce;

    act(() => player.__emit('statusChange', { status: 'error' })); // inmediato: ignorado
    act(() => player.__emit('statusChange', { status: 'error' }));
    expect(result.current.reloadNonce).toBe(trasPrimero);

    advance(5000);
    act(() => player.__emit('statusChange', { status: 'error' }));
    expect(result.current.reloadNonce).toBeGreaterThan(trasPrimero);
  });
});

/**
 * Rendirse y pedir ayuda.
 *
 * Reintentar para siempre en silencio es peor que decir "se cortó": si la
 * transmisión terminó de verdad, la app quedaría con la imagen congelada y un
 * spinner eterno, sin que el usuario sepa que ya no hay nada del otro lado.
 */
describe('useLiveStreamRecovery — se rinde y ofrece recargar', () => {
  /** Gasta los reintentos automáticos con el video siempre congelado. */
  function agotarReintentos(result: any) {
    for (let i = 0; i < 8; i++) {
      advance(9000); // > FROZEN_MS + piso entre intentos
    }
  }

  it('tras varios intentos fallidos marca `stalled`', () => {
    const player = makePlayer({ currentTime: 5 });
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true));
    expect(result.current.stalled).toBe(false);

    agotarReintentos(result);

    expect(result.current.stalled).toBe(true);
    // Y deja de remontar: el bucle infinito es justo lo que se evita.
    const nonce = result.current.reloadNonce;
    advance(9000);
    expect(result.current.reloadNonce).toBe(nonce);
  });

  it('el reintento manual limpia `stalled` y vuelve a intentar', () => {
    const player = makePlayer({ currentTime: 5 });
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true));
    agotarReintentos(result);
    const nonce = result.current.reloadNonce;

    act(() => result.current.retryNow());

    expect(result.current.stalled).toBe(false);
    expect(result.current.reloadNonce).toBeGreaterThan(nonce);
  });

  /**
   * Dos microcortes a lo largo de un partido entero, y entre ellos el video
   * vuelve a reproducir DE VERDAD (sostenido más de STABLE_MS): NO debe acabar
   * mostrando el botón de recarga.
   */
  it('recuperarse de verdad resetea el contador', () => {
    const player = makePlayer({ currentTime: 0 });
    const { result } = renderHook(() => useLiveStreamRecovery(player as any, true));

    for (let ciclo = 0; ciclo < 2; ciclo++) {
      // Traba: posición clavada > FROZEN_MS.
      advance(9000);
      // Reproduciendo sostenido: 12 s avanzando de a 2 s.
      for (let i = 1; i <= 6; i++) {
        act(() => {
          player.currentTime += 2;
          jest.advanceTimersByTime(2000);
        });
      }
    }

    expect(result.current.stalled).toBe(false);
  });
});
