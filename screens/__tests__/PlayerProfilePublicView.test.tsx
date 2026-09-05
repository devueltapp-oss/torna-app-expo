/**
 * PlayerProfilePublicView — es la MISMA pantalla que el perfil propio
 * (`PlayerOwnProfileScreen`): hero + `TabStrip` de dos pestañas
 * (Highlights / Partidos) + grid 3-col con `ContentThumb`. Lo que cambia:
 * no hay botones propios (⚙/🔒), sí hay fila de acciones (seguir/notificar/
 * mensaje), y los "partidos" que se ven son solo los completos/públicos.
 *
 * En vivo: aro verde en el avatar + badge "EN VIVO" tocable (antes había una
 * tarjeta gigante con preview del stream dentro de la galería).
 * Club: check verde junto al nombre (antes era un aro verde en el avatar).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { PlayerProfilePublicView } from '../PlayerProfilePublicView';
import type { PlayerPublic, LibraryMatch } from '../../data/types';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
}));

const basePlayer: PlayerPublic = {
  id: 'p1',
  name: 'Beto Jugador',
  username: '@beto',
  club: '',
  location: '',
  category: 3,
  followers: 12,
  isFollowing: false,
  isLiveNow: false,
  liveGame: null,
  clips: [],
  followingCount: 4,
  followersList: [],
  followingList: [],
};

const aMatch: LibraryMatch = {
  id: 'm1',
  kind: 'match',
  title: 'Cancha 3',
  isPublic: true,
  cameras: 1,
  highlightsCount: 0,
  recordingUrl: 'https://b2/rec/m1.mp4',
  durationSeconds: 3600,
  durationLabel: '60:00 min',
  date: '2 sep',
};

function renderView(
  overrides: Partial<PlayerPublic> = {},
  props: Partial<React.ComponentProps<typeof PlayerProfilePublicView>> = {},
) {
  return render(
    <ThemeProvider initial="light">
      <PlayerProfilePublicView player={{ ...basePlayer, ...overrides }} {...props} />
    </ThemeProvider>,
  );
}

describe('PlayerProfilePublicView — misma pantalla que el perfil propio', () => {
  it('tiene DOS pestañas: Highlights y Partidos', () => {
    const { getByText } = renderView();
    expect(getByText('▶ HIGHLIGHTS')).toBeTruthy();
    expect(getByText('◫ PARTIDOS')).toBeTruthy();
  });

  it('sin highlights, muestra el estado vacío de esa pestaña', () => {
    const { getByText } = renderView({ clips: [] });
    expect(getByText('Nada por ahora')).toBeTruthy();
    expect(getByText('Este usuario todavía no tiene highlights públicos.')).toBeTruthy();
  });

  it('los clips se muestran en un grid con ContentThumb (duración visible)', () => {
    const { getByText, queryByText } = renderView({
      clips: [{ id: 'c1', title: 'Smash', length: '0:24', date: 'Ayer' }],
    });
    expect(getByText('0:24')).toBeTruthy();
    expect(queryByText('Nada por ahora')).toBeNull();
  });

  it('tocar un clip llama a onOpenClip con ese clip', () => {
    const onOpenClip = jest.fn();
    const clip = { id: 'c1', title: 'Smash', length: '0:24', date: 'Ayer' };
    const { getByText } = renderView({ clips: [clip] }, { onOpenClip });
    fireEvent.press(getByText('0:24'));
    expect(onOpenClip).toHaveBeenCalledWith(clip);
  });

  it('la pestaña Partidos lista los partidos completos y al tocar uno llama a onOpenMatch', () => {
    const onOpenMatch = jest.fn();
    const { getByText } = renderView({}, { matches: [aMatch], onOpenMatch });

    // por defecto arranca en Highlights → vacío
    expect(getByText('Nada por ahora')).toBeTruthy();

    fireEvent.press(getByText('◫ PARTIDOS'));
    fireEvent.press(getByText('60:00 min'));
    expect(onOpenMatch).toHaveBeenCalledWith(aMatch);
  });

  it('en vivo: badge "EN VIVO" tocable que abre el visor — sin tarjeta gigante de stream', () => {
    const onOpenLive = jest.fn();
    const { getByText, queryByText } = renderView(
      {
        isLiveNow: true,
        liveGame: { id: 'g1', court: 'Cancha 1', club: 'Casapadel', players: [] },
        clips: [{ id: 'c1', title: 'Smash', length: '0:24', date: 'Ayer' }],
      },
      { onOpenLive },
    );

    // La vieja tarjeta con "Verlo en vivo →" ya no existe.
    expect(queryByText('Verlo en vivo →')).toBeNull();

    fireEvent.press(getByText('EN VIVO'));
    expect(onOpenLive).toHaveBeenCalledWith('g1');
  });

  it('club: check verde junto al nombre (no un aro verde en el avatar)', () => {
    const { queryAllByLabelText } = renderView({ isClub: true });
    expect(queryAllByLabelText('Cuenta de club').length).toBeGreaterThan(0);
    // un jugador normal no lo lleva
    const { queryAllByLabelText: q2 } = renderView({ isClub: false });
    expect(q2('Cuenta de club').length).toBe(0);
  });

  it('el nivel se muestra como texto ("CAT. N") junto al username', () => {
    const { getByText } = renderView({ category: 5, club: '' });
    expect(getByText('@beto · CAT. 5')).toBeTruthy();
  });

  it('tocar seguidores/seguidos llama a los callbacks correspondientes', () => {
    const onOpenFollowers = jest.fn();
    const onOpenFollowing = jest.fn();
    const { getByText } = renderView({ followers: 12, followingCount: 4 }, { onOpenFollowers, onOpenFollowing });

    fireEvent.press(getByText('12'));
    fireEvent.press(getByText('4'));

    expect(onOpenFollowers).toHaveBeenCalledTimes(1);
    expect(onOpenFollowing).toHaveBeenCalledTimes(1);
  });
});
