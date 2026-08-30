/**
 * Paso 1 de la reserva: **la partida nace de un bloque libre** (espejo de
 * `BloquesDisponibles` del desktop). Lo que se prueba: que se listen los bloques del día
 * con su disponibilidad, que una cancha ocupada no se pueda elegir, y que al continuar se
 * emita el slot combinado correcto (multibloque) con la cancha y el día elegidos.
 *
 * Los datos son los reales de casapadel: bloques de 90 min desde las 06:00, 3 canchas.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { ReserveBlocksScreen } from '../ReserveBlocksScreen';
import type { ClubCourtPublic, Slot, SlotStatus } from '../../data/types';
import type { CourtSlots } from '../../lib/reservation';

const court = (id: string, name: string): ClubCourtPublic => ({
  id, name, surface: 'CARPET', cams: 1, indoor: false, nextSlot: '', active: true,
  blockMinutes: 90, pricePerBlock: 10,
});

const slot = (start: string, end: string, status: SlotStatus = 'free'): Slot => ({
  start, end, duration: 90, price: 10, status, cams: true,
});

const grid = (...statuses: SlotStatus[]): Slot[] => [
  slot('06:00', '07:30', statuses[0] ?? 'free'),
  slot('07:30', '09:00', statuses[1] ?? 'free'),
  slot('09:00', '10:30', statuses[2] ?? 'free'),
];

const DAYS = [{ label: 'Hoy', date: '26', dow: 'MIE', iso: '2026-08-26' }];

function renderScreen(
  courtSlots: CourtSlots<ClubCourtPublic>[],
  props: Partial<React.ComponentProps<typeof ReserveBlocksScreen>> = {},
) {
  return render(
    <ThemeProvider initial="light">
      <ReserveBlocksScreen
        clubName="CasaPadel"
        courtSlots={courtSlots}
        days={DAYS}
        onBack={jest.fn()}
        onContinue={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('ReserveBlocksScreen — elegir un bloque libre', () => {
  const base: CourtSlots<ClubCourtPublic>[] = [
    { court: court('c1', 'Cancha 1'), slots: grid() },
    { court: court('c2', 'Cancha 2'), slots: grid('reserved', 'reserved', 'free') },
  ];

  it('lista los bloques del día con cuántas canchas quedan libres', () => {
    const { getByText, getAllByText } = renderScreen(base);
    expect(getByText('06:00 – 07:30')).toBeTruthy();
    expect(getByText('09:00 – 10:30')).toBeTruthy();
    // 06:00: solo Cancha 1 libre (Cancha 2 reservada). 09:00: las dos.
    expect(getAllByText('1 de 2 libres').length).toBe(2); // 06:00 y 07:30
    expect(getByText('2 de 2 libres')).toBeTruthy();      // 09:00
  });

  it('un bloque sin ninguna cancha libre se marca "Completo"', () => {
    const { getByText } = renderScreen([
      { court: court('c1', 'Cancha 1'), slots: [slot('06:00', '07:30', 'reserved')] },
    ]);
    expect(getByText('Completo')).toBeTruthy();
  });

  it('al desplegar un bloque se ve cancha por cancha y la ocupada no es elegible', () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId, queryByText } = renderScreen(base, { onContinue });

    fireEvent.press(getByText('06:00 – 07:30'));
    expect(getByTestId('block-court-c1')).toBeTruthy();
    expect(getByText('Ocupada')).toBeTruthy();

    // Tocar la cancha ocupada no selecciona nada: sin selección no hay duración.
    fireEvent.press(getByTestId('block-court-c2'));
    expect(queryByText('Duración')).toBeNull();
  });

  it('elegir una cancha libre + N bloques emite el slot combinado', () => {
    const onContinue = jest.fn();
    const { getByText, getByTestId } = renderScreen(base, { onContinue });

    fireEvent.press(getByText('06:00 – 07:30'));
    fireEvent.press(getByTestId('block-court-c1'));
    expect(getByText('Duración')).toBeTruthy();

    // 2 bloques consecutivos libres (06:00→09:00): duración y precio × 2.
    fireEvent.press(getByText('2 bloques'));
    fireEvent.press(getByText('Continuar →'));

    expect(onContinue).toHaveBeenCalledTimes(1);
    const arg = onContinue.mock.calls[0][0];
    expect(arg.court.id).toBe('c1');
    expect(arg.blocks).toBe(2);
    expect(arg.day.iso).toBe('2026-08-26');
    expect(arg.slot).toMatchObject({ start: '06:00', end: '09:00', duration: 180, price: 20 });
  });

  it('el bloque EN CURSO se muestra pero no se puede elegir', () => {
    // El backend ya no manda los bloques terminados, pero sí el que está en curso
    // (lo necesita el desktop). Llega `free` + `started`; reserve exige futuro.
    const enCurso: CourtSlots<ClubCourtPublic>[] = [
      {
        court: court('c1', 'Cancha 1'),
        slots: [{ ...slot('06:00', '07:30'), started: true }, slot('07:30', '09:00')],
      },
    ];
    const { getByText, getByTestId, queryByText } = renderScreen(enCurso);

    fireEvent.press(getByText('06:00 – 07:30'));
    expect(getByText('En curso')).toBeTruthy();

    fireEvent.press(getByTestId('block-court-c1'));
    expect(queryByText('Duración')).toBeNull();
  });

  it('sin selección el botón no dispara nada (no se puede reservar "el aire")', () => {
    const onContinue = jest.fn();
    const { getByText } = renderScreen(base, { onContinue });
    fireEvent.press(getByText('Continuar →'));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('sin horarios para el día muestra el estado vacío', () => {
    const { getByText } = renderScreen([{ court: court('c1', 'Cancha 1'), slots: [] }]);
    expect(getByText('Sin bloques disponibles')).toBeTruthy();
  });

  it('cambiar de día avisa al contenedor para refetchear los slots', () => {
    const onDayChange = jest.fn();
    const days = [
      { label: 'Hoy', date: '26', dow: 'MIE', iso: '2026-08-26' },
      { label: 'Mañana', date: '27', dow: 'JUE', iso: '2026-08-27' },
    ];
    const { getByText } = renderScreen(base, { days, onDayChange });
    fireEvent.press(getByText('27'));
    expect(onDayChange).toHaveBeenCalledWith(days[1]);
  });
});
