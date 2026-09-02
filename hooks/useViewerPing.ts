/**
 * useViewerPing — "estoy mirando esta partida", cada 30s.
 *
 * Es lo único que hace que el contador de espectadores exista: el backend guarda la
 * presencia en Redis (ventana de 90s, deduplicada por usuario) y devuelve el conteo
 * **en la respuesta del propio latido**, así mostrarlo no cuesta un request extra.
 *
 * Reglas:
 *  - Solo late con la pantalla **enfocada** (`useIsFocused`) y la app en **primer
 *    plano** (`AppState`). Cerrar la app deja de latir y a los 90s desaparecés del
 *    conteo solo, sin que haya que avisar nada al salir.
 *  - Late al montar, no recién a los 30s: si no, entrar al visor y salir a los 20s
 *    no contaría nunca.
 *  - `viewers === null` = el backend no puede saberlo (sin Redis o Redis caído). El
 *    llamador **no muestra nada**; un 0 inventado sería peor.
 *
 * ⚠️ `PING_MS` está atado a la ventana del backend (`PresenceService.WINDOW_MS`, 3×
 * este valor). Si lo subís acá sin subirla allá, la gente se cae del conteo entre
 * latido y latido.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { pingViewer } from '../api/games';

const PING_MS = 30_000;

export function useViewerPing(gameId: string | undefined, enabled: boolean) {
  const [viewers, setViewers] = useState<number | null>(null);
  const isFocused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  // El timer se recrea al cambiar cualquier gate; el ref evita setState tras desmontar.
  const aliveRef = useRef(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) =>
      setActive(s === 'active'),
    );
    return () => sub.remove();
  }, []);

  const beat = useCallback(async () => {
    if (!gameId) return;
    try {
      const { viewers: n } = await pingViewer(gameId);
      if (aliveRef.current) setViewers(typeof n === 'number' ? n : null);
    } catch {
      // Un ping perdido no es un error para el usuario: el visor sigue andando y el
      // siguiente latido corrige. Se deja de mostrar el número, no se muestra viejo.
      if (aliveRef.current) setViewers(null);
    }
  }, [gameId]);

  useEffect(() => {
    aliveRef.current = true;
    if (!enabled || !gameId || !isFocused || !active) {
      return () => { aliveRef.current = false; };
    }
    beat(); // al entrar, no a los 30s
    const timer = setInterval(beat, PING_MS);
    return () => {
      aliveRef.current = false;
      clearInterval(timer);
    };
  }, [enabled, gameId, isFocused, active, beat]);

  return viewers;
}
