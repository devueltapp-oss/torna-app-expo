/**
 * La barrita de arrastre de las hojas de abajo (ConfirmSheet, LevelPickerSheet,
 * ShareGameSheet, ApplyMatchSheet, UpcomingMatchSheet, ClubLocationSheet) era
 * decorativa en los DOS sistemas — no era "algo que se rompió en Android": no
 * hacía nada en ninguno de los dos. `shouldDismissSwipe` es la decisión (umbral
 * de distancia O fling rápido); el `PanResponder` que la usa no es testeable
 * directamente porque sus handlers expuestos solo reciben el `event` nativo —
 * el `gestureState` lo computa React Native del historial real de toques.
 */
import { renderHook } from '@testing-library/react-native';
import { shouldDismissSwipe, useSwipeToDismiss } from '../useSwipeToDismiss';

describe('shouldDismissSwipe', () => {
  it('un arrastre corto y lento NO cierra', () => {
    expect(shouldDismissSwipe(30, 0.1, 80)).toBe(false);
  });

  it('superar el umbral de distancia cierra, aunque sea lento', () => {
    expect(shouldDismissSwipe(120, 0.1, 80)).toBe(true);
  });

  it('un fling rápido y corto (poca distancia, alta velocidad) también cierra', () => {
    expect(shouldDismissSwipe(20, 1.5, 80)).toBe(true);
  });

  it('justo en el umbral exacto NO cierra (estrictamente mayor)', () => {
    expect(shouldDismissSwipe(80, 0, 80)).toBe(false);
  });
});

describe('useSwipeToDismiss', () => {
  it('devuelve un translateY animado y los panHandlers del PanResponder', () => {
    const { result } = renderHook(() => useSwipeToDismiss(jest.fn()));
    expect(result.current.translateY).toBeDefined();
    expect(typeof result.current.panHandlers).toBe('object');
    // Confirma que está montado sobre un PanResponder real, no un objeto vacío.
    expect(result.current.panHandlers.onMoveShouldSetResponder).toBeInstanceOf(Function);
    expect(result.current.panHandlers.onResponderRelease).toBeInstanceOf(Function);
  });
});
