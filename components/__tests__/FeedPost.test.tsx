/**
 * FeedPost (2026-09-10): preview real de video en el feed (no un placeholder de
 * color), doble-tap para likear sin abrir el modal, y un corazón tappable en el
 * footer que togglea sin depender del doble tap.
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { FeedPost } from '../cards';
import { ThemeProvider } from '../../theme';
import type { FeedPost as FeedPostData } from '../../data/types';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const basePost: FeedPostData = {
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

describe('FeedPost', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('un tap simple abre el visor tras el delay de desambiguación', () => {
    const onOpen = jest.fn();
    const { getByTestId } = renderWithTheme(
      <FeedPost post={basePost} fullWidth onOpen={onOpen} />,
    );

    fireEvent.press(getByTestId('feed-post-media'));
    expect(onOpen).not.toHaveBeenCalled(); // todavía no — espera a ver si viene un 2º tap

    act(() => { jest.advanceTimersByTime(300); });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('doble tap likea y NO abre el visor', () => {
    const onOpen = jest.fn();
    const onLike = jest.fn();
    const { getByTestId } = renderWithTheme(
      <FeedPost post={basePost} fullWidth onOpen={onOpen} onLike={onLike} />,
    );

    const media = getByTestId('feed-post-media');
    fireEvent.press(media);
    fireEvent.press(media); // 2º tap dentro de la ventana de 300ms

    act(() => { jest.advanceTimersByTime(300); });

    expect(onLike).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('doble tap sobre un highlight YA likeado no vuelve a likear (nunca destlikea)', () => {
    const onLike = jest.fn();
    const { getByTestId } = renderWithTheme(
      <FeedPost post={{ ...basePost, isLikedByMe: true }} fullWidth onLike={onLike} />,
    );

    const media = getByTestId('feed-post-media');
    fireEvent.press(media);
    fireEvent.press(media);

    expect(onLike).not.toHaveBeenCalled();
  });

  it('el corazón del footer togglea el like directo, sin esperar ni abrir nada', () => {
    const onOpen = jest.fn();
    const onLike = jest.fn();
    const { getByTestId } = renderWithTheme(
      <FeedPost post={basePost} fullWidth onOpen={onOpen} onLike={onLike} />,
    );

    fireEvent.press(getByTestId('feed-post-like'));

    expect(onLike).toHaveBeenCalledTimes(1);
    act(() => { jest.advanceTimersByTime(300); });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('sin video ni onOpen, un tap no revienta (post tipo foto)', () => {
    const photoPost: FeedPostData = { ...basePost, type: 'photo', videoUrl: undefined, thumbnailUrl: undefined };
    const { getByTestId } = renderWithTheme(<FeedPost post={photoPost} fullWidth />);
    expect(() => fireEvent.press(getByTestId('feed-post-media'))).not.toThrow();
  });
});
