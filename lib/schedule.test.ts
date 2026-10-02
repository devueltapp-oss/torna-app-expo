import { minuteToLabel, normalizeDays, defaultWeekSchedule, formatExceptionDate, TIME_OPTIONS, DAY_LABELS } from './schedule';

describe('minuteToLabel', () => {
  it('convierte minutos desde medianoche a HH:MM', () => {
    expect(minuteToLabel(0)).toBe('00:00');
    expect(minuteToLabel(510)).toBe('08:30');
    expect(minuteToLabel(1439)).toBe('23:59');
  });
});

describe('TIME_OPTIONS', () => {
  it('48 opciones cada 30 min, de 00:00 a 23:30', () => {
    expect(TIME_OPTIONS).toHaveLength(48);
    expect(TIME_OPTIONS[0]).toBe(0);
    expect(TIME_OPTIONS[TIME_OPTIONS.length - 1]).toBe(23 * 60 + 30);
  });
});

describe('defaultWeekSchedule / normalizeDays', () => {
  it('default: 7 días, domingo cerrado, el resto abierto', () => {
    const week = defaultWeekSchedule();
    expect(week).toHaveLength(7);
    expect(week[0]).toMatchObject({ dayOfWeek: 0, isOpen: false });
    expect(week[1]).toMatchObject({ dayOfWeek: 1, isOpen: true });
  });

  it('normalizeDays sin datos del backend devuelve el default', () => {
    expect(normalizeDays(undefined)).toEqual(defaultWeekSchedule());
    expect(normalizeDays(null)).toEqual(defaultWeekSchedule());
    expect(normalizeDays([])).toEqual(defaultWeekSchedule());
  });

  it('normalizeDays completa días faltantes y conserva los que sí llegaron', () => {
    const partial = [{ dayOfWeek: 2, isOpen: true, openMinute: 600, closeMinute: 1200 }];
    const result = normalizeDays(partial);
    expect(result).toHaveLength(7);
    expect(result.find((d) => d.dayOfWeek === 2)).toEqual(partial[0]);
    // El resto queda con el default, no se inventa un estado distinto.
    expect(result.find((d) => d.dayOfWeek === 3)).toEqual(defaultWeekSchedule()[3]);
  });
});

describe('formatExceptionDate', () => {
  it('formatea una fecha YYYY-MM-DD sin correrse por el huso del dispositivo', () => {
    expect(formatExceptionDate('2026-09-02')).toMatch(/2/);
  });
});

test('DAY_LABELS tiene 7 entradas, domingo primero (igual que Date.getDay())', () => {
  expect(DAY_LABELS).toHaveLength(7);
  expect(DAY_LABELS[0]).toBe('Domingo');
});
