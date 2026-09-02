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
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { UpcomingMatchSheet } from '../UpcomingMatchSheet';
import type { GameApplication, UpcomingGameData } from '../../data/types';

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

function renderSheet(
  game: Partial<UpcomingGameData> = {},
  props: Partial<React.ComponentProps<typeof UpcomingMatchSheet>> = {},
) {
  return render(
    <ThemeProvider initial="light">
      <UpcomingMatchSheet
        visible
        game={{ ...baseGame, ...game }}
        onClose={jest.fn()}
        {...props}
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

/**
 * Lista de postulados (solo la ve el organizador).
 *
 * Aceptar o rechazar a alguien mirando un nombre y un avatar de 36px no es
 * decidir: cada postulante tiene que ser tocable y llevar a su perfil, y su
 * nivel tiene que verse ahí mismo.
 */
describe('UpcomingMatchSheet — postulados', () => {
  const solo: GameApplication = {
    id: 'app-1',
    status: 'PENDING',
    applicant: { id: 'u9', username: '@carla', name: 'Carla', category: 4 },
  };

  const pareja: GameApplication = {
    id: 'app-2',
    status: 'PENDING',
    applicant: { id: 'u7', username: '@nico', name: 'Nico', category: 2 },
    partner: { id: 'u8', username: '@dani', name: 'Dani', category: 3 },
  };

  it('lista postulantes individuales y parejas con su nivel', () => {
    const { getByText } = renderSheet({ isCreator: true, applications: [solo, pareja] });

    expect(getByText('Carla')).toBeTruthy();
    expect(getByText('Nico')).toBeTruthy();
    expect(getByText('Dani')).toBeTruthy(); // el compañero de la pareja también
    expect(getByText('CAT. 4')).toBeTruthy();
  });

  it('tocar a un postulante abre su perfil', () => {
    const onOpenPlayerProfile = jest.fn();
    const { getByText } = renderSheet(
      { isCreator: true, applications: [pareja] },
      { onOpenPlayerProfile },
    );

    fireEvent.press(getByText('Nico'));
    expect(onOpenPlayerProfile).toHaveBeenCalledWith('u7');

    // El compañero también: es la mitad de la pareja que entra a tu partida.
    fireEvent.press(getByText('Dani'));
    expect(onOpenPlayerProfile).toHaveBeenCalledWith('u8');
  });

  it('quien no organiza no ve la lista de postulados', () => {
    const { queryByText } = renderSheet({ isCreator: false, applications: [solo] });
    expect(queryByText('Postulados')).toBeNull();
    expect(queryByText('Carla')).toBeNull();
  });
});

/**
 * Invitar a una partida ya creada.
 *
 * La regla que fija: **cualquier participante puede invitar, no solo el host**.
 * La partida es de los cuatro, y esperar a que el organizador invite es lo que
 * deja lugares vacíos — cuanta más gente reciba la invitación, más
 * postulaciones llegan.
 */
describe('UpcomingMatchSheet — invitar', () => {
  it('el organizador puede invitar', () => {
    const onInvite = jest.fn();
    const { getByTestId } = renderSheet(
      { isCreator: true, viewerIsParticipant: true },
      { onInvite },
    );

    fireEvent.press(getByTestId('invite-to-game'));
    expect(onInvite).toHaveBeenCalledWith('g1');
  });

  it('un jugador que NO organiza también puede invitar', () => {
    const onInvite = jest.fn();
    const { getByTestId } = renderSheet(
      { isCreator: false, viewerIsParticipant: true },
      { onInvite },
    );

    fireEvent.press(getByTestId('invite-to-game'));
    expect(onInvite).toHaveBeenCalledWith('g1');
  });

  it('quien no juega la partida no puede invitar', () => {
    const { queryByTestId } = renderSheet(
      { isCreator: false, viewerIsParticipant: false },
      { onInvite: jest.fn() },
    );

    expect(queryByTestId('invite-to-game')).toBeNull();
  });

  /** Invitar a algo que ya pasó no tiene sentido. */
  it.each(['FINISHED', 'CANCELLED'])('no se puede invitar a una partida %s', (status) => {
    const { queryByTestId } = renderSheet(
      { viewerIsParticipant: true, status },
      { onInvite: jest.fn() },
    );

    expect(queryByTestId('invite-to-game')).toBeNull();
  });
});
