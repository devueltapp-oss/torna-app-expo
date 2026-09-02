/**
 * Cierra el lazo UI de "Clubs que sigues" en la reserva: la pantalla SIEMPRE
 * muestra uno de tres estados (spinner / lista / mensaje "no encontrados"), nunca
 * queda en blanco. Tocar un club dispara `onPickClub` (arranca la reserva).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { ReserveClubPickerScreen } from '../ReserveClubPickerScreen';
import type { FollowItem } from '../../data/types';

const clubs: FollowItem[] = [
  { id: 'c1', name: 'Padel BA', username: '@padelba', isClub: true },
  { id: 'c2', name: 'Padel Sur', username: '@padelsur', isClub: true },
];

function renderScreen(
  props: Partial<React.ComponentProps<typeof ReserveClubPickerScreen>> = {},
) {
  return render(
    <ThemeProvider initial="light">
      <ReserveClubPickerScreen
        suggestedClubs={[]}
        loadingSuggested={false}
        onBack={jest.fn()}
        onPickClub={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('ReserveClubPickerScreen — "Clubs que sigues"', () => {
  it('muestra los clubs seguidos; tocar uno llama onPickClub con su id', () => {
    const onPickClub = jest.fn();
    const { getByText } = renderScreen({ suggestedClubs: clubs, onPickClub });

    expect(getByText('Padel BA')).toBeTruthy();
    expect(getByText('Padel Sur')).toBeTruthy();

    fireEvent.press(getByText('Padel BA'));
    expect(onPickClub).toHaveBeenCalledWith('c1');
  });

  it('sin clubs y NO cargando → muestra el mensaje "no encontrados" (no queda en blanco)', () => {
    const { getByText } = renderScreen({ suggestedClubs: [], loadingSuggested: false });
    expect(getByText(/no sigues ningún club/i)).toBeTruthy();
  });

  it('mientras carga NO muestra ni el mensaje ni la lista (solo el spinner)', () => {
    const { queryByText } = renderScreen({ suggestedClubs: [], loadingSuggested: true });
    expect(queryByText(/no sigues ningún club/i)).toBeNull();
    expect(queryByText('Padel BA')).toBeNull();
  });
});
