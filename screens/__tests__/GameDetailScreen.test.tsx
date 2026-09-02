/**
 * Pantalla del stream (POV espectador). Lo que fijan estos tests es una sola idea,
 * a la que se llegó en dos pasos: **mirar el partido no se interrumpe nunca**.
 *
 *  - Los comentarios **flotan sobre el video** y se escriben en la barra de abajo
 *    (2026-09-01). Antes abrían un panel que encogía el partido; antes de eso, un
 *    modal a pantalla completa. El botón 💬 hoy solo los oculta.
 *  - El **club** se nombra una sola vez, en el chip de arriba (con EN VIVO y
 *    Seguir). No se repite en el panel.
 *  - El panel de **jugadores** es lo único que todavía encoge el video: trae las dos
 *    parejas, o una sola sección "Jugadores" si la partida no declaró equipos.
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
    { id: 'u-ana', username: '@ana', name: 'Ana', team: 1, isHost: true },
    { id: 'u-beto', username: '@beto', name: 'Beto', team: 1 },
    { id: 'u-caro', username: '@caro', name: 'Caro', team: 2 },
    { id: 'u-dani', username: '@dani', name: 'Dani', team: 2 },
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

describe('GameDetailScreen — comentarios sobre el video (portrait)', () => {
  it('se ven SIEMPRE, sin abrir nada: el partido no se interrumpe', () => {
    const { getByText, getByTestId } = renderScreen();
    expect(getByText(/Buen punto/)).toBeTruthy();
    expect(getByTestId('comments-overlay')).toBeTruthy();
  });

  it('se escribe en la barra de abajo, no en un panel', () => {
    const { getByPlaceholderText, queryByTestId } = renderScreen();
    expect(getByPlaceholderText('Escribe algo...')).toBeTruthy();
    // No hay panel que encoja el video para escribir.
    expect(queryByTestId('comments-panel')).toBeNull();
  });

  it('el botón 💬 solo los oculta y los vuelve a mostrar', () => {
    const { getByTestId, getByText, queryByText } = renderScreen();

    fireEvent.press(getByTestId('toggle-comments'));
    expect(queryByText(/Buen punto/)).toBeNull();

    fireEvent.press(getByTestId('toggle-comments'));
    expect(getByText(/Buen punto/)).toBeTruthy();
  });

  it('enviar limpia el campo y llama al hook', async () => {
    const { getByTestId, getByPlaceholderText } = renderScreen();
    const input = getByPlaceholderText('Escribe algo...');

    fireEvent.changeText(input, 'vamos!');
    fireEvent.press(getByTestId('send-comment'));

    expect(mockSend).toHaveBeenCalledWith('vamos!');
  });
});

describe('GameDetailScreen — panel de jugadores (portrait)', () => {
  it('arranca cerrado', () => {
    const { queryByText } = renderScreen();
    expect(queryByText('EQUIPO 1')).toBeNull();
  });

  it('los avatares abren el panel con LAS DOS parejas', () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('toggle-players'));

    expect(getByText('EQUIPO 1')).toBeTruthy();
    expect(getByText('EQUIPO 2')).toBeTruthy();
    expect(getByText('Beto')).toBeTruthy();
    expect(getByText('Dani')).toBeTruthy();
  });

  it('el club NO está en el panel: vive en el chip de arriba', () => {
    const { getByTestId, queryByTestId, queryByText } = renderScreen();
    fireEvent.press(getByTestId('toggle-players'));

    expect(queryByTestId('open-club')).toBeNull();
    expect(queryByText('CLUB')).toBeNull();
    expect(getByTestId('header-club')).toBeTruthy();
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

  it('sin equipos declarados va UNA sección "Jugadores", no un EQUIPO 1 inventado', () => {
    const sinEquipos = { ...game, players: game.players.map((p) => ({ ...p, team: null })) };
    const { getByTestId, getByText, queryByText } = renderScreen({ game: sinEquipos });
    fireEvent.press(getByTestId('toggle-players'));
    expect(getByText('JUGADORES')).toBeTruthy();
    expect(queryByText('EQUIPO 1')).toBeNull();
    // Nadie se pierde: los cuatro siguen listados. (Se chequea con Beto y Dani:
    // "Ana" también firma un comentario del overlay y sería ambiguo.)
    expect(getByText('Beto')).toBeTruthy();
    expect(getByText('Dani')).toBeTruthy();
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
    const { queryByText, getByTestId } = openPlayers({ isFollowing: true, onToggleFollow: jest.fn() });
    expect(queryByText('Seguir')).toBeNull();
    expect(queryByText('Siguiendo')).toBeNull();
    // El club se sigue mostrando (en el chip), solo desaparece la acción.
    expect(getByTestId('header-club')).toBeTruthy();
  });

  it('ofrece "Seguir" si todavía no lo seguís', () => {
    const onToggleFollow = jest.fn();
    const { getByTestId } = openPlayers({ isFollowing: false, onToggleFollow });
    fireEvent.press(getByTestId('header-follow'));
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
    // …donde se escribe en la barra de abajo, sobre el video.
    expect(getByPlaceholderText('Escribe algo...')).toBeTruthy();
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

/**
 * El panel es UN cuadro: el club arriba (con etiqueta CLUB) y los jugadores debajo.
 * Todo el mundo abre su perfil. Y el club ya no muestra seguidores: ese dato no
 * viaja en GET /game/:id y no aporta nada en medio de un partido.
 */
describe('GameDetailScreen — club y navegación a perfiles', () => {
  function openPanel(props: Partial<React.ComponentProps<typeof GameDetailScreen>> = {}) {
    const utils = renderScreen(props);
    fireEvent.press(utils.getByTestId('toggle-players'));
    return utils;
  }

  it('el club se nombra UNA sola vez, en el chip sobre el video', () => {
    const { getAllByText } = openPanel();
    expect(getAllByText('CasaPadel')).toHaveLength(1);
  });

  it('ya no muestra los seguidores del club', () => {
    const { queryByText } = openPanel();
    expect(queryByText(/seguidores/i)).toBeNull();
  });

  it('tocar un jugador abre el suyo, con su UID', () => {
    const onOpenPlayer = jest.fn();
    const { getByTestId } = openPanel({ onOpenPlayer });
    fireEvent.press(getByTestId('open-player-@caro'));
    expect(onOpenPlayer).toHaveBeenCalledWith('u-caro');
  });

  it('un jugador sin UID no navega (partidas viejas sin el dato)', () => {
    const onOpenPlayer = jest.fn();
    const sinId = { ...game, players: [{ username: '@viejo', name: 'Viejo', team: 1 }] };
    const { getByTestId } = openPanel({ game: sinId, onOpenPlayer });
    fireEvent.press(getByTestId('open-player-@viejo'));
    expect(onOpenPlayer).not.toHaveBeenCalled();
  });
});

/**
 * Chrome del visor. El rediseño nació de dos problemas concretos: había DOS
 * "EN VIVO" (la barra de arriba y el badge sobre el video) y un botón de tres
 * puntos que no hacía nada.
 */
describe('GameDetailScreen — chrome del live', () => {
  it('el estado EN VIVO se dice UNA sola vez', () => {
    const { getAllByText } = renderScreen();
    expect(getAllByText('EN VIVO')).toHaveLength(1);
  });

  it('una partida que no está en vivo no lo anuncia', () => {
    const { queryByText } = renderScreen({ game: { ...game, isLive: false } });
    expect(queryByText('EN VIVO')).toBeNull();
  });

  it('el club es tocable desde el chip de arriba, sin abrir el panel', () => {
    const onOpenClub = jest.fn();
    const { getByTestId } = renderScreen({ onOpenClub });
    fireEvent.press(getByTestId('header-club'));
    expect(onOpenClub).toHaveBeenCalledWith('club-1');
  });

  it('la barra de abajo es el campo real, no un botón que abre otra cosa', () => {
    const { getByTestId } = renderScreen();
    // Mismo nodo: escribir no navega ni abre paneles.
    expect(getByTestId('compose-bar').props.placeholder).toBe('Escribe algo...');
  });

  it('compartir llama al handler; sin handler no se pinta el botón', () => {
    const onShare = jest.fn();
    const { getByTestId } = renderScreen({ onShare });
    fireEvent.press(getByTestId('share-game'));
    expect(onShare).toHaveBeenCalledTimes(1);

    const { queryByTestId } = renderScreen();
    expect(queryByTestId('share-game')).toBeNull();
  });

  it('salir del partido usa la X (ya no hay barra con flecha)', () => {
    const onBack = jest.fn();
    const { getByTestId } = renderScreen({ onBack });
    fireEvent.press(getByTestId('close-stream'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
