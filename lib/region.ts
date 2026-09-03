/**
 * Ciudad del jugador (`User.region`) y **si se muestra o no**.
 *
 * ## Por qué la visibilidad viaja dentro del propio string
 *
 * Mostrar la ciudad es opcional: tenerla cargada (para que la app sepa de dónde
 * eres) y enseñarla en tu perfil son dos decisiones distintas. Guardar esa
 * segunda decisión habría pedido una **columna nueva**, su migración y un campo
 * más en `UpdateUserDto` — todo para un booleano que solo lee la pantalla de
 * ajustes.
 *
 * En vez de eso se marca con un prefijo `~` en el string que ya existe:
 *
 *   `"Ciudad Guayana"`   → cargada y visible
 *   `"~Ciudad Guayana"`  → cargada y oculta
 *   `""`                 → sin cargar
 *
 * ⚠️ **Toda pantalla que MUESTRE la ciudad tiene que pasar por `unpackRegion`**,
 * o va a pintar un `~` delante; y si además es un perfil público, por
 * `isRegionVisible`. Un `owner.location` crudo enseña la ciudad de alguien que
 * pidió ocultarla — que es exactamente lo que este módulo evita.
 *
 * ⚠️ El `~` es un carácter que nadie escribe en el nombre de una ciudad, por eso
 * sirve de marca. Si algún día el dato pasa a tener su propia columna, hay que
 * migrar los valores existentes quitándoles el prefijo.
 */

const HIDDEN_PREFIX = '~';

/** ¿El usuario eligió mostrar su ciudad? Sin ciudad cargada, no hay nada que mostrar. */
export function isRegionVisible(raw?: string | null): boolean {
  if (!raw) return false;
  return !raw.startsWith(HIDDEN_PREFIX);
}

/** Texto de la ciudad, sin la marca de oculta. Vacío si no hay nada cargado. */
export function unpackRegion(raw?: string | null): string {
  if (!raw) return '';
  return raw.startsWith(HIDDEN_PREFIX) ? raw.slice(HIDDEN_PREFIX.length) : raw;
}

/** Ciudad + visibilidad → lo que se persiste en `User.region`. */
export function packRegion(city: string, visible: boolean): string {
  const clean = city.trim();
  if (!clean) return '';
  return visible ? clean : HIDDEN_PREFIX + clean;
}

/**
 * `"Ciudad Guayana 8050, Bolívar, Venezuela"` → `"Ciudad Guayana"`.
 *
 * Geoapify devuelve una entrada por **calle**, pero acá se elige una **ciudad**:
 * se toma el primer tramo y se le quita el código postal que suele venir pegado.
 */
export function cityFromSuggestion(s: { line2?: string; label?: string }): string {
  const fuente = s.line2 || s.label || '';
  return fuente.split(',')[0]?.replace(/\s+\d{3,}$/, '').trim() ?? '';
}
