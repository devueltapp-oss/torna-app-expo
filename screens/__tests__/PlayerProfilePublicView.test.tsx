/**
 * PlayerProfilePublicView — unificado visualmente con PlayerOwnProfileScreen
 * (mismo hero, mismo grid 3-col con `ContentThumb`, mismo `TabStrip`). Antes
 * usaba un carrusel horizontal sin pestañas; ver tu perfil y el de otro
 * jugador se sentía como dos apps distintas para lo mismo.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { PlayerProfilePublicView } from '../PlayerProfilePublicView';
import type { PlayerPublic } from '../../data/types';

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

function renderView(overrides: Partial<PlayerPublic> = {}, props: Partial<React.ComponentProps<typeof PlayerProfilePublicView>> = {}) {
  return render(
    <ThemeProvider initial="light">
      <PlayerProfilePublicView player={{ ...basePlayer, ...overrides }} {...props} />
    </ThemeProvider>,
  );
}

describe('PlayerProfilePublicView — mismo lenguaje visual que el perfil propio', () => {
  it('muestra una sola pestaña "Highlights" (todavía sin historial de partidos de otro jugador)', () => {
    const { getByText, queryByText } = renderView();
    expect(getByText('▶ HIGHLIGHTS')).toBeTruthy();
    expect(queryByText('◫ PARTIDOS')).toBeNull();
  });

  it('sin highlights ni partido en vivo, muestra el estado vacío', () => {
    const { getByText } = renderView({ clips: [] });
    expect(getByText('Nada por ahora')).toBeTruthy();
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

  it('en vivo, muestra la tarjeta EN VIVO arriba del grid (no mezclada con los clips)', () => {
    const onOpenLive = jest.fn();
    const { getByText } = renderView({
      isLiveNow: true,
      liveGame: { id: 'g1', court: 'Cancha 1', club: 'Casapadel', players: [] },
      clips: [{ id: 'c1', title: 'Smash', length: '0:24', date: 'Ayer' }],
    }, { onOpenLive });

    fireEvent.press(getByText('Verlo en vivo →'));
    expect(onOpenLive).toHaveBeenCalledWith('g1');
  });

  it('no hay ningún botón "···" muerto en el header', () => {
    const { queryByTestId } = renderView();
    // El único ícono del header ahora es "volver"; no queda nada a la derecha.
    expect(queryByTestId('more-options')).toBeNull();
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
