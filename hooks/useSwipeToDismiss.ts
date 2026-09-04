/**
 * useSwipeToDismiss — deslizar hacia abajo desde la barrita de arriba para
 * cerrar una hoja (ConfirmSheet, LevelPickerSheet, ShareGameSheet,
 * ApplyMatchSheet, UpcomingMatchSheet, ClubLocationSheet).
 *
 * ⚠️ Esa barrita (`width: 40, height: 4, borderRadius: 2`) era puramente
 * decorativa en los DOS sistemas — no había ni `PanResponder` ni
 * `GestureDetector` en ningún lado. No es "algo que se configuró para iOS y
 * se rompió en Android": nunca hizo nada en ninguno de los dos. `PanResponder`
 * es de React Native core (no depende de gesture-handler) y funciona igual en
 * ambos.
 *
 * El gesto se toma SOLO desde la zona del handle (no del cuerpo entero de la
 * hoja) para no competir con el scroll de la lista que suele haber debajo.
 */
import { useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

/**
 * Decisión pura, separada del `PanResponder`: los handlers que expone
 * `PanResponder.create()` (`onResponderRelease`, etc.) solo reciben el
 * `event` nativo — el `gestureState` lo computa la librería internamente a
 * partir del historial real de toques, así que no se puede simular pasándole
 * un objeto de prueba. Esta función es lo único testeable sin reconstruir esa
 * mecánica; el `PanResponder` de abajo es una envoltura fina alrededor suyo.
 */
export function shouldDismissSwipe(dy: number, vy: number, threshold: number): boolean {
  return dy > threshold || vy > 0.8;
}

export function useSwipeToDismiss(onDismiss: () => void, threshold = 80) {
  const translateY = useRef(new Animated.Value(0)).current;
  // El PanResponder se crea una sola vez (`useRef`); este ref lo puentea con
  // la versión vigente de `onDismiss`, que cambia de identidad en cada
  // render (mismo patrón que `togglePausedRef` en GameDetailScreen).
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const springBack = () => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        // Umbral de distancia O un fling rápido hacia abajo, lo que llegue
        // primero — un swipe corto pero veloz debe cerrar igual que uno largo.
        const dismiss = shouldDismissSwipe(g.dy, g.vy, threshold);
        springBack();
        if (dismiss) onDismissRef.current();
      },
      onPanResponderTerminate: springBack,
    }),
  ).current;

  return { translateY, panHandlers: panResponder.panHandlers };
}
