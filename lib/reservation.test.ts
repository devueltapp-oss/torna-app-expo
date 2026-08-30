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
 *  - Los helpers de multibloque y el agrupado por bloque son los que usa
 *    `ReserveBlocksScreen` (import directo). `groupSlotsIntoBlocks` es el espejo de
 *    `agruparPorBloque` de `BloquesDisponibles` en el desktop.
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
  groupSlotsIntoBlocks,
  blockAvailability,
  isBookable,
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

describe('multibloque — helpers que usa ReserveBlocksScreen', () => {
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

describe('bloques del día — espejo de BloquesDisponibles (desktop)', () => {
  const courtA = { id: 'a', name: 'Cancha 1' };
  const courtB = { id: 'b', name: 'Cancha 2' };
  const mk = (start: string, end: string, status: SlotStatus = 'free'): Slot => ({
    start, end, duration: 90, price: 10, status, cams: true,
  });

  it('agrupa por {start,end} y ordena por hora', () => {
    const blocks = groupSlotsIntoBlocks([
      { court: courtA, slots: [mk('09:00', '10:30'), mk('06:00', '07:30')] },
      { court: courtB, slots: [mk('06:00', '07:30', 'reserved')] },
    ]);
    expect(blocks.map((b) => b.key)).toEqual(['06:00-07:30', '09:00-10:30']);
    expect(blocks[0].items.map((i) => i.court.id)).toEqual(['a', 'b']);
    expect(blocks[0].duration).toBe(90);
    expect(blocks[1].items).toHaveLength(1); // Cancha 2 no ofrece ese horario
  });

  it('guarda el índice del slot dentro de la grilla de SU cancha (multibloque)', () => {
    const slots = [mk('06:00', '07:30'), mk('07:30', '09:00'), mk('09:00', '10:30')];
    const blocks = groupSlotsIntoBlocks([{ court: courtA, slots }]);
    const second = blocks[1].items[0];
    expect(second.index).toBe(1);
    // Desde ese índice hay 2 bloques libres consecutivos (07:30→10:30).
    expect(maxConsecutiveFreeBlocks(slots, second.index)).toBe(2);
    expect(combineSlots(slots, second.index, 2)).toMatchObject({
      start: '07:30', end: '10:30', duration: 180, price: 20,
    });
  });

  it('blockAvailability cuenta libres vs total (semáforo del bloque)', () => {
    const [block] = groupSlotsIntoBlocks([
      { court: courtA, slots: [mk('06:00', '07:30')] },
      { court: courtB, slots: [mk('06:00', '07:30', 'reserved')] },
    ]);
    expect(blockAvailability(block)).toEqual({ free: 1, total: 2 });

    const [full] = groupSlotsIntoBlocks([
      { court: courtA, slots: [mk('06:00', '07:30', 'reserved')] },
    ]);
    expect(blockAvailability(full)).toEqual({ free: 0, total: 1 });
  });

  it('el bloque EN CURSO no cuenta como libre (llega `free` pero con `started`)', () => {
    // El backend manda el bloque en curso porque el desktop lo usa para crear la
    // partida del momento; para la app no es reservable (reserve exige futuro).
    const [block] = groupSlotsIntoBlocks([
      { court: courtA, slots: [{ ...mk('06:00', '07:30'), started: true }] },
      { court: courtB, slots: [mk('06:00', '07:30')] },
    ]);
    expect(blockAvailability(block)).toEqual({ free: 1, total: 2 });
    expect(isBookable(block.items[0].slot)).toBe(false);
    expect(isBookable(block.items[1].slot)).toBe(true);
  });

  it('sin canchas o sin horarios → sin bloques (estado vacío de la pantalla)', () => {
    expect(groupSlotsIntoBlocks([])).toEqual([]);
    expect(groupSlotsIntoBlocks([{ court: courtA, slots: [] }])).toEqual([]);
  });

  it('datos reales de casapadel: 11 bloques de 90 min desde las 06:00 en 3 canchas', () => {
    const grid = Array.from({ length: 11 }, (_, i) => {
      const start = 6 * 60 + i * 90;
      return mk(minutesToHHmm(start), minutesToHHmm(start + 90));
    });
    const blocks = groupSlotsIntoBlocks(
      ['c1', 'c2', 'c3'].map((id) => ({ court: { id, name: id }, slots: grid })),
    );
    expect(blocks).toHaveLength(11);
    expect(blocks[0].key).toBe('06:00-07:30');
    expect(blocks.every((b) => b.items.length === 3)).toBe(true);
    expect(blockAvailability(blocks[0])).toEqual({ free: 3, total: 3 });
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
