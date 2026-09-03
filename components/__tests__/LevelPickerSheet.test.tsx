/**
 * La hoja de nivel de juego reemplazó al `Picker` nativo, que en Android abría
 * un diálogo del sistema: salía en blanco con el tema oscuro de la app, no se
 * parecía al resto de Torna y truncaba las etiquetas en una línea.
 *
 * Lo que se fija acá es justamente eso: que el texto de cada opción esté
 * **completo** (nombre y descripción son dos textos propios, no una sola línea
 * concatenada que el widget pueda cortar).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { LevelPickerSheet, PLAY_LEVELS, levelLabel } from '../LevelPickerSheet';

function renderSheet(props: Partial<React.ComponentProps<typeof LevelPickerSheet>> = {}) {
  return render(
    <ThemeProvider initial="light">
      <LevelPickerSheet
        visible
        value={null}
        onSelect={jest.fn()}
        onClose={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('LevelPickerSheet', () => {
  it('lista los siete niveles más "Sin declarar"', () => {
    const { getByText, getAllByText } = renderSheet();
    expect(getByText('Sin declarar')).toBeTruthy();
    for (const l of PLAY_LEVELS) expect(getByText(l.label)).toBeTruthy();
    expect(getAllByText(/^Nivel \d/)).toHaveLength(7);
  });

  /**
   * El motivo de existir de la hoja: la descripción es lo que hace elegible al
   * número (en pádel el 1 es el MÁS alto, al revés de lo que se asume). En el
   * picker nativo se truncaba.
   */
  it('cada nivel muestra su descripción completa, aparte del nombre', () => {
    const { getByText } = renderSheet();
    expect(getByText('Compites en circuito')).toBeTruthy();
    expect(getByText('Juegas con constancia')).toBeTruthy();
    expect(getByText('Primera vez en una cancha')).toBeTruthy();
  });

  it('elegir un nivel avisa con su número y cierra', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = renderSheet({ onSelect, onClose });

    fireEvent.press(getByTestId('level-option-4'));

    expect(onSelect).toHaveBeenCalledWith(4);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /** Sin nivel es un estado válido: `User.category` es nullable. */
  it('"Sin declarar" manda null', () => {
    const onSelect = jest.fn();
    const { getByText } = renderSheet({ value: 3, onSelect });

    fireEvent.press(getByText('Sin declarar'));

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('tocar el velo cierra sin elegir', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = renderSheet({ onSelect, onClose });

    fireEvent.press(getByTestId('level-sheet-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('levelLabel', () => {
  it('traduce el número al nombre que ve el usuario', () => {
    expect(levelLabel(1)).toBe('Nivel 1 · Profesional');
    expect(levelLabel(7)).toBe('Nivel 7 · Iniciación');
  });

  it('sin nivel dice "Sin declarar"', () => {
    expect(levelLabel(null)).toBe('Sin declarar');
  });
});
