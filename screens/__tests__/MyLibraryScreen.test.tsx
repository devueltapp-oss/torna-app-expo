/**
 * Cierra el lazo UI → handler en la biblioteca privada:
 *   - visibilidad: UN switch (no chip + botón separados) flippea isPublic y
 *     dispara `onToggleVisibility` con el item.
 *   - reproducir: tocar la MINIATURA abre el reproductor (`onOpenItem`); no hay
 *     un botón "Reproducir" aparte — era la misma acción dos veces.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { MyLibraryScreen } from '../MyLibraryScreen';
import type { LibraryHighlight, LibraryMatch } from '../../data/types';
import type { IncomingVideoShare } from '../../api/games';

const privateHl: LibraryHighlight = {
  id: 'h1',
  kind: 'highlight',
  title: 'Smash final',
  isPublic: false,
  durationSeconds: 30,
  durationLabel: '0:30',
};

const publicHl: LibraryHighlight = { ...privateHl, id: 'h2', isPublic: true };

const match: LibraryMatch = {
  id: 'm1',
  kind: 'match',
  title: 'Cancha 2 · Club Casapadel',
  isPublic: false,
  durationSeconds: 3600,
  durationLabel: '1:00:00',
  cameras: 1,
  highlightsCount: 0,
  recordingUrl: 'https://x/y.m3u8',
  resultRegistered: false,
};

function renderLibrary(opts: {
  matches?: LibraryMatch[];
  highlights?: LibraryHighlight[];
  onToggleVisibility?: jest.Mock;
  onOpenItem?: jest.Mock;
  onShareVideo?: jest.Mock;
  pendingShares?: IncomingVideoShare[];
  onAcceptShare?: jest.Mock;
  onRejectShare?: jest.Mock;
}) {
  const onToggleVisibility = opts.onToggleVisibility ?? jest.fn();
  const onOpenItem = opts.onOpenItem ?? jest.fn();
  const onShareVideo = opts.onShareVideo ?? jest.fn();
  const onAcceptShare = opts.onAcceptShare ?? jest.fn();
  const onRejectShare = opts.onRejectShare ?? jest.fn();
  const utils = render(
    <ThemeProvider initial="light">
      <MyLibraryScreen
        matches={opts.matches ?? []}
        highlights={opts.highlights ?? []}
        onBack={jest.fn()}
        onCreateHighlight={jest.fn()}
        onToggleVisibility={onToggleVisibility}
        onOpenItem={onOpenItem}
        onShareVideo={onShareVideo}
        pendingShares={opts.pendingShares ?? []}
        onAcceptShare={onAcceptShare}
        onRejectShare={onRejectShare}
      />
    </ThemeProvider>,
  );
  return { ...utils, onToggleVisibility, onOpenItem, onShareVideo, onAcceptShare, onRejectShare };
}

describe('MyLibraryScreen — visibilidad (switch)', () => {
  it('no hay botones "Hacer público"/"Hacer privado": es un switch', () => {
    const { queryByText } = renderLibrary({ highlights: [privateHl, publicHl] });
    expect(queryByText('Hacer público')).toBeNull();
    expect(queryByText('Hacer privado')).toBeNull();
  });

  it('un highlight privado muestra el switch apagado y la etiqueta "Privado"; tocarlo llama onToggleVisibility', () => {
    const { getByTestId, getByText, onToggleVisibility } = renderLibrary({ highlights: [privateHl] });

    const sw = getByTestId('visibility-switch-h1');
    expect(sw.props.accessibilityState.checked).toBe(false);
    expect(getByText('Privado')).toBeTruthy();

    fireEvent.press(sw);

    expect(onToggleVisibility).toHaveBeenCalledTimes(1);
    expect(onToggleVisibility).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'h1', kind: 'highlight' }),
    );
  });

  it('un highlight público muestra el switch prendido y la etiqueta "Público"', () => {
    const { getByTestId, getByText } = renderLibrary({ highlights: [publicHl] });
    expect(getByTestId('visibility-switch-h2').props.accessibilityState.checked).toBe(true);
    expect(getByText('Público')).toBeTruthy();
  });

  it('un partido también usa el switch (toggle local, sin endpoint)', () => {
    const { getByTestId, onToggleVisibility } = renderLibrary({ matches: [match] });
    fireEvent.press(getByTestId('visibility-switch-m1'));
    expect(onToggleVisibility).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
  });
});

describe('MyLibraryScreen — reproducir desde la miniatura', () => {
  it('no hay botón "Reproducir": tocar la miniatura del partido abre el reproductor', () => {
    const { queryByText, getByTestId, onOpenItem } = renderLibrary({ matches: [match] });
    expect(queryByText('Reproducir')).toBeNull();

    fireEvent.press(getByTestId('library-thumb-match'));
    expect(onOpenItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
  });

  it('tocar la miniatura de un highlight abre el reproductor', () => {
    const { getByTestId, onOpenItem } = renderLibrary({ highlights: [publicHl] });
    fireEvent.press(getByTestId('library-thumb-highlight'));
    expect(onOpenItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'h2' }));
  });
});

describe('MyLibraryScreen — compartir el video de un partido', () => {
  it('un partido con canShare muestra "Compartir" y llama onShareVideo con ese match', () => {
    const shareable: LibraryMatch = { ...match, canShare: true };
    const { getByTestId, onShareVideo } = renderLibrary({ matches: [shareable] });

    fireEvent.press(getByTestId('share-video-m1'));

    expect(onShareVideo).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
  });

  it('un partido sin canShare NO muestra el botón "Compartir"', () => {
    const { queryByTestId, queryByText } = renderLibrary({ matches: [match] });
    expect(queryByTestId('share-video-m1')).toBeNull();
    expect(queryByText('Compartir')).toBeNull();
  });

  it('un video que me compartieron muestra quién lo compartió y no ofrece re-compartirlo', () => {
    const shared: LibraryMatch = {
      ...match, id: 'm2', canShare: false,
      sharedBy: { username: 'ortiz', name: 'Jesús Ortiz' },
    };
    const { getByText, queryByTestId } = renderLibrary({ matches: [shared] });

    expect(getByText('Compartido por Jesús Ortiz')).toBeTruthy();
    expect(queryByTestId('share-video-m2')).toBeNull();
  });
});

describe('MyLibraryScreen — solicitudes de video pendientes', () => {
  const pending: IncomingVideoShare = {
    id: 'share-1',
    createdAt: '2026-09-15T00:00:00Z',
    fromUser: { id: 'u1', username: 'ortiz', name: 'Jesús Ortiz' },
    game: { id: 'g1', createdAt: '2026-09-10T00:00:00Z' },
  };

  it('muestra la solicitud pendiente con nombre de quien comparte', () => {
    const { getByText } = renderLibrary({ pendingShares: [pending] });
    expect(getByText('Jesús Ortiz')).toBeTruthy();
    expect(getByText('Te compartió el video de un partido')).toBeTruthy();
  });

  it('aceptar llama onAcceptShare con el id de la solicitud', () => {
    const { getByTestId, onAcceptShare } = renderLibrary({ pendingShares: [pending] });
    fireEvent.press(getByTestId('accept-share-share-1'));
    expect(onAcceptShare).toHaveBeenCalledWith('share-1');
  });

  it('rechazar llama onRejectShare con el id de la solicitud', () => {
    const { getByTestId, onRejectShare } = renderLibrary({ pendingShares: [pending] });
    fireEvent.press(getByTestId('reject-share-share-1'));
    expect(onRejectShare).toHaveBeenCalledWith('share-1');
  });

  it('sin solicitudes pendientes no se muestra la sección', () => {
    const { queryByText } = renderLibrary({});
    expect(queryByText('VIDEOS COMPARTIDOS CONTIGO')).toBeNull();
  });
});
