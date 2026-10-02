/**
 * Horarios de cancha (club): horario semanal (7 días, abierto/cerrado +
 * horas) + excepciones por fecha. Mismo modelo que `ScheduleDialog.jsx`/
 * `ExceptionsDialog.jsx` del desktop, por cancha individual.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClubCourtScheduleScreen } from '../ClubCourtScheduleScreen';
import { ThemeProvider } from '../../theme';
import { defaultWeekSchedule } from '../../lib/schedule';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const upcomingDates = [{ iso: '2026-09-02', label: 'Hoy' }, { iso: '2026-09-03', label: '3 sept' }];

describe('ClubCourtScheduleScreen — horario semanal', () => {
  it('"Guardar horario semanal" arranca deshabilitado sin tocar nada', () => {
    const onSaveWeek = jest.fn();
    const { getByText } = renderWithTheme(
      <ClubCourtScheduleScreen
        courtName="Cancha 1" days={defaultWeekSchedule()} exceptions={[]} upcomingDates={upcomingDates}
        onSaveWeek={onSaveWeek} onAddException={jest.fn()} onDeleteException={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Guardar horario semanal'));
    expect(onSaveWeek).not.toHaveBeenCalled();
  });

  it('cerrar un día abierto habilita guardar y oculta sus horas', () => {
    const onSaveWeek = jest.fn();
    const { getByTestId, getByText, queryByTestId } = renderWithTheme(
      <ClubCourtScheduleScreen
        courtName="Cancha 1" days={defaultWeekSchedule()} exceptions={[]} upcomingDates={upcomingDates}
        onSaveWeek={onSaveWeek} onAddException={jest.fn()} onDeleteException={jest.fn()}
      />,
    );
    // Lunes (dayOfWeek=1) está abierto por default.
    fireEvent.press(getByTestId('day-open-1'));
    fireEvent.press(getByText('Guardar horario semanal'));

    expect(onSaveWeek).toHaveBeenCalledTimes(1);
    const saved = onSaveWeek.mock.calls[0][0];
    expect(saved.find((d: any) => d.dayOfWeek === 1).isOpen).toBe(false);
  });

  it('elegir una hora en el selector actualiza el horario guardado', () => {
    const onSaveWeek = jest.fn();
    const { getByText, getByTestId } = renderWithTheme(
      <ClubCourtScheduleScreen
        courtName="Cancha 1" days={defaultWeekSchedule()} exceptions={[]} upcomingDates={upcomingDates}
        onSaveWeek={onSaveWeek} onAddException={jest.fn()} onDeleteException={jest.fn()}
      />,
    );
    // Lunes abre a las 08:00 por default — lo cambiamos a 09:00.
    fireEvent.press(getByTestId('day-time-1-open'));
    fireEvent.press(getByTestId('time-option-540')); // 540 min = 09:00
    fireEvent.press(getByText('Guardar horario semanal'));

    const saved = onSaveWeek.mock.calls[0][0];
    expect(saved.find((d: any) => d.dayOfWeek === 1).openMinute).toBe(540);
  });
});

describe('ClubCourtScheduleScreen — excepciones', () => {
  it('sin excepciones, muestra el aviso de que sigue el horario semanal', () => {
    const { getByText } = renderWithTheme(
      <ClubCourtScheduleScreen
        courtName="Cancha 1" days={defaultWeekSchedule()} exceptions={[]} upcomingDates={upcomingDates}
        onSaveWeek={jest.fn()} onAddException={jest.fn()} onDeleteException={jest.fn()}
      />,
    );
    expect(getByText(/sigue el horario semanal/)).toBeTruthy();
  });

  it('agregar una excepción cerrada manda el payload correcto', () => {
    const onAddException = jest.fn();
    const { getByText } = renderWithTheme(
      <ClubCourtScheduleScreen
        courtName="Cancha 1" days={defaultWeekSchedule()} exceptions={[]} upcomingDates={upcomingDates}
        onSaveWeek={jest.fn()} onAddException={onAddException} onDeleteException={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Agregar'));
    fireEvent.press(getByText('3 sept'));
    fireEvent.press(getByText('Guardar excepción'));

    expect(onAddException).toHaveBeenCalledWith({ date: '2026-09-03', isOpen: false, openMinute: undefined, closeMinute: undefined });
  });

  it('una excepción existente se puede quitar', () => {
    const onDeleteException = jest.fn();
    const { getByTestId } = renderWithTheme(
      <ClubCourtScheduleScreen
        courtName="Cancha 1" days={defaultWeekSchedule()}
        exceptions={[{ date: '2026-12-25', isOpen: false }]}
        upcomingDates={upcomingDates}
        onSaveWeek={jest.fn()} onAddException={jest.fn()} onDeleteException={onDeleteException}
      />,
    );
    fireEvent.press(getByTestId('exception-delete-2026-12-25'));
    expect(onDeleteException).toHaveBeenCalledWith('2026-12-25');
  });
});
