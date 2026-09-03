/**
 * useDoubleBackToExit — "Toca atrás otra vez para salir".
 *
 * En la pantalla raíz de un tab no hay a dónde volver, así que el botón atrás
 * del sistema cerraría la app de un toque. Con la app llena de contenido en
 * curso —un partido en vivo, un comentario a medio escribir— salir por accidente
 * es caro. Este hook exige **dos toques seguidos** y avisa entre uno y otro.
 *
 * ⚠️ **Solo para la pantalla de Inicio**, y solo cuando está enfocada. En el
 * resto de las pantallas el atrás tiene que navegar hacia atrás como siempre:
 * pedir doble toque ahí sería un estorbo, no una protección.
 *
 * ⚠️ **Android únicamente.** iOS no tiene botón atrás de sistema y
 * `BackHandler` no hace nada ahí; en iOS se sale con el gesto de home, que el
 * sistema ya maneja.
 */
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

/** Ventana para el segundo toque. Más y deja de sentirse como "dos veces seguidas". */
const WINDOW_MS = 2000;

export function useDoubleBackToExit(enabled: boolean) {
  const lastPressRef = useRef(0);
  const isFocused = useIsFocused();

  const onBack = useCallback(() => {
    const now = Date.now();
    if (now - lastPressRef.current < WINDOW_MS) {
      // Segundo toque dentro de la ventana: se deja salir.
      BackHandler.exitApp();
      return true;
    }
    lastPressRef.current = now;
    ToastAndroid.show('Toca atrás otra vez para salir', ToastAndroid.SHORT);
    // `true` = consumido: sin esto el primer toque ya cerraría la app.
    return true;
  }, []);

  useEffect(() => {
    if (!enabled || !isFocused || Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [enabled, isFocused, onBack]);
}
