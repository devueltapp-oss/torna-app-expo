import React from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

// Pedido 2026-09-12: transición sutil entre Inicio/Juegos/Chats/Perfil, estilo
// Instagram/X — nada de slide de pantalla completa. 180ms, ±8px, easing
// equivalente a cubic-bezier(0.2, 0, 0, 1).
const DURATION = 180;
const OFFSET = 8;
const EASING = Easing.bezier(0.2, 0, 0, 1);

interface Props {
  active: boolean;
  /**
   * +1 si este tab se activó viniendo de uno a su izquierda en el orden de la
   * tab bar, -1 si vino de uno a su derecha. El pane que sale se mueve hacia
   * el lado opuesto de por donde entra el que lo reemplaza — mismo `direction`
   * para los dos, calculado una vez por el contenedor (`MainPlayer`).
   */
  direction: 1 | -1;
  children: React.ReactNode;
}

/**
 * Mantiene el contenido de un tab SIEMPRE MONTADO una vez visitado (preserva
 * scroll, filtros, datos ya cargados — pedido explícito del usuario) y anima
 * únicamente la aparición/desaparición: fade + un desplazamiento lateral
 * mínimo. No usa `display:none` en ningún momento: el pane sigue vivo debajo,
 * solo con `pointerEvents="none"` y opacidad 0.
 *
 * Monta de forma perezosa (recién en su primera visita) — así el usuario no
 * paga por las 4 pantallas completas si nunca abre alguna.
 */
export function AnimatedTabPane({ active, direction, children }: Props) {
  const opacity = React.useRef(new Animated.Value(active ? 1 : 0)).current;
  const translateX = React.useRef(new Animated.Value(0)).current;
  const [everMounted, setEverMounted] = React.useState(active);
  const isFirstRun = React.useRef(true);

  React.useEffect(() => {
    if (active) setEverMounted(true);

    if (isFirstRun.current) {
      // Estado inicial (el tab con el que arranca la app): sin animación de
      // entrada — ya nace visible o ya nace oculto.
      isFirstRun.current = false;
      return;
    }

    if (active) {
      translateX.setValue(direction * OFFSET);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: DURATION, easing: EASING, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: DURATION, easing: EASING, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: DURATION, easing: EASING, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: direction * -OFFSET, duration: DURATION, easing: EASING, useNativeDriver: true }),
      ]).start(() => {
        // Vuelve al centro sin animar, lista para la próxima entrada.
        translateX.setValue(0);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // El wrapper animado se monta SIEMPRE, desde el primer render: si en cambio
  // el `return null` de más abajo también lo hubiera afectado, la primera vez
  // que un tab pasa a activo el `Animated.timing` arrancaría sobre un
  // `Animated.View` que todavía no existe en el árbol. Lo único perezoso es
  // el contenido pesado de adentro (`children`).
  return (
    <Animated.View
      pointerEvents={active ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        { opacity, transform: [{ translateX }], zIndex: active ? 2 : 1 },
      ]}
    >
      {everMounted ? children : null}
    </Animated.View>
  );
}
