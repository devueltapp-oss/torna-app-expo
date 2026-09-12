/**
 * `FollowListScreen` es una `AppStack.Screen` real (no un `<Modal>`), para
 * heredar el swipe-back nativo de iOS que ya tienen `PlayerProfile`/
 * `ClubProfile` — ver el comentario en el propio componente y en `App.tsx`.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { FollowListScreen } from '../FollowListScreen';
import type { FollowItem } from '../../data/types';

const users: FollowItem[] = [
  { id: 'u1', name: 'Ana', username: '@ana' },
  { id: 'u2', name: 'Beto', username: '@beto' },
];

function renderScreen(props: Partial<React.ComponentProps<typeof FollowListScreen>> = {}) {
  const onBack = jest.fn();
  const onOpenProfile = jest.fn();
  const utils = render(
    <ThemeProvider initial="light">
      <FollowListScreen
        title="Seguidores"
        users={users}
        onBack={onBack}
        onOpenProfile={onOpenProfile}
        {...props}
      />
    </ThemeProvider>,
  );
  return { ...utils, onBack, onOpenProfile };
}

describe('FollowListScreen', () => {
  it('muestra el título en el header', () => {
    const { getByText } = renderScreen({ title: 'Siguiendo' });
    expect(getByText('Siguiendo')).toBeTruthy();
  });

  it('tocar un usuario abre su perfil sin volver atrás', () => {
    const { getByText, onBack, onOpenProfile } = renderScreen();
    fireEvent.press(getByText('Ana'));
    expect(onOpenProfile).toHaveBeenCalledWith('u1');
    expect(onBack).not.toHaveBeenCalled();
  });

  it('el botón de volver llama a onBack', () => {
    const { getByTestId, onBack, onOpenProfile } = renderScreen();
    fireEvent.press(getByTestId('follow-list-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onOpenProfile).not.toHaveBeenCalled();
  });

  it('lista vacía muestra "Nadie todavía"', () => {
    const { getByText } = renderScreen({ users: [] });
    expect(getByText('Nadie todavía')).toBeTruthy();
  });
});
