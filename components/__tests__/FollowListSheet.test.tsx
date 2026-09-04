/**
 * Antes era una hoja de abajo con `maxHeight: '70%'`: con una lista larga se
 * sentía cortada a mitad de pantalla. Ahora es pantalla completa — este test
 * fija que el modal use `presentationStyle="fullScreen"` y no un porcentaje.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { FollowListSheet } from '../FollowListSheet';
import type { FollowItem } from '../../data/types';

const users: FollowItem[] = [
  { id: 'u1', name: 'Ana', username: '@ana' },
  { id: 'u2', name: 'Beto', username: '@beto' },
];

function renderSheet(props: Partial<React.ComponentProps<typeof FollowListSheet>> = {}) {
  const onClose = jest.fn();
  const onOpenProfile = jest.fn();
  const utils = render(
    <ThemeProvider initial="light">
      <FollowListSheet
        visible
        title="Seguidores"
        users={users}
        onClose={onClose}
        onOpenProfile={onOpenProfile}
        {...props}
      />
    </ThemeProvider>,
  );
  return { ...utils, onClose, onOpenProfile };
}

describe('FollowListSheet — pantalla completa', () => {
  it('es un modal a pantalla completa, no una hoja parcial', () => {
    const { UNSAFE_root } = renderSheet();
    const modal = UNSAFE_root.findByType(require('react-native').Modal);
    expect(modal.props.presentationStyle).toBe('fullScreen');
    expect(modal.props.transparent).not.toBe(true);
  });

  it('muestra el título en el header', () => {
    const { getByText } = renderSheet({ title: 'Siguiendo' });
    expect(getByText('Siguiendo')).toBeTruthy();
  });

  it('tocar un usuario cierra y abre su perfil', () => {
    const { getByText, onClose, onOpenProfile } = renderSheet();
    fireEvent.press(getByText('Ana'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenProfile).toHaveBeenCalledWith('u1');
  });

  it('el botón de volver cierra sin abrir ningún perfil', () => {
    const { getByTestId, onClose, onOpenProfile } = renderSheet();
    fireEvent.press(getByTestId('follow-list-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenProfile).not.toHaveBeenCalled();
  });

  it('lista vacía muestra "Nadie todavía"', () => {
    const { getByText } = renderSheet({ users: [] });
    expect(getByText('Nadie todavía')).toBeTruthy();
  });
});
