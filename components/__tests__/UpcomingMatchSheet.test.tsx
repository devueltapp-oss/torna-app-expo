/**
 * Host y categoría en la hoja de detalle de una partida.
 *
 * El backend ya marca al organizador con `GamePlayer.isCaptain` y lo manda en
 * `/game/mine` y `/game/open`; la app lo mapea a `UpcomingGamePlayer.isHost`.
 * Antes ese dato se descartaba y no había forma de saber **quién** organizó.
 *
 * Categoría: 1 = más alta, 7 = iniciación (convención de pádel).
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { UpcomingMatchSheet } from '../UpcomingMatchSheet';
import type { UpcomingGameData } from '../../data/types';

const baseGame: UpcomingGameData = {
  id: 'g1',
  time: '19:00',
  date: '21 ago',
  court: 'Cancha 2',
  club: 'CasaPadel',
  following: 'club',
  players: [
    { id: 'u1', username: '@raulsncz', name: 'Raul', isHost: true },
    { id: 'u2', username: '@ana', name: 'Ana' },
  ],
};

function renderSheet(game: Partial<UpcomingGameData> = {}) {
  return render(
    <ThemeProvider initial="light">
      <UpcomingMatchSheet
        visible
        game={{ ...baseGame, ...game }}
        onClose={jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe('UpcomingMatchSheet — host y categoría', () => {
  it('marca como HOST solo al organizador', () => {
    const { getAllByText } = renderSheet();
    // Un único badge, y el organizador es quien viene con isHost del backend.
    expect(getAllByText('HOST')).toHaveLength(1);
  });

  it('sin organizador declarado no muestra ningún HOST', () => {
    const { queryByText } = renderSheet({
      players: [
        { id: 'u1', username: '@raulsncz', name: 'Raul' },
        { id: 'u2', username: '@ana', name: 'Ana' },
      ],
    });
    expect(queryByText('HOST')).toBeNull();
  });

  it('muestra la categoría de la partida', () => {
    const { getByText } = renderSheet({ category: 3 });
    expect(getByText('CAT. 3')).toBeTruthy();
  });

  it('sin categoría declarada no muestra el badge', () => {
    const { queryByText } = renderSheet({ category: null });
    expect(queryByText(/^CAT\./)).toBeNull();
  });
});
