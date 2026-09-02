/**
 * Badge de postulados en "Mis partidas".
 *
 * Existe porque la sección "Postulados" vive dentro del sheet: sin una señal en
 * la lista había que abrir las partidas **una por una** para descubrir quién
 * estaba esperando. Y el organizador es justo el que tiene que contestar rápido,
 * porque el rival sin respuesta se va a otra partida.
 *
 * Las dos reglas que fija: se muestra **solo al organizador** (es el único que
 * puede aceptar o rechazar) y **solo con postulaciones PENDING**.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { GamesScreen } from '../GamesScreen';
import type { GameApplication, UpcomingGameData } from '../../data/types';

const application = (
  id: string,
  status: GameApplication['status'] = 'PENDING',
): GameApplication => ({
  id,
  status,
  applicant: { id: `u-${id}`, username: `@p${id}`, name: `Jugador ${id}` },
});

const game = (over: Partial<UpcomingGameData> = {}): UpcomingGameData => ({
  id: 'g1',
  time: '19:00',
  date: 'sáb 30/08',
  court: 'Cancha 2',
  club: 'CasaPadel',
  following: 'club',
  players: [{ id: 'u1', username: '@raul', name: 'Raul', isHost: true }],
  isCreator: true,
  maxPlayers: 4,
  ...over,
});

function renderGames(myGames: UpcomingGameData[]) {
  return render(
    <ThemeProvider initial="light">
      <GamesScreen games={[]} role="player" myGames={myGames} />
    </ThemeProvider>,
  );
}

describe('GamesScreen — badge de postulados', () => {
  it('muestra cuántos hay esperando, al organizador', () => {
    const { getByText, getByTestId } = renderGames([
      game({ applications: [application('a'), application('b')] }),
    ]);

    expect(getByTestId('pending-applications-badge')).toBeTruthy();
    expect(getByText('2 postulados')).toBeTruthy();
  });

  it('usa el singular con uno solo', () => {
    const { getByText } = renderGames([game({ applications: [application('a')] })]);
    expect(getByText('1 postulado')).toBeTruthy();
  });

  /** Quien no organiza no puede aceptar ni rechazar: para él sería solo ruido. */
  it('NO se muestra a quien no organiza la partida', () => {
    const { queryByTestId } = renderGames([
      game({ isCreator: false, applications: [application('a')] }),
    ]);

    expect(queryByTestId('pending-applications-badge')).toBeNull();
  });

  it('NO cuenta las ya resueltas (aceptadas o rechazadas)', () => {
    const { queryByTestId } = renderGames([
      game({ applications: [application('a', 'ACCEPTED'), application('b', 'REJECTED')] }),
    ]);

    expect(queryByTestId('pending-applications-badge')).toBeNull();
  });

  it('sin postulaciones no aparece nada', () => {
    const { queryByTestId } = renderGames([game({ applications: [] })]);
    expect(queryByTestId('pending-applications-badge')).toBeNull();
  });

  /** Partidas viejas mapeadas antes de que el campo existiera. */
  it('tolera que `applications` no venga', () => {
    const { queryByTestId } = renderGames([game({ applications: undefined })]);
    expect(queryByTestId('pending-applications-badge')).toBeNull();
  });
});
