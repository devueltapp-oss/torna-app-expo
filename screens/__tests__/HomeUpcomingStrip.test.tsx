/**
 * Strip "Próximas partidas" — el de ARRIBA del Inicio.
 *
 * Existía como carrusel al FINAL del feed: había que bajar toda la pantalla,
 * pasando por los highlights de otros, para saber cuándo jugabas. Lo que estos
 * tests fijan es lo que hacía falta arreglar: **que esté antes del feed** y que
 * no le cobre espacio a quien no tiene partidas.
 */
import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { HomeScreen } from '../HomeScreen';
import type { UpcomingGameData } from '../../data/types';

// `HomeScreen` usa `useIsFocused` (para pausar los videos del feed), que exige un
// NavigationContainer. Acá se mockea porque nada de lo que se prueba depende del foco.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
}));

const game = (over: Partial<UpcomingGameData> = {}): UpcomingGameData => ({
  id: 'g1',
  time: '19:00',
  date: 'sáb 30/08',
  court: 'Cancha 2',
  club: 'CasaPadel',
  following: 'club',
  players: [],
  ...over,
});

function renderHome(props: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  return render(
    <ThemeProvider initial="light">
      <HomeScreen liveGames={[]} refreshing={false} onRefresh={jest.fn()} {...props} />
    </ThemeProvider>,
  );
}

describe('HomeScreen — strip de próximas partidas', () => {
  it('muestra cuándo y dónde es cada partida', () => {
    const { getByTestId, getByText } = renderHome({ upcomingGames: [game()] });

    expect(getByTestId('upcoming-strip')).toBeTruthy();
    expect(getByText('19:00')).toBeTruthy();
    expect(getByText('sáb 30/08')).toBeTruthy();
    expect(getByText('Cancha 2 · CasaPadel')).toBeTruthy();
  });

  /**
   * Un hueco fijo arriba del feed le cobraría espacio permanente a quien no
   * tiene ninguna partida agendada.
   */
  it('sin partidas no renderiza nada (ni título ni caja vacía)', () => {
    const { queryByTestId, queryByText } = renderHome({ upcomingGames: [] });

    expect(queryByTestId('upcoming-strip')).toBeNull();
    expect(queryByText('Próximas partidas')).toBeNull();
  });

  /**
   * El orden ES la feature: si vuelve debajo del feed, volvemos al problema
   * original de tener que scrollear para ver lo propio.
   */
  it('va ANTES del feed, no al final', () => {
    const { UNSAFE_getAllByType } = renderHome({ upcomingGames: [game()] });

    // `UNSAFE_getAllByType` devuelve en orden de árbol, así que comparar la
    // posición de los dos títulos fija el orden sin depender de la estructura
    // exacta de Views (y sin `JSON.stringify`, que revienta con los Providers
    // del tema por referencias circulares).
    const textos = UNSAFE_getAllByType(Text).map((n) =>
      React.Children.toArray(n.props.children).join(''),
    );
    const iStrip = textos.findIndex((t) => t.includes('Próximas partidas'));
    const iFeed = textos.findIndex((t) => t.includes('Tu feed está vacío'));

    expect(iStrip).toBeGreaterThan(-1);
    expect(iFeed).toBeGreaterThan(-1);
    expect(iStrip).toBeLessThan(iFeed);
  });

  /** El estado vacío habla del FEED; tus partidas existen aunque no sigas a nadie. */
  it('con partidas pero sin feed, se ven las dos cosas', () => {
    const { getByTestId, getByText } = renderHome({ upcomingGames: [game()] });

    expect(getByTestId('upcoming-strip')).toBeTruthy();
    expect(getByText('Tu feed está vacío')).toBeTruthy();
  });

  /** Un toque, no doble toque: el gesto anterior no lo descubría nadie. */
  it('un solo toque abre la partida', () => {
    const onOpenUpcoming = jest.fn();
    const g = game();
    const { getByTestId } = renderHome({ upcomingGames: [g], onOpenUpcoming });

    fireEvent.press(getByTestId('upcoming-g1'));
    expect(onOpenUpcoming).toHaveBeenCalledWith(g);
  });
});
