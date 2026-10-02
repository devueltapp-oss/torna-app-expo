/**
 * Bug real (2026-10-03): tras crear una partida, el club caía en una
 * pantalla de "¡listo!" estática y la cámara elegida quedaba adjunta SIN
 * estar conectada — la partida se veía "DETENIDA" con un stream inexistente.
 * Ahora navega a `ClubPrepareGame` (conectar cámaras al WiFi + revisar
 * encuadre) en vez de abandonar al club ahí.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ClubAssignPlayersContainer } from '../ClubAssignPlayersContainer';
import { ThemeProvider } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { createClubGame } from '../../api/games';
import { searchUsers } from '../../api/users';

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../api/games', () => ({ createClubGame: jest.fn() }));
jest.mock('../../api/users', () => ({ searchUsers: jest.fn() }));

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const baseParams = {
  courtId: 'court-1', courtLabel: 'Cancha 1',
  cameraOptions: [{ id: 'cam-1', identifier: 'CAM01' }],
  date: '2026-09-02', slotStart: '10:00', slotEnd: '11:30', durationMinutes: 90,
};
const player = { id: 'u1', name: 'Maxi', username: 'maxi' };

beforeEach(() => {
  jest.clearAllMocks();
  (useAuth as jest.Mock).mockReturnValue({ user: { id: 'club-1', isClub: true } });
  (searchUsers as jest.Mock).mockResolvedValue([player]);
  (createClubGame as jest.Mock).mockResolvedValue({ id: 'game-new' });
});

test('al crear, resetea el stack a MainClub(Juegos) + ClubPrepareGame con el id de la partida nueva — no a una pantalla de "listo" sin salida', async () => {
  const reset = jest.fn();
  const utils = renderWithTheme(
    <ClubAssignPlayersContainer route={{ params: baseParams }} navigation={{ goBack: jest.fn(), reset }} />,
  );

  // Completar el paso 2: cámara + nivel + un jugador (mismo flujo que ClubAssignPlayersScreen.test.tsx).
  fireEvent.press(utils.getByText('CAM01'));
  fireEvent.press(utils.getByTestId('level-field'));
  fireEvent.press(utils.getByText('Nivel 3 · Avanzado'));
  fireEvent.press(utils.getByText('Agregar jugador'));
  fireEvent.changeText(utils.getByPlaceholderText('@usuario o nombre del jugador…'), 'ma');
  await waitFor(() => expect(searchUsers).toHaveBeenCalledWith('ma'));
  fireEvent.press(await utils.findByText('Maxi'));
  fireEvent.press(utils.getByText('Crear partida'));

  await waitFor(() => expect(createClubGame).toHaveBeenCalled());
  await waitFor(() => expect(reset).toHaveBeenCalledWith({
    index: 1,
    routes: [
      { name: 'MainClub', params: { initialTab: 'games' } },
      { name: 'ClubPrepareGame', params: { gameId: 'game-new' } },
    ],
  }));
});
