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

const summary = { title: 'Cancha 1', date: 'Hoy', time: '18:00–19:30', priceLabel: '$20' };

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

/**
 * Bug real (1): un rival ya elegido tenía "Cambiar" (abre el buscador de
 * nuevo) pero ningún camino para vaciarlo y volver al placeholder "Agregar
 * jugador" sin reemplazarlo por otra persona.
 *
 * Bug real (2, 2026-09-11): el compañero tenía el mismo problema y encima NO
 * tenía botón de quitar — a propósito en su momento (regla de negocio: es
 * OBLIGATORIO para el backend), pero el reporte real fue "no puedo eliminar a
 * mi compañero, solo a los rivales". Ahora los tres slots se pueden vaciar; lo
 * que sigue siendo obligatorio es tener uno elegido para poder CONFIRMAR la
 * reserva (ver el describe de más abajo).
 */
describe('ReserveStep3Screen — quitar un jugador ya elegido', () => {
  it('el compañero se puede quitar y vuelve al placeholder "Agregar jugador"', () => {
    const { getByText, queryByText, getAllByText, getByLabelText } = renderScreen({
      hostCategory: 7,
      initialPartner: { id: 'p1', name: 'Ana', username: '@ana' },
    });

    expect(getByText('Ana')).toBeTruthy();
    // Sin rivales elegidos, sus dos slots ya muestran "Agregar jugador" —
    // por eso se cuenta en vez de buscar uno solo.
    expect(getAllByText('Agregar jugador')).toHaveLength(2);

    fireEvent.press(getByLabelText('Quitar jugador'));

    expect(queryByText('Ana')).toBeNull();
    expect(getAllByText('Agregar jugador')).toHaveLength(3);
  });

  it('un rival elegido se puede quitar y vuelve al placeholder "Agregar jugador"', () => {
    const { getByText, queryByText, getAllByText, getAllByLabelText } = renderScreen({
      hostCategory: 7,
      initialPartner: { id: 'p1', name: 'Ana', username: '@ana' },
      initialOpp1: { id: 'o1', name: 'Beto', username: '@beto' },
    });

    expect(getByText('Beto')).toBeTruthy();
    // Compañero + un rival cargado (opp2 sigue vacío) → dos botones de
    // quitar, en el orden en que aparecen en pantalla: compañero primero,
    // después rival 1.
    const removeButtons = getAllByLabelText('Quitar jugador');
    expect(removeButtons).toHaveLength(2);

    fireEvent.press(removeButtons[1]);

    expect(queryByText('Beto')).toBeNull();
    // El compañero (Ana) no se ve afectado por quitar al rival.
    expect(getByText('Ana')).toBeTruthy();
    // opp1 y opp2 muestran ahora los dos el placeholder.
    expect(getAllByText('Agregar jugador')).toHaveLength(2);
  });

  it('el rival quitado viaja como vacío a onConfirm (no bloquea la reserva)', () => {
    const { getByText, getAllByLabelText, onConfirm } = renderScreen({
      hostCategory: 7,
      initialPartner: { id: 'p1', name: 'Ana', username: '@ana' },
      initialOpp1: { id: 'o1', name: 'Beto', username: '@beto' },
    });

    fireEvent.press(getAllByLabelText('Quitar jugador')[1]);
    fireEvent.press(getByText('Confirmar reserva'));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ opponents: [undefined, undefined] }),
    );
  });
});

/**
 * El compañero sigue siendo obligatorio para el backend — quitarlo (ver
 * arriba) no puede terminar en una reserva a medio llenar. Mismo patrón que
 * ya existía para el nivel ("Elige el nivel de la partida para confirmar.").
 */
describe('ReserveStep3Screen — sin compañero, no se puede confirmar', () => {
  it('sin compañero, "Confirmar reserva" no dispara onConfirm y muestra el aviso', () => {
    const { getByText, getByLabelText, onConfirm } = renderScreen({
      hostCategory: 7,
      initialPartner: { id: 'p1', name: 'Ana', username: '@ana' },
    });

    fireEvent.press(getByLabelText('Quitar jugador'));
    expect(getByText('Elige un compañero para confirmar.')).toBeTruthy();

    fireEvent.press(getByText('Confirmar reserva'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('al volver a elegir un compañero, "Confirmar reserva" vuelve a funcionar', () => {
    const { getByText, getByLabelText, getAllByText, onConfirm } = renderScreen({
      hostCategory: 7,
      initialPartner: { id: 'p1', name: 'Ana', username: '@ana' },
      invitablePlayers: [{ id: 'p2', name: 'Carla', username: '@carla' }],
    });

    fireEvent.press(getByLabelText('Quitar jugador'));
    // El primer "Agregar jugador" en pantalla es el del compañero (la sección
    // "TU COMPAÑERO" va antes que "RIVALES"); los otros dos son los rivales,
    // vacíos por defecto en este test.
    fireEvent.press(getAllByText('Agregar jugador')[0]);
    fireEvent.press(getByText('Carla'));

    fireEvent.press(getByText('Confirmar reserva'));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ partnerUserId: 'p2' }),
    );
  });
});
