/**
 * Ciudad y su visibilidad, empaquetadas en `User.region`.
 *
 * El riesgo que estos tests cubren es concreto: si una pantalla lee el campo
 * crudo, **muestra la ciudad de alguien que pidió ocultarla** — y encima con un
 * `~` delante. Por eso se prueban juntos el ida y vuelta y los bordes.
 */
import { cityFromSuggestion, isRegionVisible, packRegion, unpackRegion } from './region';

describe('packRegion / unpackRegion', () => {
  it('visible: guarda la ciudad tal cual', () => {
    expect(packRegion('Ciudad Guayana', true)).toBe('Ciudad Guayana');
  });

  it('oculta: marca con el prefijo, sin perder la ciudad', () => {
    const guardado = packRegion('Ciudad Guayana', false);
    expect(guardado).not.toBe('Ciudad Guayana');
    // El dato sigue ahí: ocultar no es borrar.
    expect(unpackRegion(guardado)).toBe('Ciudad Guayana');
  });

  it('ida y vuelta en los dos estados', () => {
    for (const visible of [true, false]) {
      const g = packRegion('Caracas', visible);
      expect(unpackRegion(g)).toBe('Caracas');
      expect(isRegionVisible(g)).toBe(visible);
    }
  });

  it('recorta espacios al guardar', () => {
    expect(packRegion('  Maracaibo  ', true)).toBe('Maracaibo');
  });

  /** Sin ciudad no hay nada que ocultar ni que mostrar. */
  it('ciudad vacía guarda cadena vacía, aunque se pida ocultarla', () => {
    expect(packRegion('', false)).toBe('');
    expect(packRegion('   ', true)).toBe('');
  });
});

describe('isRegionVisible', () => {
  it('sin ciudad cargada no hay nada visible', () => {
    expect(isRegionVisible(undefined)).toBe(false);
    expect(isRegionVisible(null)).toBe(false);
    expect(isRegionVisible('')).toBe(false);
  });

  /**
   * Las ciudades que ya estaban guardadas antes de esta feature no tienen
   * prefijo: tienen que seguir viéndose, no desaparecer del perfil.
   */
  it('un valor viejo sin prefijo se considera visible', () => {
    expect(isRegionVisible('caracas')).toBe(true);
    expect(unpackRegion('caracas')).toBe('caracas');
  });
});

describe('cityFromSuggestion', () => {
  /** Geoapify devuelve una entrada por calle; acá se elige una CIUDAD. */
  it('se queda con la ciudad y descarta estado y país', () => {
    expect(cityFromSuggestion({ line2: 'Ciudad Guayana 8050, Bolívar, Venezuela' }))
      .toBe('Ciudad Guayana');
  });

  it('quita el código postal pegado al nombre', () => {
    expect(cityFromSuggestion({ line2: 'Caracas 1060, Venezuela' })).toBe('Caracas');
  });

  it('cae a `label` si no hay `line2`', () => {
    expect(cityFromSuggestion({ label: 'Maracaibo, Zulia' })).toBe('Maracaibo');
  });

  it('sin datos devuelve cadena vacía en vez de romper', () => {
    expect(cityFromSuggestion({})).toBe('');
  });
});
