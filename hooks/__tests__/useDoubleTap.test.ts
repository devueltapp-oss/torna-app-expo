/**
 * `useDoubleTap` es lo que reemplazó al corazón bajo cada mensaje: el me gusta
 * de un chat se da tocando dos veces la burbuja. Lo que hay que fijar acá es
 * sobre todo el **falso positivo**: un toque suelto —el que uno da sin querer
 * al scrollear una lista— no puede likear nada.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useDoubleTap } from '../useDoubleTap';

describe('useDoubleTap', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('un solo toque no dispara nada', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap));

    act(() => { result.current(); });
    act(() => { jest.advanceTimersByTime(2000); });

    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('dos toques seguidos disparan una vez', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap));

    act(() => { result.current(); });
    act(() => { jest.advanceTimersByTime(120); });
    act(() => { result.current(); });

    expect(onDoubleTap).toHaveBeenCalledTimes(1);
  });

  it('dos toques separados NO cuentan como doble', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap));

    act(() => { result.current(); });
    act(() => { jest.advanceTimersByTime(800); });
    act(() => { result.current(); });

    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  /**
   * Tres toques rápidos son UN doble, no uno y medio: si el tercero volviera a
   * contar contra el segundo, un triple toque haría like y unlike al hilo y el
   * mensaje quedaría como estaba, sin que se entienda por qué.
   */
  it('tres toques rápidos disparan una sola vez', () => {
    const onDoubleTap = jest.fn();
    const { result } = renderHook(() => useDoubleTap(onDoubleTap));

    act(() => { result.current(); });
    act(() => { jest.advanceTimersByTime(100); });
    act(() => { result.current(); });
    act(() => { jest.advanceTimersByTime(100); });
    act(() => { result.current(); });

    expect(onDoubleTap).toHaveBeenCalledTimes(1);
  });
});
