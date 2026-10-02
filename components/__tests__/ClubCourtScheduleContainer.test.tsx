import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ClubCourtScheduleContainer } from '../ClubCourtScheduleContainer';
import { ThemeProvider } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchCourt, fetchCourtSchedule, updateCourtSchedule,
  fetchCourtExceptions, createCourtException, deleteCourtException,
} from '../../api/clubs';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../api/clubs', () => ({
  fetchCourt: jest.fn(), fetchCourtSchedule: jest.fn(), updateCourtSchedule: jest.fn(),
  fetchCourtExceptions: jest.fn(), createCourtException: jest.fn(), deleteCourtException: jest.fn(),
}));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const court = { id: 'court-1', name: 'Cancha 1', cams: 1, indoor: false, nextSlot: '', blockMinutes: 90, pricePerBlock: 500 };

beforeEach(() => {
  jest.clearAllMocks();
  (fetchCourt as jest.Mock).mockResolvedValue(court);
  (fetchCourtSchedule as jest.Mock).mockResolvedValue({ blockMinutes: 90, pricePerBlock: 500, days: [] });
  (fetchCourtExceptions as jest.Mock).mockResolvedValue([]);
  (updateCourtSchedule as jest.Mock).mockResolvedValue({});
  (createCourtException as jest.Mock).mockResolvedValue({ date: '2026-09-03', isOpen: false });
  (deleteCourtException as jest.Mock).mockResolvedValue(undefined);
});

test.each([null, { id: 'player', isClub: false }])('no monta para non-club %j', async (user) => {
  (useAuth as jest.Mock).mockReturnValue({ user });
  const view = render(<ClubCourtScheduleContainer route={{ params: { courtId: 'court-1' } }} navigation={{ goBack: jest.fn() }} />);
  expect(view.toJSON()).toBeNull();
  expect(fetchCourt).not.toHaveBeenCalled();
});

test('club: carga cancha + horario + excepciones, y guarda preservando blockMinutes/pricePerBlock', async () => {
  (useAuth as jest.Mock).mockReturnValue({ user: { id: 'club-1', isClub: true } });
  const view = renderWithTheme(
    <ClubCourtScheduleContainer route={{ params: { courtId: 'court-1' } }} navigation={{ goBack: jest.fn() }} />,
  );

  await waitFor(() => expect(view.getByText(/Cancha 1/)).toBeTruthy());
  expect(fetchCourt).toHaveBeenCalledWith('court-1');
  expect(fetchCourtSchedule).toHaveBeenCalledWith('court-1');
  expect(fetchCourtExceptions).toHaveBeenCalledWith('court-1');

  // Cerrar el lunes y guardar — blockMinutes/pricePerBlock deben viajar
  // intactos aunque no se estén editando (PUT = reemplazo completo).
  fireEvent.press(view.getByTestId('day-open-1'));
  fireEvent.press(view.getByText('Guardar horario semanal'));

  await waitFor(() => expect(updateCourtSchedule).toHaveBeenCalled());
  const [, , payload] = (updateCourtSchedule as jest.Mock).mock.calls[0];
  expect(payload.blockMinutes).toBe(90);
  expect(payload.pricePerBlock).toBe(500);
  expect(payload.days.find((d: any) => d.dayOfWeek === 1).isOpen).toBe(false);
});

test('agregar una excepción llama a createCourtException y la deja en la lista', async () => {
  (useAuth as jest.Mock).mockReturnValue({ user: { id: 'club-1', isClub: true } });
  const view = renderWithTheme(
    <ClubCourtScheduleContainer route={{ params: { courtId: 'court-1' } }} navigation={{ goBack: jest.fn() }} />,
  );
  await waitFor(() => expect(view.getByText(/Cancha 1/)).toBeTruthy());

  fireEvent.press(view.getByText('Agregar'));
  fireEvent.press(view.getByText('Hoy'));
  fireEvent.press(view.getByText('Guardar excepción'));

  // "Hoy" es la fecha real del sistema al correr el test — se calcula igual
  // que lo hace el contenedor (`buildUpcomingDates`), no se fija a mano.
  const pad = (x: number) => String(x).padStart(2, '0');
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  await waitFor(() => expect(createCourtException).toHaveBeenCalledWith(
    { id: 'club-1', isClub: true }, 'court-1', { date: todayIso, isOpen: false, openMinute: undefined, closeMinute: undefined },
  ));
});
