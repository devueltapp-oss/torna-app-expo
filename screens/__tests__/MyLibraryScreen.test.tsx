/**
 * Cierra el lazo UI → handler: en la biblioteca privada, un highlight privado
 * muestra el botón "Hacer público" y tocarlo dispara `onToggleVisibility` con ese
 * item (que en App.tsx persiste el cambio y lo refleja en el perfil).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { MyLibraryScreen } from '../MyLibraryScreen';
import type { LibraryHighlight } from '../../data/types';

const privateHl: LibraryHighlight = {
  id: 'h1',
  kind: 'highlight',
  title: 'Smash final',
  isPublic: false,
  durationSeconds: 30,
  durationLabel: '0:30',
};

const publicHl: LibraryHighlight = { ...privateHl, id: 'h2', isPublic: true };

function renderLibrary(highlights: LibraryHighlight[], onToggleVisibility = jest.fn()) {
  const utils = render(
    <ThemeProvider initial="light">
      <MyLibraryScreen
        matches={[]}
        highlights={highlights}
        onBack={jest.fn()}
        onCreateHighlight={jest.fn()}
        onToggleVisibility={onToggleVisibility}
      />
    </ThemeProvider>,
  );
  return { ...utils, onToggleVisibility };
}

describe('MyLibraryScreen — botón de publicar', () => {
  it('un highlight privado ofrece "Hacer público" y al tocarlo llama onToggleVisibility con el item', () => {
    const { getByText, queryByText, onToggleVisibility } = renderLibrary([privateHl]);

    expect(queryByText('Hacer público')).toBeTruthy();
    expect(queryByText('Hacer privado')).toBeNull();

    fireEvent.press(getByText('Hacer público'));

    expect(onToggleVisibility).toHaveBeenCalledTimes(1);
    expect(onToggleVisibility).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'h1', kind: 'highlight' }),
    );
  });

  it('un highlight público ofrece "Hacer privado"', () => {
    const { queryByText } = renderLibrary([publicHl]);
    expect(queryByText('Hacer privado')).toBeTruthy();
    expect(queryByText('Hacer público')).toBeNull();
  });
});
