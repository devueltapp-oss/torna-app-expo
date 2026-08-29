/**
 * Lógica pura del módulo de RESERVAS — sin dependencias de React/RN, testeable.
 *
 * Dos partes:
 *
 *  1. `generateSlots` — **homologada 1:1 con el backend** que sirve los slots
 *     (`torna-api/src/padel-court/padel-court.service.ts` → `PadelCourtService.getSlots`),
 *     que a su vez refleja el horario que el **desktop** configura por cancha
 *     (`torna-desktop` → `settings/ScheduleDialog` semanal + `ExceptionsDialog`
 *     por fecha + `blockMinutes`/`pricePerBlock`). La app normalmente CONSUME los
 *     slots del backend (`GET /padel-court/:id/slots?date=`); esta función replica
 *     el mismo algoritmo para poder validarlos/predecirlos y para tener el contrato
 *     bajo test (que app y backend/desktop no se desincronicen).
 *
 *  2. Multibloque + agrupado por bloque — los helpers que usa `ReserveBlocksScreen`
 *     para armar la grilla de bloques del día (espejo de `BloquesDisponibles` del
 *     desktop) y para combinar 1–4
 *     bloques libres consecutivos en un "slot combinado" (lo que se envía a
 *     `POST /game/reserve` con `durationMinutes = blockMinutes × N`, que el backend
 *     valida: múltiplo del bloque, 1–4, dentro del horario y cancha activa).
 */
import type { Slot } from '../data/types';

/** Máximo de bloques consecutivos que se pueden reservar de una (espejo del backend). */
export const MAX_BLOCKS = 4;

/** Horario de un día: minutos desde medianoche (480 = 08:00, 1320 = 22:00). */
export interface DaySchedule {
  isOpen: boolean;
  openMinute: number;
  closeMinute: number;
}

/** Config de reserva de la cancha (viene del desktop → backend). */
export interface CourtReservationConfig {
  isActive: boolean;
  blockMinutes: number;
  pricePerBlock: number;
  hasCameras?: boolean;
}

/** Intervalo ocupado por un Game programado/en curso, en minutos desde medianoche. */
export interface BusyInterval {
  startMinute: number;
  endMinute: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 500 → '08:20'. Espejo del `pad(...)` del backend. */
export function minutesToHHmm(mins: number): string {
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

/** 'HH:mm' → minutos desde medianoche ('08:00' → 480). */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Horario efectivo del día: la **excepción de la fecha prevalece** sobre el
 * semanal. Espejo exacto de `const day = court.exceptions[0] ?? court.schedules[0]`
 * en el backend `getSlots`.
 */
export function resolveDaySchedule(
  weekly: DaySchedule | null | undefined,
  exception?: DaySchedule | null,
): DaySchedule | null {
  return exception ?? weekly ?? null;
}

/**
 * Genera la grilla de slots de una cancha para un día. **Homologado 1:1 con
 * `PadelCourtService.getSlots`** del backend:
 *
 *  - `[]` si la cancha está inactiva, no hay horario, o el día está cerrado.
 *  - Bloques de `blockMinutes` desde `openMinute` mientras
 *    `mins + blockMinutes <= closeMinute` (el último bloque parcial NO entra).
 *  - `status: 'reserved'` si el bloque solapa un Game (`start < slotEnd && end > slotStart`),
 *    si no `'free'`. `price = pricePerBlock`, `cams = hasCameras`.
 */
export function generateSlots(
  config: CourtReservationConfig,
  day: DaySchedule | null,
  busy: BusyInterval[] = [],
): Slot[] {
  if (!config.isActive || !day || !day.isOpen) return [];
  const DURATION = config.blockMinutes;
  if (DURATION <= 0) return [];

  const slots: Slot[] = [];
  for (let mins = day.openMinute; mins + DURATION <= day.closeMinute; mins += DURATION) {
    const start = mins;
    const end = mins + DURATION;
    // Solapamiento: mismo criterio de intervalos abiertos que el backend.
    const overlaps = busy.some((b) => b.startMinute < end && b.endMinute > start);
    slots.push({
      start: minutesToHHmm(start),
      end: minutesToHHmm(end),
      duration: DURATION,
      price: config.pricePerBlock,
      status: overlaps ? 'reserved' : 'free',
      cams: !!config.hasCameras,
    });
  }
  return slots;
}

/* ─────────── Bloques del día (vista por horario, no por cancha) ─────────── */

/** Slots de UNA cancha para un día, tal como los devuelve `GET /padel-court/:id/slots`. */
export interface CourtSlots<C extends { id: string }> {
  court: C;
  slots: Slot[];
}

/** Una cancha dentro de un bloque + el índice del slot en la grilla de esa cancha. */
export interface BlockCourt<C extends { id: string }> {
  court: C;
  slot: Slot;
  /** Índice del slot dentro de `CourtSlots.slots` — necesario para el multibloque. */
  index: number;
}

/** Un horario del día (ej. 09:00–10:30) con la disponibilidad de cada cancha. */
export interface TimeBlock<C extends { id: string }> {
  /** `start-end`, estable entre renders. */
  key: string;
  start: string;
  end: string;
  duration: number;
  items: BlockCourt<C>[];
}

/**
 * Agrupa los slots de varias canchas en **bloques por horario** — la misma cuenta que
 * hace el desktop en `BloquesDisponibles` (`agruparPorBloque`): un bloque por cada
 * `{start,end}` distinto, con una entrada por cancha que lo ofrece. Ordenados por hora.
 *
 * ⚠️ Dos canchas con `blockMinutes` distinto NO comparten fila: se agrupa por
 * `{start,end}` exacto (mismo comportamiento que el desktop).
 */
export function groupSlotsIntoBlocks<C extends { id: string }>(
  perCourt: CourtSlots<C>[],
): TimeBlock<C>[] {
  const byKey = new Map<string, TimeBlock<C>>();
  perCourt.forEach(({ court, slots }) => {
    slots.forEach((slot, index) => {
      const key = `${slot.start}-${slot.end}`;
      if (!byKey.has(key)) {
        byKey.set(key, { key, start: slot.start, end: slot.end, duration: slot.duration, items: [] });
      }
      byKey.get(key)!.items.push({ court, slot, index });
    });
  });
  return Array.from(byKey.values()).sort((a, b) => a.start.localeCompare(b.start));
}

/** Canchas libres / totales de un bloque. Libre = `status === 'free'`. */
export function blockAvailability<C extends { id: string }>(
  block: TimeBlock<C>,
): { free: number; total: number } {
  return {
    free: block.items.filter((i) => i.slot.status === 'free').length,
    total: block.items.length,
  };
}

/** Índice del primer slot libre (o 0 si no hay ninguno). */
export function firstFreeIndex(slots: Slot[]): number {
  const i = slots.findIndex((s) => s.status === 'free');
  return i >= 0 ? i : 0;
}

/**
 * Cantidad de bloques LIBRES consecutivos desde `startIdx` (tope `cap`, mínimo 1).
 * Se corta en el primer slot no-libre. Es lo que limita el selector de duración.
 */
export function maxConsecutiveFreeBlocks(
  slots: Slot[],
  startIdx: number,
  cap: number = MAX_BLOCKS,
): number {
  let n = 0;
  for (let i = startIdx; i < slots.length && n < cap; i++) {
    if (slots[i]?.status !== 'free') break;
    n++;
  }
  return Math.max(1, n);
}

/**
 * "Slot combinado" de `blocks` bloques desde `startIdx`: mismo inicio, fin del
 * último bloque, `duration` y `price` × N. Es exactamente lo que `ReserveStep2`
 * envía a la reserva (`durationMinutes = blockMinutes × N`).
 */
export function combineSlots(
  slots: Slot[],
  startIdx: number,
  blocks: number,
): Slot | undefined {
  const first = slots[startIdx];
  if (!first) return undefined;
  const last = slots[startIdx + blocks - 1] ?? first;
  return {
    ...first,
    end: last.end,
    duration: first.duration * blocks,
    price: first.price * blocks,
  };
}
