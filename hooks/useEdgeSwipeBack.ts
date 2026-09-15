import React from 'react';
import { Gesture } from 'react-native-gesture-handler';

// Ancho de la franja donde puede arrancar el gesto — el back nativo de iOS
// también se activa desde el borde, no desde cualquier punto de la pantalla.
const EDGE_WIDTH = 24;
// Mismo umbral que ya usa `PlayerOwnProfileScreen` para su swipe entre
// Highlights/Partidos (`Math.abs(e.translationX) > 60`).
const BACK_DISTANCE = 60;

/**
 * Retroceso estilo iPhone (deslizar desde el borde izquierdo) para pantallas
 * que viven como estado local dentro de `MainPlayer` — Biblioteca y
 * Configuración de perfil — en vez de una `AppStack.Screen` real.
 *
 * Esas SÍ tendrían el swipe-back nativo de `native-stack` gratis (ver el
 * patrón de `FollowListScreen`), pero convertirlas también en rutas apiladas
 * les haría perder la tab bar fija mientras se navegan — justo lo que se
 * acaba de arreglar (ver `AnimatedTabPane`). Este hook reproduce el gesto sin
 * ese costo: `.activeOffsetX`/`.failOffsetY` calcan el mismo patrón que el
 * swipe de tabs de `PlayerOwnProfileScreen`, para no pelear con el scroll
 * vertical del contenido.
 */
export function useEdgeSwipeBack(onBack: () => void) {
  const startedAtEdge = React.useRef(false);

  return React.useMemo(() => Gesture.Pan()
    .onBegin((e) => { startedAtEdge.current = e.x <= EDGE_WIDTH; })
    .activeOffsetX([10, 1000])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (startedAtEdge.current && e.translationX > BACK_DISTANCE) onBack();
    }), [onBack]);
}
