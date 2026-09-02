/**
 * Dónde está el teléfono, para el aviso de partidas abiertas cercanas.
 *
 * **Nunca lanza y nunca bloquea la app.** Todo devuelve `null` (o un motivo) en
 * vez de propagar: la ubicación es un extra sobre una app que funciona sin ella,
 * y un GPS lento o un permiso denegado no puede dejar una pantalla colgada.
 *
 * ⚠️ La posición **no se guarda en el dispositivo ni se muestra en ninguna
 * pantalla**. Su único destino es `PUT /nearby/location`, que la redondea a
 * ~110 m antes de escribirla. No agregues acá un "jugadores cerca de mí": el
 * requisito es notificar a quien está cerca, no ubicar a nadie.
 */
import * as Location from 'expo-location';

/**
 * Precisión pedida al OS. **`Balanced` (~100 m), no `High`.**
 *
 * El radio del aviso es de 25 km y el backend redondea a 110 m: pedir precisión
 * de metros gastaría batería para producir dígitos que se descartan en la
 * siguiente línea del pipeline.
 */
const ACCURACY = Location.Accuracy.Balanced;

/**
 * Tope de espera de una lectura fresca. Pasado esto se sigue sin ubicación: el
 * usuario está usando la app, no esperando a un mapa.
 */
const FIX_TIMEOUT_MS = 10000;

export interface Coords {
  latitude: number;
  longitude: number;
}

export type LocationDenial = 'denied' | 'unavailable';

export interface LocationResult {
  coords: Coords | null;
  /** Por qué no hay coords. `denied` se arregla en Ajustes del sistema; `unavailable`, saliendo al aire libre. */
  reason: LocationDenial | null;
}

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

/**
 * ¿Ya tenemos permiso, sin preguntar?
 *
 * Existe para el latido de fondo: al volver del segundo plano queremos refrescar
 * la posición **solo si el usuario ya dijo que sí**. Usar `request…` ahí
 * dispararía el diálogo del sistema sin que nadie haya tocado nada.
 */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

/**
 * Pide el permiso (si hace falta) y devuelve la posición.
 *
 * Se llama **solo** desde el toggle de ajustes: es el momento en que el usuario
 * acaba de pedir la función, que es el único contexto en el que el diálogo del
 * sistema se entiende. iOS da un solo prompt por instalación; quemarlo en el
 * arranque lo desperdicia.
 */
export async function requestPositionOnce(): Promise<LocationResult> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return { coords: null, reason: 'denied' };
    return await readPosition();
  } catch {
    return { coords: null, reason: 'unavailable' };
  }
}

/**
 * Posición sin pedir permiso: si no está concedido, devuelve `denied` y ya.
 * Es la que usa el latido al volver al primer plano.
 */
export async function currentPosition(): Promise<LocationResult> {
  if (!(await hasLocationPermission())) return { coords: null, reason: 'denied' };
  return readPosition();
}

/**
 * Dónde está el teléfono **ahora mismo y con precisión**, para fijar el pin de
 * un club.
 *
 * Deliberadamente **no** usa la última posición conocida, que es justo lo que
 * hace rápida a `currentPosition`. Para decidir si estás dentro de un radio de
 * 25 km, una posición de hace horas sigue valiendo —la ciudad no cambió—; para
 * decir "el club está acá" es una respuesta falsa, y dejaría el pin en el lugar
 * donde estuviste, no donde estás. Vale más tardar unos segundos que mandar a la
 * gente al barrio equivocado.
 *
 * Por lo mismo pide `Accuracy.High`: acá los metros sí importan — esta
 * coordenada se guarda **exacta** y termina en un pin de Google Maps.
 *
 * Nunca lanza. Pide permiso: se llama desde un botón que el usuario acaba de
 * tocar, que es el único contexto donde el diálogo del sistema se entiende.
 */
export async function precisePosition(): Promise<LocationResult> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return { coords: null, reason: 'denied' };

    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      FIX_TIMEOUT_MS,
    );
    if (!position?.coords) return { coords: null, reason: 'unavailable' };

    return {
      coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      reason: null,
    };
  } catch {
    return { coords: null, reason: 'unavailable' };
  }
}

/**
 * Última conocida primero, lectura fresca como respaldo.
 *
 * La última conocida es instantánea y no enciende el GPS. Para decidir si estás
 * dentro de un radio de 25 km, una posición de hace un rato sirve igual — la
 * ciudad no cambió—, y encender el GPS cada vez que la app vuelve al primer
 * plano costaría batería a cambio de nada.
 */
async function readPosition(): Promise<LocationResult> {
  try {
    const last = await withTimeout(Location.getLastKnownPositionAsync({}), 3000);
    const position =
      last ?? (await withTimeout(Location.getCurrentPositionAsync({ accuracy: ACCURACY }), FIX_TIMEOUT_MS));

    if (!position?.coords) return { coords: null, reason: 'unavailable' };
    return {
      coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      reason: null,
    };
  } catch {
    return { coords: null, reason: 'unavailable' };
  }
}
