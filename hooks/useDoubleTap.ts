/**
 * useDoubleTap — dos toques seguidos sobre el mismo elemento.
 *
 * Devuelve un `onPress` listo para un `Pressable`. Se usa donde el gesto tiene
 * que ser **deliberado**: dar me gusta a un mensaje de chat, por ejemplo, donde
 * un toque simple se dispararía sin querer al scrollear o al tocar cerca.
 *
 * ⚠️ Se resuelve con un timestamp y no con `Gesture.Tap().numberOfTaps(2)` a
 * propósito: dentro de una `FlatList` un `GestureDetector` por fila compite con
 * el scroll de la lista, y el scroll tiene que ganar siempre.
 *
 * ⚠️ **No hay callback de toque simple.** Si hiciera falta, habría que esperar
 * la ventana entera antes de ejecutarlo, y esa demora se nota. Acá el toque
 * simple no hace nada, así que no hay nada que esperar.
 */
import { useCallback, useRef } from 'react';

/** Ventana entre los dos toques. El estándar de facto en móvil. */
const WINDOW_MS = 300;

export function useDoubleTap(onDoubleTap: () => void): () => void {
  const lastTapRef = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < WINDOW_MS) {
      // Se limpia para que un tercer toque no cuente como otro "doble".
      lastTapRef.current = 0;
      onDoubleTap();
      return;
    }
    lastTapRef.current = now;
  }, [onDoubleTap]);
}
