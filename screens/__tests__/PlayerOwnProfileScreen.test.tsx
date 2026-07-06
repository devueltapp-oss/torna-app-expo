/**
 * Aserción CENTRAL del /loop: "que se visualice en mi perfil".
 *
 * El perfil propio muestra en el grid SOLO highlights públicos. Un highlight
 * privado NO aparece; al volverlo público, SÍ aparece. Renderizamos la pantalla
 * real y verificamos ambos estados.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { PlayerOwnProfileScreen } from '../PlayerOwnProfileScreen';
import type { ProfileOwner, LibraryHighlight } from '../../data/types';

const owner: ProfileOwner = {
  name: 'Ana Player',
  username: '@ana',
  club: 'Club Central',
  location: 'BsAs',
  followers: 10,
  following: 5,
};

// durationLabel es único por clip y ContentThumb lo renderiza como texto →
// nos sirve para afirmar qué clips están (o no) en el grid.
const PRIV_LABEL = '0:11';
const PUB_LABEL = '0:42';

function makeHl(id: string, isPublic: boolean, durationLabel: string): LibraryHighlight {
  return { id, kind: 'highlight', title: id, isPublic, durationSeconds: 20, durationLabel };
}

function renderProfile(highlights: LibraryHighlight[]) {
  return render(
    <ThemeProvider initial="light">
      <PlayerOwnProfileScreen
        owner={owner}
        matches={[]}
        highlights={highlights}
        onOpenLibrary={jest.fn()}
        onOpenSettings={jest.fn()}
        activeTab="profile"
        onChangeTab={jest.fn()}
      />
    </ThemeProvider>,
  );
}

describe('PlayerOwnProfileScreen — solo públicos en el perfil', () => {
  it('un highlight privado NO se ve; el público SÍ', () => {
    const { queryByText } = renderProfile([
      makeHl('priv', false, PRIV_LABEL),
      makeHl('pub', true, PUB_LABEL),
    ]);

    expect(queryByText(PUB_LABEL)).toBeTruthy(); // público visible en el grid
    expect(queryByText(PRIV_LABEL)).toBeNull(); // privado oculto
  });

  it('al volver el privado público, aparece en el perfil', () => {
    // Estado ya-público (simula el resultado del toggle): ambos visibles.
    const { queryByText } = renderProfile([
      makeHl('priv', true, PRIV_LABEL),
      makeHl('pub', true, PUB_LABEL),
    ]);

    expect(queryByText(PRIV_LABEL)).toBeTruthy();
    expect(queryByText(PUB_LABEL)).toBeTruthy();
  });
});
