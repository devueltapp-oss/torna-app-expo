/**
 * Horario semanal de una cancha — mismo modelo que `ScheduleDialog.jsx` /
 * `WeeklyScheduleFields.jsx` del desktop: 7 días, minutos desde medianoche
 * (no `"HH:MM"`), cada uno con `isOpen` + `openMinute`/`closeMinute`.
 */

export interface DaySchedule {
  dayOfWeek: number; // 0 = domingo ... 6 = sábado (igual que Date.getDay())
  isOpen: boolean;
  openMinute: number;
  closeMinute: number;
}

export const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const DEFAULT_OPEN_MINUTE = 8 * 60;   // 08:00
export const DEFAULT_CLOSE_MINUTE = 22 * 60; // 22:00

/** 7 filas Dom→Sáb con un horario default, para cuando la cancha no tiene nada configurado. */
export function defaultWeekSchedule(): DaySchedule[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek, isOpen: dayOfWeek !== 0, // cerrado domingo por default; el resto abierto
    openMinute: DEFAULT_OPEN_MINUTE, closeMinute: DEFAULT_CLOSE_MINUTE,
  }));
}

/** Completa días faltantes con el default y ordena 0→6 — el backend puede no traer las 7. */
export function normalizeDays(days: DaySchedule[] | undefined | null): DaySchedule[] {
  const fallback = defaultWeekSchedule();
  if (!days?.length) return fallback;
  return fallback.map((d) => days.find((x) => x.dayOfWeek === d.dayOfWeek) ?? d);
}

/** `510` → `"08:30"`. */
export function minuteToLabel(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Opciones de horario cada 30 min, de 00:00 a 23:30, para el selector. */
export const TIME_OPTIONS: number[] = Array.from({ length: 48 }, (_, i) => i * 30);

/** `'2026-09-02'` → `"2 sept"` (fecha de excepción, sin horas — ya es un día concreto). */
export function formatExceptionDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
