/**
 * `SocialFeedSections` — extraído de `HomeScreen` (2026-10-02) para que
 * `ClubHomeScreen` tenga el mismo feed de seguidos sin duplicar ~80 líneas con
 * reglas ya fijadas por otros tests (sin "Ver todos", `isActive` pausa video).
 * Acá solo se fija la composición: qué se muestra/oculta y que el estado vacío
 * es responsabilidad del llamador.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SocialFeedSections } from '../SocialFeedSections';
import { ThemeProvider } from '../../theme';
import type { LiveGameData } from '../cards';
import type { FeedPost as FeedPostData } from '../../data/types';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const tornaLogo = 1; // require() mock: cualquier valor sirve, no se renderiza como imagen real en jest

const liveGame: LiveGameData = {
  id: 'g1', players: [], club: 'Club Jeyu', court: 'Cancha 1', streamUrl: undefined,
};

const highlightPost: FeedPostData = {
  id: 'hl-1',
  type: 'highlight',
  author: { name: 'Maxi', username: '@maxi', role: 'player' },
  postedAt: '2h',
  likes: 3,
  comments: 1,
  duration: '0:12',
  videoUrl: 'https://b2/clip.mp4',
  thumbnailUrl: 'https://b2/thumb.jpg',
  isLikedByMe: false,
};

describe('SocialFeedSections', () => {
  it('sin datos y sin emptyState, no renderiza nada', () => {
    const { toJSON } = renderWithTheme(
      <SocialFeedSections liveGames={[]} feedPosts={[]} tornaLogo={tornaLogo} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('sin datos, muestra el emptyState que pase el llamador', () => {
    const { getByText } = renderWithTheme(
      <SocialFeedSections
        liveGames={[]} feedPosts={[]} tornaLogo={tornaLogo}
        emptyState={<Text>Seguí gente para ver algo acá</Text>}
      />,
    );
    expect(getByText('Seguí gente para ver algo acá')).toBeTruthy();
  });

  it('con partidas en vivo, muestra la sección "En vivo · de quienes sigues" y NO el emptyState', () => {
    const { getByText, queryByText } = renderWithTheme(
      <SocialFeedSections
        liveGames={[liveGame]} feedPosts={[]} tornaLogo={tornaLogo}
        emptyState={<Text>vacío</Text>}
      />,
    );
    expect(getByText('En vivo · de quienes sigues')).toBeTruthy();
    expect(queryByText('vacío')).toBeNull();
    // Sin botón "Ver todos": las cards ya están todas ahí abajo.
    expect(queryByText('Ver todos')).toBeNull();
  });

  it('con highlights, muestra "Highlights · de tus seguidos" y el like dispara onLikeHighlight', () => {
    const onLikeHighlight = jest.fn();
    const { getByText, getByTestId } = renderWithTheme(
      <SocialFeedSections
        liveGames={[]} feedPosts={[highlightPost]} tornaLogo={tornaLogo}
        onLikeHighlight={onLikeHighlight}
      />,
    );
    expect(getByText('Highlights · de tus seguidos')).toBeTruthy();
    fireEvent.press(getByTestId('feed-post-like'));
    expect(onLikeHighlight).toHaveBeenCalledWith('hl-1');
  });

  it('con las dos listas, muestra las dos secciones a la vez', () => {
    const { getByText } = renderWithTheme(
      <SocialFeedSections liveGames={[liveGame]} feedPosts={[highlightPost]} tornaLogo={tornaLogo} />,
    );
    expect(getByText('En vivo · de quienes sigues')).toBeTruthy();
    expect(getByText('Highlights · de tus seguidos')).toBeTruthy();
  });
});
