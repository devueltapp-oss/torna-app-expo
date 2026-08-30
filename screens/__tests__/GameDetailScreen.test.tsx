/**
 * Pantalla del stream (POV espectador). Lo que se fija acá es el rediseño del
 * 2026-08-29, que nació de un problema concreto de uso: para leer los comentarios
 * había que abrir un modal a pantalla completa, o sea **dejar de ver el partido**.
 *
 *  - En vertical los comentarios se ven SIEMPRE, superpuestos al video (mismo
 *    concepto que ya se usaba en horizontal), y el botón sirve para ocultarlos.
 *  - Si ya seguís al club, el botón "Seguir" no se ofrece.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { GameDetailScreen, GameDetailData } from '../GameDetailScreen';

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(async () => undefined),
  OrientationLock: { LANDSCAPE: 'LANDSCAPE', PORTRAIT_UP: 'PORTRAIT_UP' },
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'yo', name: 'Yo' } }),
}));

// ⚠️ El prefijo `mock` es lo que deja usarla dentro del factory: `jest.mock` se hoistea
// arriba de todo y una variable sin ese prefijo da "out-of-scope variable".
const mockSend = jest.fn(async () => true);
jest.mock('../../hooks/useGameComments', () => ({
  useGameComments: () => ({
    comments: [
      { id: 'c1', comment: 'Buen punto', username: 'ana', name: 'Ana', createdAt: new Date().toISOString() },
    ],
    loading: false,
    sending: false,
    send: mockSend,
  }),
}));

const game: GameDetailData = {
  id: 'g1',
  court: 'Cancha 1',
  floor: 'CARPET',
  club: 'CasaPadel',
  clubId: 'club-1',
  clubHandle: '@casapadel',
  clubFollowers: 12,
  time: '19:30',
  date: 'hoy',
  viewers: 4,
  isLive: true,
  players: [],
  cameras: [{ id: 'cam1', number: 1, label: 'Principal', state: 'available', streamUrl: 'https://x/y.m3u8' } as any],
};

function renderScreen(props: Partial<React.ComponentProps<typeof GameDetailScreen>> = {}) {
  return render(
    <ThemeProvider initial="light">
      <GameDetailScreen game={game} {...props} />
    </ThemeProvider>,
  );
}

describe('GameDetailScreen — comentarios sobre el video', () => {
  it('en vertical los comentarios se ven sin tocar nada', () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    // El panel está montado de entrada: se lee el hilo mientras corre el stream.
    expect(getByText('Buen punto')).toBeTruthy();
    // Y también se puede escribir sin abrir nada.
    expect(getByPlaceholderText('Escribe un comentario...')).toBeTruthy();
  });

  it('el botón de la esquina OCULTA los comentarios (ya no abre un modal)', () => {
    const { getByTestId, queryByText } = renderScreen();
    fireEvent.press(getByTestId('toggle-comments'));
    expect(queryByText('Buen punto')).toBeNull();

    // Y los devuelve.
    fireEvent.press(getByTestId('toggle-comments'));
    expect(queryByText('Buen punto')).toBeTruthy();
  });
});

describe('GameDetailScreen — seguir al club', () => {
  it('NO ofrece "Seguir" si ya seguís al club', () => {
    const { queryByText } = renderScreen({ isFollowing: true, onToggleFollow: jest.fn() });
    expect(queryByText('Seguir')).toBeNull();
    expect(queryByText('Siguiendo')).toBeNull();
    // El club se sigue mostrando, solo desaparece la acción.
    expect(queryByText('CasaPadel')).toBeTruthy();
  });

  it('ofrece "Seguir" si todavía no lo seguís', () => {
    const onToggleFollow = jest.fn();
    const { getByText } = renderScreen({ isFollowing: false, onToggleFollow });
    fireEvent.press(getByText('Seguir'));
    expect(onToggleFollow).toHaveBeenCalledTimes(1);
  });

  it('sin handler de follow no se pinta el botón (no hay acción posible)', () => {
    const { queryByText } = renderScreen({ isFollowing: false });
    expect(queryByText('Seguir')).toBeNull();
  });
});
