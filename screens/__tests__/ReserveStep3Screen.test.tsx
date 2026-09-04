/**
 * Nivel de la partida al reservar:
 *   - Arranca precargado con el nivel del HOST (`hostCategory`), no en blanco —
 *     antes había que elegir un chip 1-7 a mano incluso teniendo nivel declarado.
 *   - Sin nivel propio, el default es 7 (iniciación), nunca un nivel alto sin pedirlo.
 *   - El campo abre `LevelPickerSheet` (mismo componente que "Nivel de juego" del
 *     perfil) en vez de mostrar los números 1-7 sueltos.
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { ReserveStep3Screen } from '../ReserveStep3Screen';

const summary = { title: 'Cancha 1', subtitle: 'Hoy · 18:00–19:30', priceLabel: '$20' };

function renderScreen(props: Partial<React.ComponentProps<typeof ReserveStep3Screen>> = {}) {
  const onConfirm = jest.fn();
  const utils = render(
    <ThemeProvider initial="light">
      <ReserveStep3Screen summary={summary} onConfirm={onConfirm} {...props} />
    </ThemeProvider>,
  );
  return { ...utils, onConfirm };
}

describe('ReserveStep3Screen — nivel precargado', () => {
  it('con nivel propio declarado, el campo arranca en ESE nivel', () => {
    const { getByText } = renderScreen({ hostCategory: 3 });
    expect(getByText('Nivel 3 · Avanzado')).toBeTruthy();
  });

  it('sin nivel propio (null), el default es 7 · Iniciación', () => {
    const { getByText } = renderScreen({ hostCategory: null });
    expect(getByText('Nivel 7 · Iniciación')).toBeTruthy();
  });

  it('sin prop hostCategory (undefined), también cae a 7 · Iniciación', () => {
    const { getByText } = renderScreen();
    expect(getByText('Nivel 7 · Iniciación')).toBeTruthy();
  });

  it('no muestra chips sueltos "1".."7"', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('level-1')).toBeNull();
    expect(queryByTestId('level-7')).toBeNull();
  });
});

describe('ReserveStep3Screen — cambiar el nivel', () => {
  it('tocar el campo abre la hoja de niveles; elegir uno lo refleja y viaja a onConfirm', () => {
    const { getByTestId, getByText, onConfirm } = renderScreen({
      hostCategory: 7,
      initialPartner: { id: 'p1', name: 'Ana', username: '@ana' },
    });

    fireEvent.press(getByTestId('level-field'));
    fireEvent.press(getByTestId('level-option-2'));

    expect(getByText('Nivel 2 · Avanzado alto')).toBeTruthy();

    fireEvent.press(getByText('Confirmar reserva'));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ category: 2 }));
  });
});

/**
 * Bug real: `hostCategory` llega ASÍNCRONO (el contenedor lo saca de
 * `useUserProfile`, que en el primer render todavía no resolvió). El
 * `useState` que precarga el campo solo lee su valor inicial una vez, así
 * que si el nivel real llega un instante después, el campo se quedaba en el
 * default (7) para siempre — el reporte fue "soy nivel 3 y me sale 7".
 */
describe('ReserveStep3Screen — hostCategory llega asíncrono', () => {
  it('si el nivel real llega DESPUÉS del primer render, el campo se actualiza solo', () => {
    const { getByText, rerender } = render(
      <ThemeProvider initial="light">
        <ReserveStep3Screen summary={summary} onConfirm={jest.fn()} hostCategory={undefined} />
      </ThemeProvider>,
    );
    // Primer render: todavía no se sabe el nivel real → cae al default.
    expect(getByText('Nivel 7 · Iniciación')).toBeTruthy();

    // El fetch del perfil resuelve un instante después con el nivel real.
    act(() => {
      rerender(
        <ThemeProvider initial="light">
          <ReserveStep3Screen summary={summary} onConfirm={jest.fn()} hostCategory={3} />
        </ThemeProvider>,
      );
    });

    expect(getByText('Nivel 3 · Avanzado')).toBeTruthy();
  });

  it('si la persona YA eligió un nivel a mano, un hostCategory que llega tarde no se lo pisa', () => {
    const { getByTestId, getByText, rerender } = render(
      <ThemeProvider initial="light">
        <ReserveStep3Screen summary={summary} onConfirm={jest.fn()} hostCategory={undefined} />
      </ThemeProvider>,
    );

    fireEvent.press(getByTestId('level-field'));
    fireEvent.press(getByTestId('level-option-5'));
    expect(getByText('Nivel 5 · Intermedio')).toBeTruthy();

    // El nivel del host llega recién ahora — no debe reemplazar la elección manual.
    act(() => {
      rerender(
        <ThemeProvider initial="light">
          <ReserveStep3Screen summary={summary} onConfirm={jest.fn()} hostCategory={3} />
        </ThemeProvider>,
      );
    });

    expect(getByText('Nivel 5 · Intermedio')).toBeTruthy();
  });
});
