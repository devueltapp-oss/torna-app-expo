/**
 * Clamps puros del recorte (2026-09-10): las tres garantías físicas que
 * reemplazan al viejo cartel "El clip no puede pasar de 3:00" —
 *   - `clampStartDrag`/`clampEndDrag` nunca dejan que la selección exceda
 *     `TRIM_MAX_SEC` (180s) ni baje de `TRIM_MIN_SEC` (3s), por construcción.
 *   - `clampMoveDrag` (arrastrar el cuadro entero desde la franja de arriba)
 *     preserva la duración exacta y no se sale de [0, duration].
 */
import { clampStartDrag, clampEndDrag, clampMoveDrag, TRIM_MIN_SEC, TRIM_MAX_SEC } from '../TrimRangeSlider';

describe('clampStartDrag', () => {
  it('mueve el inicio libremente dentro de los límites', () => {
    expect(clampStartDrag(-5, 40, 60)).toBe(35);
  });

  it('nunca deja una selección de más de TRIM_MAX_SEC', () => {
    // e0=200, arrastrar el inicio muy a la izquierda (dt=-1000) igual topa en e0-180.
    expect(clampStartDrag(-1000, 190, 200)).toBe(200 - TRIM_MAX_SEC);
  });

  it('nunca deja una selección de menos de TRIM_MIN_SEC', () => {
    // arrastrar el inicio hacia el fin (dt grande) topa en e0-3.
    expect(clampStartDrag(1000, 10, 60)).toBe(60 - TRIM_MIN_SEC);
  });

  it('no cruza el cero', () => {
    expect(clampStartDrag(-1000, 5, 60)).toBe(0);
  });
});

describe('clampEndDrag', () => {
  const DURATION = 600;

  it('mueve el fin libremente dentro de los límites', () => {
    expect(clampEndDrag(5, 40, 60, DURATION)).toBe(65);
  });

  it('nunca deja una selección de más de TRIM_MAX_SEC', () => {
    expect(clampEndDrag(1000, 10, 60, DURATION)).toBe(10 + TRIM_MAX_SEC);
  });

  it('nunca deja una selección de menos de TRIM_MIN_SEC', () => {
    expect(clampEndDrag(-1000, 10, 60, DURATION)).toBe(10 + TRIM_MIN_SEC);
  });

  it('no cruza la duración total del video', () => {
    expect(clampEndDrag(1000, 550, 590, 600)).toBe(600);
  });
});

describe('clampMoveDrag (arrastrar el cuadro entero)', () => {
  it('desplaza el inicio manteniendo la duración (el caller suma segLen al resultado)', () => {
    const s0 = 40, e0 = 70; // segLen = 30
    const nextStart = clampMoveDrag(10, s0, e0, 600);
    expect(nextStart).toBe(50);
    expect((nextStart) + (e0 - s0)).toBe(80); // el fin se mueve la misma distancia
  });

  it('no dispara antes del cero', () => {
    expect(clampMoveDrag(-1000, 40, 70, 600)).toBe(0);
  });

  it('no dispara después del final del video, preservando la duración', () => {
    const s0 = 500, e0 = 580; // segLen = 80, duration = 600
    expect(clampMoveDrag(1000, s0, e0, 600)).toBe(600 - 80);
  });
});
