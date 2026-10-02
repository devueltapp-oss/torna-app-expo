import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ClubEditCourtContainer } from '../ClubEditCourtContainer';
import { ThemeProvider } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCourt, updateCourt } from '../../api/clubs';
import { fetchClubCameras } from '../../api/cameras';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../api/clubs', () => ({ fetchCourt: jest.fn(), updateCourt: jest.fn() }));
jest.mock('../../api/cameras', () => ({ fetchClubCameras: jest.fn() }));

const court = { id: 'court-1', name: 'Cancha 1', cams: 1, indoor: false, nextSlot: '', active: true, cameras: [{ id: 'cam-1', identifier: 'CAM01' }] };
const allCameras = [{ id: 'cam-1', identifier: 'CAM01', bleName: '1234' }, { id: 'cam-2', identifier: 'CAM02', bleName: null }];

beforeEach(() => {
  jest.clearAllMocks();
  (fetchCourt as jest.Mock).mockResolvedValue(court);
  (fetchClubCameras as jest.Mock).mockResolvedValue(allCameras);
  (updateCourt as jest.Mock).mockResolvedValue(court);
});

test.each([null, { id: 'player', isClub: false }])('no monta para non-club %j', async (user) => {
  (useAuth as jest.Mock).mockReturnValue({ user });
  // `useTheme()` corre ANTES del early-return de rol (regla de hooks: nunca
  // condicionales) — necesita `ThemeProvider` aunque el resultado final sea null.
  const view = renderWithTheme(<ClubEditCourtContainer route={{ params: { courtId: 'court-1' } }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
  expect(view.toJSON()).toBeNull();
  expect(fetchCourt).not.toHaveBeenCalled();
});

test('club: carga la cancha + todas las cámaras del club, y guarda con updateCourt', async () => {
  (useAuth as jest.Mock).mockReturnValue({ user: { id: 'club-1', isClub: true } });
  const navigate = jest.fn();
  const goBack = jest.fn();
  const view = renderWithTheme(
    <ClubEditCourtContainer route={{ params: { courtId: 'court-1' } }} navigation={{ goBack, navigate }} />,
  );

  await waitFor(() => expect(view.getByText('Cancha 1')).toBeTruthy());
  expect(fetchCourt).toHaveBeenCalledWith('court-1');
  expect(fetchClubCameras).toHaveBeenCalled();

  fireEvent.press(view.getByText('CAM02'));
  fireEvent.press(view.getByText('Guardar cambios'));

  await waitFor(() => expect(updateCourt).toHaveBeenCalledWith(
    { id: 'club-1', isClub: true }, 'court-1', { cameraIds: ['cam-1', 'cam-2'], isActive: true },
  ));
  await waitFor(() => expect(goBack).toHaveBeenCalledTimes(1));
});
