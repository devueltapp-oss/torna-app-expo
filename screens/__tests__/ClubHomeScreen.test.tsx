/**
 * `ClubHomeScreen` — paridad con `HomeScreen` (2026-10-02): búsqueda en el
 * header + feed de seguidos ("En vivo · de quienes sigues" / "Highlights · de
 * tus seguidos") debajo de lo propio del club (Enlazar GoPro, en vivo en tu
 * club, próximas reservas). Fija la posición (debajo, no arriba) y el wiring
 * del botón de búsqueda.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClubHomeScreen } from '../ClubHomeScreen';
import { ThemeProvider } from '../../theme';
import type { LiveGameData } from '../../components/cards';
import type { FeedPost as FeedPostData } from '../../data/types';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const followedLive: LiveGameData = { id: 'g1', players: [], club: 'Otro club', court: 'Cancha 2' };
const highlightPost: FeedPostData = {
  id: 'hl-1', type: 'highlight',
  author: { name: 'Maxi', username: '@maxi', role: 'player' },
  postedAt: '2h', likes: 0, comments: 0, duration: '0:10',
  videoUrl: 'https://b2/clip.mp4', thumbnailUrl: 'https://b2/t.jpg', isLikedByMe: false,
};

describe('ClubHomeScreen', () => {
  it('el ícono de búsqueda llama a onOpenSearch', () => {
    const onOpenSearch = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <ClubHomeScreen
        clubName="Club Jeyu" liveGames={[]} todayReservations={[]}
        onOpenSearch={onOpenSearch}
      />,
    );
    // El botón no tiene testID propio: se identifica por su único ícono Search.
    // Usamos el mismo criterio que el resto de la suite — accesibilidad vía rol.
    fireEvent.press(getByLabelText(/buscar/i));
    expect(onOpenSearch).toHaveBeenCalledTimes(1);
  });

  it('sin onOpenSearch, no muestra el botón de búsqueda', () => {
    const { queryByLabelText } = renderWithTheme(
      <ClubHomeScreen clubName="Club Jeyu" liveGames={[]} todayReservations={[]} />,
    );
    expect(queryByLabelText(/buscar/i)).toBeNull();
  });

  it('las reservas de hoy sin feed de seguidos: no muestra las secciones de feed', () => {
    const { queryByText } = renderWithTheme(
      <ClubHomeScreen clubName="Club Jeyu" liveGames={[]} todayReservations={[]} />,
    );
    expect(queryByText('En vivo · de quienes sigues')).toBeNull();
    expect(queryByText('Highlights · de tus seguidos')).toBeNull();
  });

  it('con feed de seguidos, las secciones aparecen DESPUÉS de "Partidas de tu club"', () => {
    const { getByText, toJSON } = renderWithTheme(
      <ClubHomeScreen
        clubName="Club Jeyu" liveGames={[]} todayReservations={[]}
        followedLiveGames={[followedLive]} feedPosts={[highlightPost]}
      />,
    );
    const json = JSON.stringify(toJSON());
    const reservasIdx = json.indexOf('Partidas de tu club');
    const liveIdx = json.indexOf('En vivo · de quienes sigues');
    const highlightsIdx = json.indexOf('Highlights · de tus seguidos');
    expect(reservasIdx).toBeGreaterThan(-1);
    expect(liveIdx).toBeGreaterThan(reservasIdx);
    expect(highlightsIdx).toBeGreaterThan(reservasIdx);
    expect(getByText('En vivo · de quienes sigues')).toBeTruthy();
  });

  it('like de un highlight del feed llama a onLikeHighlight', () => {
    const onLikeHighlight = jest.fn();
    const { getByTestId } = renderWithTheme(
      <ClubHomeScreen
        clubName="Club Jeyu" liveGames={[]} todayReservations={[]}
        feedPosts={[highlightPost]} onLikeHighlight={onLikeHighlight}
      />,
    );
    fireEvent.press(getByTestId('feed-post-like'));
    expect(onLikeHighlight).toHaveBeenCalledWith('hl-1');
  });

  it('la agenda del club se muestra separada del feed', () => {
    const ownLive: LiveGameData = { id: 'own-1', players: [], club: 'Club Jeyu', court: 'Cancha 1' };
    const { getByText } = renderWithTheme(
      <ClubHomeScreen clubName="Club Jeyu" liveGames={[ownLive]} todayReservations={[]} />,
    );
    expect(getByText('Partidas de tu club')).toBeTruthy();
  });
});
