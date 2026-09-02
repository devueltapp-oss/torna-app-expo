/**
 * Pantalla del stream (POV espectador). Fija el rediseño del 2026-08-29, que nació de
 * un problema de uso: para leer los comentarios había que abrir un modal a pantalla
 * completa, o sea **dejar de ver el partido**.
 *
 *  - En vertical el video ocupa toda la pantalla; al abrir comentarios o jugadores
 *    se encoge y el panel toma la mitad de abajo (modelo Instagram). Nunca lo tapa.
 *  - Un panel por vez.
 *  - Los jugadores salen del video (botón de avatares) y traen las dos parejas + el
 *    club; si ya seguís al club, "Seguir" no se ofrece.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { GameDetailScreen, GameDetailData, MIN_VIEWERS_TO_SHOW } from '../GameDetailScreen';

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(async () => undefined),
  OrientationLock: { LANDSCAPE: 'LANDSCAPE', PORTRAIT_UP: 'PORTRAIT_UP' },
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'yo', name: 'Yo' } }),
}));

// ⚠️ El prefijo `mock` es lo que deja usarla dentro del factory: `jest.mock` se hoistea
// arriba de todo y una variable sin ese prefijo da "out-of-scope variable".
// Espectadores conectados: el hook real pinguea al backend cada 30s. Acá se controla
// el valor a mano — `null` = el backend no puede saberlo (sin Redis).
let mockViewers: number | null = null;
jest.mock('../../hooks/useViewerPing', () => ({
  useViewerPing: () => mockViewers,
}));

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
  isLive: true,
  players: [
    { username: '@ana', name: 'Ana', team: 1, isHost: true },
    { username: '@beto', name: 'Beto', team: 1 },
    { username: '@caro', name: 'Caro', team: 2 },
    { username: '@dani', name: 'Dani', team: 2 },
  ],
  cameras: [{ id: 'cam1', number: 1, label: 'Principal', state: 'available', streamUrl: 'https://x/y.m3u8' } as any],
};

function renderScreen(props: Partial<React.ComponentProps<typeof GameDetailScreen>> = {}) {
  return render(
    <ThemeProvider initial="light">
      <GameDetailScreen game={game} {...props} />
    </ThemeProvider>,
  );
}

describe('GameDetailScreen — paneles que encogen el video (portrait)', () => {
  it('arranca con el video solo: ningún panel abierto', () => {
    const { queryByText } = renderScreen();
    expect(queryByText('Buen punto')).toBeNull();
    expect(queryByText('EQUIPO 1')).toBeNull();
  });

  it('el botón de comentarios los abre abajo y vuelve a cerrarlos', () => {
    const { getByTestId, getByText, getByPlaceholderText, queryByText } = renderScreen();

    fireEvent.press(getByTestId('toggle-comments'));
    expect(getByText('Buen punto')).toBeTruthy();
    // Se puede escribir sin salir de la pantalla del partido.
    expect(getByPlaceholderText('Escribe un comentario...')).toBeTruthy();

    fireEvent.press(getByTestId('toggle-comments'));
    expect(queryByText('Buen punto')).toBeNull();
  });

  it('los avatares abren el panel con LAS DOS parejas y el club', () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('toggle-players'));

    expect(getByText('EQUIPO 1')).toBeTruthy();
    expect(getByText('EQUIPO 2')).toBeTruthy();
    expect(getByText('Ana')).toBeTruthy();
    expect(getByText('Dani')).toBeTruthy();
    // El club va en el mismo panel.
    expect(getByText('CasaPadel')).toBeTruthy();
  });

  it('abrir un panel cierra el otro (uno por vez)', () => {
    const { getByTestId, getByText, queryByText } = renderScreen();

    fireEvent.press(getByTestId('toggle-comments'));
    expect(getByText('Buen punto')).toBeTruthy();

    fireEvent.press(getByTestId('toggle-players'));
    expect(queryByText('Buen punto')).toBeNull();
    expect(getByText('EQUIPO 1')).toBeTruthy();
  });

  it('muestra el NIVEL de la partida (reemplazo del chip de superficie)', () => {
    const { getByTestId, getByText } = renderScreen({ game: { ...game, category: 3 } });
    fireEvent.press(getByTestId('toggle-players'));
    expect(getByText('CAT. 3')).toBeTruthy();
  });

  it('sin nivel declarado no se pinta ningún badge', () => {
    const { getByTestId, queryByText } = renderScreen({ game: { ...game, category: null } });
    fireEvent.press(getByTestId('toggle-players'));
    expect(queryByText(/^CAT\. /)).toBeNull();
  });

  it('sin equipo 2 no se pinta la sección vacía', () => {
    const solos = { ...game, players: [{ username: '@ana', name: 'Ana', team: 1 }] };
    const { getByTestId, getByText, queryByText } = renderScreen({ game: solos });
    fireEvent.press(getByTestId('toggle-players'));
    expect(getByText('EQUIPO 1')).toBeTruthy();
    expect(queryByText('EQUIPO 2')).toBeNull();
  });
});

describe('GameDetailScreen — seguir al club', () => {
  /** El club vive dentro del panel de jugadores. */
  function openPlayers(props: Partial<React.ComponentProps<typeof GameDetailScreen>> = {}) {
    const utils = renderScreen(props);
    fireEvent.press(utils.getByTestId('toggle-players'));
    return utils;
  }

  it('NO ofrece "Seguir" si ya seguís al club', () => {
    const { queryByText } = openPlayers({ isFollowing: true, onToggleFollow: jest.fn() });
    expect(queryByText('Seguir')).toBeNull();
    expect(queryByText('Siguiendo')).toBeNull();
    // El club se sigue mostrando, solo desaparece la acción.
    expect(queryByText('CasaPadel')).toBeTruthy();
  });

  it('ofrece "Seguir" si todavía no lo seguís', () => {
    const onToggleFollow = jest.fn();
    const { getByText } = openPlayers({ isFollowing: false, onToggleFollow });
    fireEvent.press(getByText('Seguir'));
    expect(onToggleFollow).toHaveBeenCalledTimes(1);
  });

  it('sin handler de follow no se pinta el botón (no hay acción posible)', () => {
    const { queryByText } = openPlayers({ isFollowing: false });
    expect(queryByText('Seguir')).toBeNull();
  });
});

describe('GameDetailScreen — comentar desde pantalla completa (landscape)', () => {
  /** Entra a fullscreen y abre el overlay de comentarios. */
  function openOverlayComments() {
    const utils = renderScreen();
    fireEvent.press(utils.getByTestId('toggle-fullscreen'));
    fireEvent.press(utils.getByTestId('toggle-comments'));
    return utils;
  }

  it('en landscape el campo NO escribe: es un botón para volver a vertical', () => {
    const { getByTestId, queryByPlaceholderText } = openOverlayComments();
    // No hay TextInput real: en horizontal el teclado taparía el partido y el hilo.
    expect(queryByPlaceholderText('Escribe un comentario...')).toBeNull();
    expect(getByTestId('compose-in-portrait')).toBeTruthy();
  });

  it('tocarlo sale de pantalla completa y deja el hilo escribible en vertical', () => {
    const ScreenOrientation = require('expo-screen-orientation');
    const { getByTestId, getByPlaceholderText, queryByTestId } = openOverlayComments();

    fireEvent.press(getByTestId('compose-in-portrait'));

    // Volvió a portrait…
    expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith('PORTRAIT_UP');
    // …con el panel de comentarios abierto y un input de verdad.
    expect(getByPlaceholderText('Escribe un comentario...')).toBeTruthy();
    expect(queryByTestId('compose-in-portrait')).toBeNull();
  });
});

/**
 * Contador de espectadores. La regla que se fija acá es la que evita repetir el
 * problema anterior: **no se inventa un número**. Si el backend no puede saberlo
 * (sin Redis → null) o hay muy poca gente, no se muestra nada.
 */
describe('GameDetailScreen — espectadores conectados', () => {
  afterEach(() => { mockViewers = null; });

  it('no muestra nada si el backend no puede saberlo (null)', () => {
    mockViewers = null;
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('viewer-count')).toBeNull();
  });

  it('no muestra el número por debajo del umbral', () => {
    mockViewers = MIN_VIEWERS_TO_SHOW - 1;
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('viewer-count')).toBeNull();
  });

  it('lo muestra a partir del umbral', () => {
    mockViewers = MIN_VIEWERS_TO_SHOW;
    const { getByTestId, getByText } = renderScreen();
    expect(getByTestId('viewer-count')).toBeTruthy();
    expect(getByText(String(MIN_VIEWERS_TO_SHOW))).toBeTruthy();
  });

  it('cero no se muestra (es el caso que más engañaba antes)', () => {
    mockViewers = 0;
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('viewer-count')).toBeNull();
  });
});
