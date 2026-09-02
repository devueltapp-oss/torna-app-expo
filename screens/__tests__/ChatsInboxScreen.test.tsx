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

describe('ChatsInboxScreen — borrar un chat (solo para mí)', () => {
  it('la papelera del swipe abre la confirmación, sin Alert nativo', () => {
    const { getByTestId, getByText } = renderScreen({ onDeleteChat: jest.fn() });

    fireEvent.press(getByTestId('chat-delete-game-g1'));

    expect(getByText('¿Eliminar este chat?')).toBeTruthy();
    // La pregunta NO nombra al chat: ya elegiste la fila.
    expect(getByTestId('confirm-sheet-title').props.children).not.toMatch(/Cancha 1/);
    // Y aclara el alcance, que es lo que sí importa.
    expect(getByText(/solo para ti/i)).toBeTruthy();
  });

  it('confirmar borra ESE chat (grupal)', () => {
    const onDeleteChat = jest.fn();
    const { getByTestId } = renderScreen({ onDeleteChat });

    fireEvent.press(getByTestId('chat-delete-game-g1'));
    fireEvent.press(getByTestId('confirm-sheet-confirm'));

    expect(onDeleteChat).toHaveBeenCalledTimes(1);
    expect(onDeleteChat.mock.calls[0][0]).toMatchObject({ kind: 'game', id: 'g1' });
  });

  it('también borra un DM, con el otro usuario en el ítem', () => {
    const onDeleteChat = jest.fn();
    const { getByText, getByTestId } = renderScreen({ onDeleteChat });
    fireEvent.press(getByText('Amigos'));

    fireEvent.press(getByTestId('chat-delete-dm-d1'));
    fireEvent.press(getByTestId('confirm-sheet-confirm'));

    expect(onDeleteChat.mock.calls[0][0]).toMatchObject({ kind: 'dm', otherUserId: 'u9' });
  });

  it('cancelar no borra nada y cierra la hoja', () => {
    const onDeleteChat = jest.fn();
    const { getByTestId, queryByText } = renderScreen({ onDeleteChat });

    fireEvent.press(getByTestId('chat-delete-game-g1'));
    fireEvent.press(getByTestId('confirm-sheet-cancel'));

    expect(onDeleteChat).not.toHaveBeenCalled();
    expect(queryByText('¿Eliminar este chat?')).toBeNull();
  });

  it('sin handler de borrado no hay papelera que deslizar', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('chat-delete-game-g1')).toBeNull();
  });
});
