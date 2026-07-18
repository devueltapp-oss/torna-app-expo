/**
 * Tests del módulo de RESERVAS.
 *
 * Objetivo (goal del usuario): confirmar que la lógica de reservas de la app
 * funciona y está **homologada con los algoritmos del desktop/backend**:
 *
 *  - `generateSlots` replica 1:1 `PadelCourtService.getSlots` (torna-api), que a su
 *    vez sirve el horario que el desktop configura (`ScheduleDialog`/`ExceptionsDialog`,
 *    `blockMinutes`/`pricePerBlock`). Si alguien cambia el algoritmo de un lado sin el
 *    otro, estos tests fallan.
 *  - Los helpers de multibloque son los que usa `ReserveStep2Screen` (import directo).
 */
import type { Slot, SlotStatus } from '../data/types';
import {
  MAX_BLOCKS,
  minutesToHHmm,
  hhmmToMinutes,
  resolveDaySchedule,
  generateSlots,
  firstFreeIndex,
  maxConsecutiveFreeBlocks,
  combineSlots,
  type CourtReservationConfig,
  type DaySchedule,
} from './reservation';

// Config por defecto: horario Lun–Dom 08:00–22:00, bloque 90 min — igual que
// `applyDefaultSchedulesForClub` del backend (openMinute 480, closeMinute 1320).
const DEFAULT_DAY: DaySchedule = { isOpen: true, openMinute: 480, closeMinute: 1320 };
const CONFIG: CourtReservationConfig = {
  isActive: true,
  blockMinutes: 90,
  pricePerBlock: 1000,
  hasCameras: true,
};

const slot = (start: string, status: SlotStatus = 'free'): Slot => ({
  start,
  end: start,
  duration: 90,
  price: 1000,
  status,
  cams: false,
});

describe('helpers de tiempo', () => {
  it('minutesToHHmm formatea con cero a la izquierda', () => {
    expect(minutesToHHmm(480)).toBe('08:00');
    expect(minutesToHHmm(500)).toBe('08:20');
    expect(minutesToHHmm(1320)).toBe('22:00');
    expect(minutesToHHmm(0)).toBe('00:00');
  });

  it('hhmmToMinutes es la inversa', () => {
    expect(hhmmToMinutes('08:00')).toBe(480);
    expect(hhmmToMinutes('22:00')).toBe(1320);
    for (const m of [480, 570, 900, 1290]) {
      expect(hhmmToMinutes(minutesToHHmm(m))).toBe(m);
    }
  });
});

describe('resolveDaySchedule — la excepción prevalece sobre el semanal', () => {
  it('usa la excepción cuando existe', () => {
    const weekly: DaySchedule = { isOpen: true, openMinute: 480, closeMinute: 1320 };
    const exception: DaySchedule = { isOpen: true, openMinute: 1080, closeMinute: 1320 }; // 18–22h
    expect(resolveDaySchedule(weekly, exception)).toBe(exception);
  });
  it('cae al semanal si no hay excepción', () => {
    const weekly: DaySchedule = { isOpen: true, openMinute: 480, closeMinute: 1320 };
    expect(resolveDaySchedule(weekly, null)).toBe(weekly);
    expect(resolveDaySchedule(weekly, undefined)).toBe(weekly);
  });
  it('null si no hay ni excepción ni semanal', () => {
    expect(resolveDaySchedule(null, null)).toBeNull();
    expect(resolveDaySchedule(undefined, undefined)).toBeNull();
  });
});

describe('generateSlots — homologado 1:1 con backend getSlots', () => {
  it('08:00–22:00 bloque 90 → 9 slots consecutivos', () => {
    const slots = generateSlots(CONFIG, DEFAULT_DAY);
    expect(slots).toHaveLength(9); // 480..1200 step 90 (el bloque parcial 21:30–22:00 no entra)
    expect(slots[0]).toEqual({
      start: '08:00', end: '09:30', duration: 90, price: 1000, status: 'free', cams: true,
    });
    expect(slots[8]).toMatchObject({ start: '20:00', end: '21:30' });
    // Sin huecos: el fin de cada slot es el inicio del siguiente.
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].start).toBe(slots[i - 1].end);
    }
  });

  it('el último bloque parcial NO se incluye (mins + block <= close)', () => {
    // 08:00–09:40 con bloque 90: solo entra 08:00–09:30 (09:30–09:40 es parcial).
    const slots = generateSlots(CONFIG, { isOpen: true, openMinute: 480, closeMinute: 580 });
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ start: '08:00', end: '09:30' });
  });

  it('precio = pricePerBlock y cams = hasCameras en cada slot', () => {
    const slots = generateSlots({ ...CONFIG, pricePerBlock: 2500, hasCameras: false }, DEFAULT_DAY);
    expect(slots.every((s) => s.price === 2500)).toBe(true);
    expect(slots.every((s) => s.cams === false)).toBe(true);
  });

  it('bloque de 60 min cambia la cantidad y la duración', () => {
    const slots = generateSlots({ ...CONFIG, blockMinutes: 60 }, DEFAULT_DAY);
    expect(slots).toHaveLength(14); // 840 min / 60
    expect(slots.every((s) => s.duration === 60)).toBe(true);
    expect(slots[0]).toMatchObject({ start: '08:00', end: '09:00' });
  });

  it('cancha inactiva → sin slots', () => {
    expect(generateSlots({ ...CONFIG, isActive: false }, DEFAULT_DAY)).toEqual([]);
  });

  it('día cerrado (isOpen false) → sin slots', () => {
    expect(generateSlots(CONFIG, { isOpen: false, openMinute: 480, closeMinute: 1320 })).toEqual([]);
  });

  it('sin horario del día (null) → sin slots', () => {
    expect(generateSlots(CONFIG, null)).toEqual([]);
  });

  it('la excepción por fecha manda: 18:00–22:00 → 2 slots', () => {
    const exception: DaySchedule = { isOpen: true, openMinute: 1080, closeMinute: 1320 };
    const day = resolveDaySchedule(DEFAULT_DAY, exception);
    const slots = generateSlots(CONFIG, day);
    expect(slots.map((s) => `${s.start}-${s.end}`)).toEqual(['18:00-19:30', '19:30-21:00']);
  });

  it('marca reserved los slots que solapan un Game (mismo criterio de intervalos)', () => {
    // Game 09:30–11:00 → solapa exactamente el 2º slot; adyacentes quedan libres.
    const busy = [{ startMinute: 570, endMinute: 660 }];
    const slots = generateSlots(CONFIG, DEFAULT_DAY, busy);
    expect(slots[0]).toMatchObject({ start: '08:00', end: '09:30', status: 'free' }); // adyacente, no solapa
    expect(slots[1]).toMatchObject({ start: '09:30', end: '11:00', status: 'reserved' });
    expect(slots[2]).toMatchObject({ start: '11:00', end: '12:30', status: 'free' });
  });

  it('un Game que cruza varios bloques los reserva todos', () => {
    const busy = [{ startMinute: 600, endMinute: 800 }]; // 10:00–13:20
    const slots = generateSlots(CONFIG, DEFAULT_DAY, busy);
    const reserved = slots.filter((s) => s.status === 'reserved').map((s) => s.start);
    expect(reserved).toEqual(['09:30', '11:00', '12:30']);
  });
});

describe('multibloque — helpers que usa ReserveStep2Screen', () => {
  it('firstFreeIndex devuelve el primer libre, o 0 si no hay ninguno', () => {
    expect(firstFreeIndex([slot('08:00', 'reserved'), slot('09:30', 'free')])).toBe(1);
    expect(firstFreeIndex([slot('08:00', 'reserved'), slot('09:30', 'reserved')])).toBe(0);
    expect(firstFreeIndex([])).toBe(0);
  });

  it('maxConsecutiveFreeBlocks cuenta libres consecutivos, tope MAX_BLOCKS', () => {
    const slots = [slot('a'), slot('b'), slot('c'), slot('d'), slot('e'), slot('f')]; // 6 libres
    expect(maxConsecutiveFreeBlocks(slots, 0)).toBe(MAX_BLOCKS); // topea en 4
    expect(maxConsecutiveFreeBlocks(slots, 0, 10)).toBe(6); // cap alto → cuenta todos
  });

  it('maxConsecutiveFreeBlocks se corta en el primer reservado', () => {
    const slots = [slot('a'), slot('b'), slot('c', 'reserved'), slot('d')];
    expect(maxConsecutiveFreeBlocks(slots, 0)).toBe(2);
  });

  it('maxConsecutiveFreeBlocks nunca es menor a 1 (aunque el inicio esté reservado)', () => {
    const slots = [slot('a', 'reserved'), slot('b')];
    expect(maxConsecutiveFreeBlocks(slots, 0)).toBe(1);
  });

  it('combineSlots: 1 bloque = el mismo slot', () => {
    const slots = [
      { start: '08:00', end: '09:30', duration: 90, price: 1000, status: 'free' as const, cams: true },
    ];
    expect(combineSlots(slots, 0, 1)).toMatchObject({
      start: '08:00', end: '09:30', duration: 90, price: 1000,
    });
  });

  it('combineSlots: N bloques → fin del último, duración y precio × N', () => {
    const mk = (start: string, end: string): Slot => ({
      start, end, duration: 90, price: 1000, status: 'free', cams: true,
    });
    const slots = [mk('08:00', '09:30'), mk('09:30', '11:00'), mk('11:00', '12:30')];
    expect(combineSlots(slots, 0, 3)).toMatchObject({
      start: '08:00', end: '12:30', duration: 270, price: 3000,
    });
    expect(combineSlots(slots, 1, 2)).toMatchObject({
      start: '09:30', end: '12:30', duration: 180, price: 2000,
    });
  });

  it('combineSlots devuelve undefined si el índice está fuera de rango', () => {
    expect(combineSlots([], 0, 1)).toBeUndefined();
  });
});

describe('flujo end-to-end (homologación con la reserva real)', () => {
  it('la duración combinada es múltiplo del bloque y ≤ MAX_BLOCKS·block (contrato del backend)', () => {
    const slots = generateSlots(CONFIG, DEFAULT_DAY); // 9 libres, bloque 90
    const startIdx = firstFreeIndex(slots);
    const max = maxConsecutiveFreeBlocks(slots, startIdx);
    expect(max).toBe(MAX_BLOCKS);
    for (let blocks = 1; blocks <= max; blocks++) {
      const combined = combineSlots(slots, startIdx, blocks)!;
      expect(combined.duration).toBe(CONFIG.blockMinutes * blocks); // durationMinutes = block × N
      expect(combined.duration % CONFIG.blockMinutes).toBe(0);
      expect(blocks).toBeLessThanOrEqual(MAX_BLOCKS);
    }
  });
});
