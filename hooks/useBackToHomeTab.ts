/**
 * useBackToHomeTab — el atrás del sistema, estando en un tab que no es Inicio,
 * lleva a Inicio en vez de cerrar la app.
 *
 * Es la jerarquía que la gente espera: primero se sale de la sección, después
 * de la app (de eso último se ocupa [[useDoubleBackToExit]], que sí corre en
 * Inicio).
 *
 * ⚠️ **El guard de foco no es opcional.** `MainPlayer` **no se desmonta** cuando
 * se apila una pantalla encima —un chat, el visor, el flujo de reserva—: sigue
 * montado abajo. Y los listeners de `hardwareBackPress` se invocan en **orden
 * inverso al de registro**, así que el de la pantalla tapada, registrado antes
 * de navegar, corre **primero** y se come el atrás de la pantalla de arriba.
 *
 * El síntoma real (2026-09-02): desde un chat, el primer toque de atrás no hacía
 * nada visible —solo cambiaba a Inicio el tab que estaba tapado— y el segundo
 * cerraba el chat dejándote en Inicio, en vez de volver a Chats.
 *
 * ⚠️ **Android únicamente.** `BackHandler` no hace nada en iOS.
 */
import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

/**
 * @param enabled Solo `true` cuando el tab activo NO es Inicio. En Inicio no hay
 *                a dónde volver dentro de la pantalla.
 * @param goHome  Lleva al tab Inicio.
 */
export function useBackToHomeTab(enabled: boolean, goHome: () => void) {
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!enabled || !isFocused || Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true; // consumido: sin esto el atrás cerraría la app
    });
    return () => sub.remove();
  }, [enabled, isFocused, goHome]);
}
