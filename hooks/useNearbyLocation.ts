/**
 * useNearbyLocation — mantiene fresca la posición que usa el aviso de partidas
 * abiertas cercanas, y expone el toggle de ajustes.
 *
 * Dos piezas que van juntas y por eso viven en un solo hook:
 *
 *  1. **El latido.** Con el opt-in activo, al abrir la app y cada vez que vuelve
 *     al primer plano se reporta la posición (`PUT /nearby/location`). El backend
 *     la redondea a ~110 m y la caduca a los 14 días: sin refresco, el jugador
 *     se cae solo del fan-out.
 *  2. **El toggle.** Encenderlo pide el permiso del sistema *en contexto* y
 *     reporta la primera posición; apagarlo borra la guardada en el servidor.
 *
 * ⚠️ **No hay `watchPositionAsync`.** Seguir la posición en continuo es lo que la
 * gente entiende por "app que me rastrea", gasta batería, y no cambiaría ni un
 * resultado: la decisión que alimenta es "¿estás dentro de 25 km de esta cancha?",
 * y eso no se mueve entre dos aperturas de la app. "Tiempo real" acá significa
 * *actualizada*, no *continua*.
 *
 * ⚠️ **Nunca pide permiso solo.** El latido usa `currentPosition`, que devuelve
 * `denied` si no está concedido en vez de abrir el diálogo del sistema. El único
 * que pregunta es `enable()`, o sea el toggle que el usuario acaba de tocar.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearMyLocation,
  fetchNearbySettings,
  setNearbyEnabled,
  updateMyLocation,
  type NearbySettings,
} from '../api/nearby';
import { currentPosition, requestPositionOnce } from '../lib/location';

/**
 * Piso entre dos reportes. Volver al primer plano diez veces en una hora no son
 * diez escrituras: la ventana del backend es de días, no de minutos.
 */
const MIN_REPORT_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Se descartó el ofrecimiento de la pestaña Juegos.
 *
 * Va en `AsyncStorage` y no en estado: descartar tiene que ser **definitivo**.
 * Volver a proponer algo que el usuario ya rechazó es cómo una app se gana que
 * la silencien — y el toggle sigue estando en Ajustes para quien cambie de idea.
 */
const PROMPT_DISMISSED_KEY = '@torna/nearby-prompt-dismissed';

export interface UseNearbyLocation {
  settings: NearbySettings | null;
  loading: boolean;
  /** Motivo por el que el aviso está activo pero sin posición. Se muestra en ajustes. */
  problem: 'denied' | 'unavailable' | null;
  /** Enciende el aviso: pide permiso, reporta la primera posición. */
  enable: () => Promise<void>;
  /** Apaga el aviso y borra la posición guardada en el backend. */
  disable: () => Promise<void>;
  /**
   * ¿Mostrar el ofrecimiento de la pestaña Juegos? Solo si el aviso está
   * apagado y nunca se descartó. `false` mientras carga, para que la tarjeta no
   * aparezca y desaparezca.
   */
  shouldPrompt: boolean;
  /** Descarta el ofrecimiento para siempre (persistido). */
  dismissPrompt: () => void;
}

export function useNearbyLocation(enabledForUser: boolean): UseNearbyLocation {
  const [settings, setSettings] = useState<NearbySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<'denied' | 'unavailable' | null>(null);
  // `null` = todavía no sabemos si lo descartó. Se distingue de `true`/`false`
  // para no parpadear la tarjeta en el primer render.
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const lastReportRef = useRef(0);
  const aliveRef = useRef(true);
  // El listener de AppState se registra una sola vez y tiene que leer el estado
  // ACTUAL del opt-in. Un ref y no el state: leerlo desde el updater de
  // `setSettings` metería un efecto dentro de un reducer (React puede llamarlo
  // dos veces), y meterlo en las deps del efecto re-registraría el listener en
  // cada cambio.
  const enabledRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabledForUser) return;
    AsyncStorage.getItem(PROMPT_DISMISSED_KEY)
      .then((v) => {
        if (aliveRef.current) setDismissed(v === '1');
      })
      // Si no se puede leer, se asume descartado: es preferible no ofrecerlo a
      // ofrecerlo en bucle en cada arranque.
      .catch(() => {
        if (aliveRef.current) setDismissed(true);
      });
  }, [enabledForUser]);

  const dismissPrompt = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(PROMPT_DISMISSED_KEY, '1').catch(() => {
      // Best-effort: si no persiste, vuelve a aparecer en el próximo arranque.
    });
  }, []);

  /** Único lugar donde el estado y el ref del opt-in se mueven juntos. */
  const apply = useCallback((next: NearbySettings) => {
    enabledRef.current = next.enabled;
    if (aliveRef.current) setSettings(next);
  }, []);

  /** Reporta la posición si corresponde. Best-effort: nunca lanza ni bloquea. */
  const report = useCallback(async (force = false) => {
    if (!force && Date.now() - lastReportRef.current < MIN_REPORT_INTERVAL_MS) return;

    const { coords, reason } = await currentPosition();
    if (!coords) {
      if (aliveRef.current) setProblem(reason);
      return;
    }
    try {
      const next = await updateMyLocation(coords.latitude, coords.longitude);
      lastReportRef.current = Date.now();
      apply(next);
      if (aliveRef.current) setProblem(null);
    } catch {
      // Un reporte perdido no es un error para el usuario: la posición anterior
      // sigue valiendo hasta que caduque, y la próxima apertura reintenta.
    }
  }, [apply]);

  // Carga inicial + latido al volver al primer plano.
  useEffect(() => {
    if (!enabledForUser) {
      enabledRef.current = false;
      setSettings(null);
      return;
    }

    let cancelled = false;
    fetchNearbySettings()
      .then((s) => {
        if (cancelled || !aliveRef.current) return;
        apply(s);
        if (s.enabled) void report(true);
      })
      .catch(() => {
        // Sin ajustes no se puede decidir nada; el toggle queda apagado, que es
        // el default real. Reintenta en la próxima apertura.
      });

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && enabledRef.current) void report();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [enabledForUser, report, apply]);

  const enable = useCallback(async () => {
    setLoading(true);
    try {
      // El permiso primero: si el usuario lo rechaza, no tiene sentido dejar el
      // flag encendido en el servidor — quedaría un opt-in que no puede producir
      // ni un solo aviso, y el toggle mentiría.
      const { coords, reason } = await requestPositionOnce();
      if (!coords) {
        if (aliveRef.current) setProblem(reason);
        return;
      }
      const afterFlag = await setNearbyEnabled(true);
      const afterCoords = await updateMyLocation(coords.latitude, coords.longitude);
      lastReportRef.current = Date.now();
      apply(afterCoords ?? afterFlag);
      if (aliveRef.current) setProblem(null);
    } catch (e) {
      if (aliveRef.current) setProblem('unavailable');
      throw e;
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [apply]);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      // `setEnabled(false)` ya borra las coordenadas del lado del servidor; esto
      // deja el estado local coherente sin un segundo round-trip.
      const next = await setNearbyEnabled(false);
      lastReportRef.current = 0;
      apply(next);
      if (aliveRef.current) setProblem(null);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [apply]);

  return {
    settings,
    loading,
    problem,
    enable,
    disable,
    // Solo cuando ya sabemos las dos cosas: que el aviso está apagado y que no
    // lo descartó. Mientras alguna esté cargando, no se ofrece nada.
    shouldPrompt: dismissed === false && settings?.enabled === false,
    dismissPrompt,
  };
}

/**
 * Olvida la posición al cerrar sesión, igual que el `notificationId`.
 *
 * Sin esto, la cuenta que se fue seguiría figurando en la zona donde se usó ese
 * teléfono por última vez, hasta que caduque sola a los 14 días.
 *
 * Best-effort: un logout no puede fallar porque el servidor no contestó.
 */
export async function forgetLocationOnLogout(): Promise<void> {
  await clearMyLocation().catch(() => {});
}
