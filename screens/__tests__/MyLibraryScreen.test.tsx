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
}) {
  const onToggleVisibility = opts.onToggleVisibility ?? jest.fn();
  const onOpenItem = opts.onOpenItem ?? jest.fn();
  const utils = render(
    <ThemeProvider initial="light">
      <MyLibraryScreen
        matches={opts.matches ?? []}
        highlights={opts.highlights ?? []}
        onBack={jest.fn()}
        onCreateHighlight={jest.fn()}
        onToggleVisibility={onToggleVisibility}
        onOpenItem={onOpenItem}
      />
    </ThemeProvider>,
  );
  return { ...utils, onToggleVisibility, onOpenItem };
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
