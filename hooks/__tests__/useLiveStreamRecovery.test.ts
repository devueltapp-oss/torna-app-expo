/**
 * Reenganche de una transmisión en vivo trabada.
 *
 * El bug: la imagen se congelaba y no volvía nunca. `expo-av` avisa por
 * `onError` cuando algo **falla**, pero un HLS en vivo casi nunca falla: **se
 * traba**. Un microcorte deja al reproductor atrás de la ventana en vivo, los
 * segmentos que pide ya se borraron y se queda esperando — sin disparar
 * `onError`. Por eso la misma URL anda en un tester web (hls.js recupera solo).
 *
 * Lo que estos tests fijan son los dos falsos positivos que arruinarían la
 * experiencia si la detección fuera ingenua: **pausar** y **bufferear al
 * arrancar** no son trabas.
 */
import { act, renderHook } from '@testing-library/react-native';
import { useLiveStreamRecovery } from '../useLiveStreamRecovery';

/**
 * ⚠️ Buffereando, `isPlaying` es **false** (así lo reporta ExoPlayer), por eso
 * los casos de buffering lo pasan explícito. Si se dejara en `true` con la
 * posición quieta, saltaría primero la detección de "congelado" y el test
 * estaría midiendo otra cosa.
 */
const cargado = (over: any = {}) => ({
  isLoaded: true,
  isPlaying: true,
  isBuffering: false,
  positionMillis: 1000,
  ...over,
}) as any;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

/** Empuja el reloj y manda un status, como haría el `<Video>`. */
function tick(result: any, ms: number, status: any) {
  act(() => {
    jest.advanceTimersByTime(ms);
    result.current.onPlaybackStatusUpdate(status);
  });
}

describe('useLiveStreamRecovery — detecta la traba', () => {
  it('reengancha si dice reproducir pero la posición no avanza', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(true));
    const inicial = result.current.reloadNonce;

    // Misma posición, una y otra vez: eso es una imagen congelada.
    tick(result, 0, cargado({ positionMillis: 5000 }));
    tick(result, 3000, cargado({ positionMillis: 5000 }));
    expect(result.current.reloadNonce).toBe(inicial); // todavía dentro de tolerancia

    tick(result, 4000, cargado({ positionMillis: 5000 }));
    expect(result.current.reloadNonce).toBeGreaterThan(inicial);
    expect(result.current.recoveries).toBe(1);
  });

  it('reengancha si se queda buffereando sin parar', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(true));
    const inicial = result.current.reloadNonce;

    tick(result, 0, cargado({ isBuffering: true, isPlaying: false }));
    tick(result, 8000, cargado({ isBuffering: true, isPlaying: false }));
    expect(result.current.reloadNonce).toBe(inicial);

    tick(result, 6000, cargado({ isBuffering: true, isPlaying: false }));
    expect(result.current.reloadNonce).toBeGreaterThan(inicial);
  });

  it('un error de reproducción reintenta en vez de rendirse', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(true));
    const inicial = result.current.reloadNonce;

    act(() => result.current.onError());

    expect(result.current.reloadNonce).toBeGreaterThan(inicial);
  });
});

describe('useLiveStreamRecovery — lo que NO es una traba', () => {
  /** Si el usuario pausó, la posición detenida es lo correcto. */
  it('estar en pausa no dispara nada', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(true));
    const inicial = result.current.reloadNonce;

    for (let i = 0; i < 6; i++) {
      tick(result, 5000, cargado({ isPlaying: false, positionMillis: 5000 }));
    }

    expect(result.current.reloadNonce).toBe(inicial);
  });

  /** Bufferear un rato al arrancar o al cambiar de cámara es normal. */
  it('un buffering corto no dispara nada', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(true));
    const inicial = result.current.reloadNonce;

    tick(result, 0, cargado({ isBuffering: true, isPlaying: false }));
    tick(result, 5000, cargado({ isBuffering: true, isPlaying: false }));
    tick(result, 1000, cargado({ isBuffering: false, positionMillis: 6000 }));

    expect(result.current.reloadNonce).toBe(inicial);
  });

  it('mientras la posición avanza no toca nada', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(true));
    const inicial = result.current.reloadNonce;

    for (let i = 1; i <= 10; i++) {
      tick(result, 2000, cargado({ positionMillis: i * 2000 }));
    }

    expect(result.current.reloadNonce).toBe(inicial);
  });

  /** En un grabado, posición detenida = pausado o terminado. */
  it('desactivado (partida no en vivo) no hace nada', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(false));
    const inicial = result.current.reloadNonce;

    for (let i = 0; i < 6; i++) tick(result, 5000, cargado({ positionMillis: 5000 }));
    act(() => result.current.onError());

    expect(result.current.reloadNonce).toBe(inicial);
  });
});

describe('useLiveStreamRecovery — no remonta en bucle', () => {
  /**
   * Con el stream realmente caído, cada remonte falla de nuevo al instante. Sin
   * un piso entre intentos serían decenas de remontes por segundo.
   */
  it('respeta un piso entre reintentos', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(true));

    act(() => result.current.onError());
    const trasPrimero = result.current.reloadNonce;

    act(() => result.current.onError()); // inmediato: ignorado
    act(() => result.current.onError());
    expect(result.current.reloadNonce).toBe(trasPrimero);

    act(() => { jest.advanceTimersByTime(5000); });
    act(() => result.current.onError());
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
  /**
   * Gasta los reintentos automáticos con el video siempre congelado.
   *
   * Hacen falta ~10 ciclos y no 3: cada remonte necesita DOS status para volver a
   * detectar la traba (el primero se ve como "posición nueva" porque `reset()`
   * dejó el último valor en -1, y recién el segundo confirma que no avanza).
   */
  function agotarReintentos(result: any) {
    for (let i = 0; i < 10; i++) {
      act(() => {
        jest.advanceTimersByTime(8000);
        result.current.onPlaybackStatusUpdate(cargado({ positionMillis: 5000 }));
      });
    }
  }

  it('tras varios intentos fallidos marca `stalled`', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(true));
    expect(result.current.stalled).toBe(false);

    agotarReintentos(result);

    expect(result.current.stalled).toBe(true);
    // Y deja de remontar: el bucle infinito es justo lo que se evita.
    const nonce = result.current.reloadNonce;
    act(() => {
      jest.advanceTimersByTime(8000);
      result.current.onPlaybackStatusUpdate(cargado({ positionMillis: 5000 }));
    });
    expect(result.current.reloadNonce).toBe(nonce);
  });

  it('el reintento manual limpia `stalled` y vuelve a intentar', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(true));
    agotarReintentos(result);
    const nonce = result.current.reloadNonce;

    act(() => result.current.retryNow());

    expect(result.current.stalled).toBe(false);
    expect(result.current.reloadNonce).toBeGreaterThan(nonce);
  });

  /**
   * Tres microcortes a lo largo de un partido entero NO deben acabar mostrando
   * el botón de recarga con el video reproduciéndose perfecto.
   */
  it('recuperarse de verdad resetea el contador', () => {
    const { result } = renderHook(() => useLiveStreamRecovery(true));

    // Dos trabas, y entre ellas el video vuelve a reproducir DE VERDAD: no basta
    // con un frame suelto, tiene que sostenerse más de `STABLE_MS` (ver la nota
    // en el hook sobre por qué el primer status tras un remonte no cuenta).
    for (let ciclo = 0; ciclo < 2; ciclo++) {
      act(() => {
        jest.advanceTimersByTime(8000);
        result.current.onPlaybackStatusUpdate(cargado({ positionMillis: 5000 }));
      });
      // Reproduciendo sostenido: 12 s avanzando de a 2 s.
      for (let i = 1; i <= 6; i++) {
        act(() => {
          jest.advanceTimersByTime(2000);
          result.current.onPlaybackStatusUpdate(cargado({ positionMillis: 10000 + ciclo * 100000 + i * 2000 }));
        });
      }
    }

    expect(result.current.stalled).toBe(false);
  });
});
