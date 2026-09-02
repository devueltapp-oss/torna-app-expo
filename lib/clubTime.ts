/**
 * Horarios de partidas: formatear **la hora del club**, no la del teléfono.
 *
 * ## El bug que esto arregla (2026-09-02)
 *
 * Una reserva de las **12:30** se mostraba como **08:30** en un teléfono en
 * Venezuela (UTC−4).
 *
 * La causa no es el guardado: es el **formateo**. El backend guarda el horario
 * de una partida como *wall-clock del club escrito en UTC* — `reserve()` compone
 * `new Date("2026-09-02T12:30:00")` en la hora del server (el droplet corre en
 * UTC) y queda `2026-09-02T12:30:00.000Z`. La grilla de `getSlots` usa la misma
 * base, y el desktop lo dice explícito en `dateBlocks.js`: *"un bloque '08:00'
 * es 08:00Z"*.
 *
 * O sea: **el `12:30Z` es una ETIQUETA, no un instante para convertir.**
 * `toLocaleTimeString()` lo trataba como instante y le restaba el offset del
 * dispositivo → 08:30. Formateando en UTC se lee la etiqueta tal cual: 12:30.
 *
 * ## Cuándo NO usar esto
 *
 * Solo para horarios **agendados** de partidas (`scheduledStartAt/EndAt`, slots).
 * Los timestamps que son instantes de verdad —mensajes de chat, "hace 5 min" de
 * una notificación, fecha de un highlight— **sí** deben ir en la hora local del
 * dispositivo, y para eso se sigue usando `toLocaleTimeString()` a secas.
 *
 * ⚠️ Si algún día el backend pasa a guardar instantes reales con zona (o a usar
 * `CLUB_TIME_ZONE` en `reserve`/`getSlots`), esto hay que revertirlo **junto con
 * ese cambio**: quedarse a mitad de camino corre todos los horarios de nuevo.
 */

/** `2026-09-02T12:30:00.000Z` → `"12:30"`. Devuelve `'—'` si no hay dato o es inválido. */
export function formatClubTime(iso?: string | null): string {
  const d = toDate(iso);
  if (!d) return '—';
  return d.toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });
}

/** `2026-09-02T12:30:00.000Z` → `"2 sept"`. `undefined` si no hay dato. */
export function formatClubDate(iso?: string | null): string | undefined {
  const d = toDate(iso);
  if (!d) return undefined;
  return d.toLocaleDateString('es', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function toDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
