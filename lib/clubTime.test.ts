/**
 * Horarios de partidas en hora del CLUB.
 *
 * El bug real: una reserva de las **12:30** se veía como **08:30** en un
 * teléfono en Venezuela (UTC−4). El backend guarda ese horario como una
 * *etiqueta* escrita en UTC (`2026-09-02T12:30:00.000Z` significa "12:30 en el
 * club"), y `toLocaleTimeString()` la trataba como instante, restándole el
 * offset del dispositivo.
 *
 * Estos tests fuerzan la zona del "dispositivo" a una distinta de UTC: si
 * alguien vuelve a formatear en hora local, fallan.
 */
import { formatClubDate, formatClubTime } from './clubTime';

const TZ_ORIGINAL = process.env.TZ;

beforeAll(() => {
  // Caracas (UTC−4), la zona donde apareció el bug.
  process.env.TZ = 'America/Caracas';
});

afterAll(() => {
  process.env.TZ = TZ_ORIGINAL;
});

describe('formatClubTime', () => {
  it('lee la etiqueta tal cual, sin restarle el offset del dispositivo', () => {
    // El caso reportado: 12:30 guardado, 08:30 mostrado.
    expect(formatClubTime('2026-09-02T12:30:00.000Z')).toBe('12:30');
    expect(formatClubTime('2026-09-02T14:00:00.000Z')).toBe('14:00');
  });

  /**
   * Un horario de madrugada en UTC caía el día ANTERIOR en hora local, así que
   * además de la hora se corría la fecha.
   */
  it('no corre la fecha con horarios tempranos', () => {
    expect(formatClubTime('2026-09-02T01:00:00.000Z')).toBe('01:00');
    expect(formatClubDate('2026-09-02T01:00:00.000Z')).toContain('2');
  });

  it('usa formato de 24 h (no "12:30 p. m.")', () => {
    expect(formatClubTime('2026-09-02T20:00:00.000Z')).toBe('20:00');
  });

  it('sin dato o con basura devuelve un guion, no revienta', () => {
    expect(formatClubTime(null)).toBe('—');
    expect(formatClubTime(undefined)).toBe('—');
    expect(formatClubTime('no-es-una-fecha')).toBe('—');
  });
});

describe('formatClubDate', () => {
  it('devuelve el día de la etiqueta, no el del dispositivo', () => {
    expect(formatClubDate('2026-09-02T12:30:00.000Z')).toMatch(/2/);
  });

  it('sin dato devuelve undefined (el llamador decide si mostrar algo)', () => {
    expect(formatClubDate(null)).toBeUndefined();
    expect(formatClubDate('no-es-una-fecha')).toBeUndefined();
  });
});
