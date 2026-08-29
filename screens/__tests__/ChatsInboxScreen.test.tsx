/**
 * El inbox está partido en dos bandejas: **Partidas** (chats grupales) y **Amigos**
 * (DMs 1-a-1). Lo que se prueba es exactamente eso: que cada botón muestre SOLO su tipo
 * de chat, que el tap siga abriendo el hilo correcto, y que el estado vacío sea el de la
 * bandeja elegida (no el genérico).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { ChatsInboxScreen } from '../ChatsInboxScreen';
import type { InboxItem } from '../../api/chat';

const items: InboxItem[] = [
  {
    kind: 'game', id: 'g1', otherUserId: null, title: 'Cancha 1 · 19:30', avatar: null,
    lastMessage: '¿Llevás pelotas?', lastMessageAt: new Date().toISOString(),
    unreadCount: 0, readOnly: false,
  },
  {
    kind: 'dm', id: 'd1', otherUserId: 'u9', title: 'Ana', avatar: null,
    lastMessage: 'dale', lastMessageAt: new Date().toISOString(),
    unreadCount: 2, readOnly: false,
  },
];

function renderScreen(props: Partial<React.ComponentProps<typeof ChatsInboxScreen>> = {}) {
  return render(
    <ThemeProvider initial="light">
      <ChatsInboxScreen
        items={items}
        loading={false}
        refreshing={false}
        onRefresh={jest.fn()}
        onOpenDm={jest.fn()}
        onOpenGame={jest.fn()}
        onNewChat={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('ChatsInboxScreen — bandejas Partidas / Amigos', () => {
  it('arranca en Partidas: muestra el chat de la partida y oculta los DMs', () => {
    const { getByText, queryByText } = renderScreen();
    expect(getByText('Cancha 1 · 19:30')).toBeTruthy();
    expect(queryByText('Ana')).toBeNull();
  });

  it('tocar "Amigos" muestra solo los DMs', () => {
    const { getByText, queryByText } = renderScreen();
    fireEvent.press(getByText('Amigos'));
    expect(getByText('Ana')).toBeTruthy();
    expect(queryByText('Cancha 1 · 19:30')).toBeNull();
  });

  it('cada bandeja abre su hilo: game → onOpenGame, dm → onOpenDm', () => {
    const onOpenGame = jest.fn();
    const onOpenDm = jest.fn();
    const { getByText } = renderScreen({ onOpenGame, onOpenDm });

    fireEvent.press(getByText('Cancha 1 · 19:30'));
    expect(onOpenGame).toHaveBeenCalledWith('g1', 'Cancha 1 · 19:30', false);

    fireEvent.press(getByText('Amigos'));
    fireEvent.press(getByText('Ana'));
    expect(onOpenDm).toHaveBeenCalledWith('u9', 'Ana');
  });

  it('el estado vacío es el de la bandeja elegida', () => {
    const { getByText } = renderScreen({ items: [] });
    expect(getByText('Sin chats de partidas')).toBeTruthy();
    fireEvent.press(getByText('Amigos'));
    expect(getByText('Sin chats con amigos')).toBeTruthy();
  });
});
