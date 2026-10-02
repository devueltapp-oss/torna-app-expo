/**
 * Paso 2 de "Agendar partida" (club): categoría + ≥1 cámara + ≥1 jugador real,
 * sin pareja obligatoria ni rivales (ese esquema es de `ReserveStep3Screen`,
 * pensado para la reserva del player). Fija el gate de "Crear partida" y el
 * payload exacto que recibe `onConfirm`.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ClubAssignPlayersScreen } from '../ClubAssignPlayersScreen';
import { ThemeProvider } from '../../theme';
import type { InvitablePlayer } from '../../data/types';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const summary = { title: 'Cancha 1', date: '2 sept', time: '10:00–11:30 · 90 min' };
const cameraOptions = [{ id: 'cam-1', identifier: 'CAM01' }, { id: 'cam-2', identifier: 'CAM02' }];
const player: InvitablePlayer = { id: 'u1', name: 'Maxi', username: '@maxi' };

async function addPlayer(utils: ReturnType<typeof renderWithTheme>, onSearchPlayers: jest.Mock) {
  fireEvent.press(utils.getByText('Agregar jugador'));
  const input = utils.getByPlaceholderText('@usuario o nombre del jugador…');
  fireEvent.changeText(input, 'ma');
  await waitFor(() => expect(onSearchPlayers).toHaveBeenCalledWith('ma'));
  fireEvent.press(await utils.findByText('Maxi'));
}

describe('ClubAssignPlayersScreen', () => {
  it('"Crear partida" arranca deshabilitado sin categoría, cámara ni jugador', () => {
    const onConfirm = jest.fn();
    const { getByText } = renderWithTheme(
      <ClubAssignPlayersScreen summary={summary} cameraOptions={cameraOptions} onConfirm={onConfirm} />,
    );
    fireEvent.press(getByText('Crear partida'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('elegir cámara + nivel + agregar un jugador habilita confirmar con el payload correcto', async () => {
    const onConfirm = jest.fn();
    const onSearchPlayers = jest.fn(async () => [player]);
    const utils = renderWithTheme(
      <ClubAssignPlayersScreen
        summary={summary} cameraOptions={cameraOptions}
        onSearchPlayers={onSearchPlayers} onConfirm={onConfirm}
      />,
    );
    const { getByText, getByTestId } = utils;

    // Cámara
    fireEvent.press(getByText('CAM01'));

    // Nivel
    fireEvent.press(getByTestId('level-field'));
    fireEvent.press(getByText('Nivel 3 · Avanzado'));

    // Todavía sin jugadores: sigue deshabilitado.
    fireEvent.press(getByText('Crear partida'));
    expect(onConfirm).not.toHaveBeenCalled();

    // Agregar jugador vía el buscador.
    await addPlayer(utils, onSearchPlayers);
    expect(getByText('Maxi')).toBeTruthy(); // ya quedó en la lista, fuera del overlay

    fireEvent.press(getByText('Crear partida'));
    expect(onConfirm).toHaveBeenCalledWith({
      cameraIds: ['cam-1'],
      playerIds: ['u1'],
      category: 3,
    });
  });

  it('quitar el único jugador agregado vuelve a deshabilitar "Crear partida"', async () => {
    const onConfirm = jest.fn();
    const onSearchPlayers = jest.fn(async () => [player]);
    const utils = renderWithTheme(
      <ClubAssignPlayersScreen
        summary={summary} cameraOptions={cameraOptions}
        onSearchPlayers={onSearchPlayers} onConfirm={onConfirm}
      />,
    );
    fireEvent.press(utils.getByText('CAM01'));
    fireEvent.press(utils.getByTestId('level-field'));
    fireEvent.press(utils.getByText('Nivel 3 · Avanzado'));
    await addPlayer(utils, onSearchPlayers);

    fireEvent.press(utils.getByLabelText('Quitar jugador'));
    fireEvent.press(utils.getByText('Crear partida'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('sin cámaras configuradas en la cancha, muestra el aviso y no una lista vacía', () => {
    const { getByText } = renderWithTheme(
      <ClubAssignPlayersScreen summary={summary} cameraOptions={[]} />,
    );
    expect(getByText(/no tiene cámaras configuradas en Desktop/)).toBeTruthy();
  });
});
