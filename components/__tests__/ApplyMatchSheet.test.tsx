/**
 * ApplyMatchSheet — postularme a una partida abierta. Cobertura de UI: se
 * muestra el resumen del partido, el switch de compañero habilita/deshabilita
 * el botón de confirmar, y la postulación llama a `applyToGame` con el id
 * correcto. El deslizar-para-cerrar se cubre en `useSwipeToDismiss.test.ts`.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { ApplyMatchSheet } from '../ApplyMatchSheet';
import * as gamesApi from '../../api/games';
import type { UpcomingGameData } from '../../data/types';

jest.mock('../../api/games', () => ({
  applyToGame: jest.fn(),
}));

const game: UpcomingGameData = {
  id: 'g1',
  time: '18:00',
  date: 'Hoy',
  court: 'Cancha 2',
  club: 'Club Casapadel',
  players: [],
  following: 'club',
};

function renderSheet(props: Partial<React.ComponentProps<typeof ApplyMatchSheet>> = {}) {
  const onClose = jest.fn();
  const onApplied = jest.fn();
  const utils = render(
    <ThemeProvider initial="light">
      <ApplyMatchSheet
        visible
        game={game}
        invitablePlayers={[]}
        onClose={onClose}
        onApplied={onApplied}
        {...props}
      />
    </ThemeProvider>,
  );
  return { ...utils, onClose, onApplied };
}

beforeEach(() => {
  (gamesApi.applyToGame as jest.Mock).mockReset().mockResolvedValue(undefined);
});

describe('ApplyMatchSheet', () => {
  it('muestra el resumen de la partida', () => {
    const { getByText } = renderSheet();
    expect(getByText('18:00 · Cancha 2')).toBeTruthy();
    expect(getByText('Hoy · Club Casapadel')).toBeTruthy();
  });

  it('sin compañero, "Postularme" llama a applyToGame sin partnerId', async () => {
    const { getByTestId, onApplied, onClose } = renderSheet();
    fireEvent.press(getByTestId('apply-confirm'));

    await waitFor(() => expect(gamesApi.applyToGame).toHaveBeenCalledWith('g1', undefined));
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('activar "Voy con compañero" agrega el slot de compañero y renombra el botón', () => {
    const { getByText, getByRole } = renderSheet();
    fireEvent.press(getByRole('switch'));

    expect(getByText('Agregar compañero')).toBeTruthy();
    expect(getByText('Postularnos')).toBeTruthy();
  });

  it('un error al postularse NO cierra la hoja ni llama a onApplied', async () => {
    (gamesApi.applyToGame as jest.Mock).mockRejectedValue(new Error('HTTP 409'));
    const { getByTestId, onApplied, onClose } = renderSheet();

    fireEvent.press(getByTestId('apply-confirm'));

    await waitFor(() => expect(gamesApi.applyToGame).toHaveBeenCalledTimes(1));
    expect(onApplied).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('tocar "Cancelar" cierra sin postularse', () => {
    const { getByText, onClose } = renderSheet();
    fireEvent.press(getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(gamesApi.applyToGame).not.toHaveBeenCalled();
  });
});
