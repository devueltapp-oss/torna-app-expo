/**
 * Búsqueda en `ShareGameSheet` — lo que hace usable "Invitar a jugar".
 *
 * La hoja listaba **solo el inbox**, o sea gente con la que YA chateaste. Para
 * compartir un partido en vivo alcanza, pero para invitar a una partida recién
 * creada no: a quien invitás es justamente a quien todavía no le escribiste. Un
 * usuario nuevo veía una lista vacía y no podía invitar a nadie.
 */
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { ShareGameSheet } from '../ShareGameSheet';
import type { InboxItem } from '../../api/chat';

const dm = (id: string, title: string): InboxItem => ({
  kind: 'dm',
  id: `c-${id}`,
  otherUserId: id,
  title,
  avatar: null,
  lastMessage: '',
  lastMessageAt: null,
  unreadCount: 0,
  readOnly: false,
} as InboxItem);

function renderSheet(props: Partial<React.ComponentProps<typeof ShareGameSheet>> = {}) {
  return render(
    <ThemeProvider initial="light">
      <ShareGameSheet
        visible
        items={[]}
        onClose={jest.fn()}
        onSend={jest.fn().mockResolvedValue(true)}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('ShareGameSheet — sin búsqueda (comportamiento previo intacto)', () => {
  it('sin `onSearch` no muestra el campo y mantiene el estado vacío de siempre', () => {
    const { queryByTestId, getByText } = renderSheet();

    expect(queryByTestId('share-search')).toBeNull();
    expect(getByText(/Todavía no tenés chats con nadie/)).toBeTruthy();
  });

  it('lista a la gente del inbox', () => {
    const { getByText } = renderSheet({ items: [dm('u1', 'Ana')] });
    expect(getByText('Ana')).toBeTruthy();
  });
});

describe('ShareGameSheet — con búsqueda', () => {
  it('invita a alguien que NO está en el inbox', async () => {
    const onSearch = jest.fn().mockResolvedValue([{ id: 'u9', name: 'Carla' }]);
    const onSend = jest.fn().mockResolvedValue(true);
    const { getByTestId, findByText } = renderSheet({ items: [], onSearch, onSend });

    fireEvent.changeText(getByTestId('share-search'), 'car');
    // El debounce evita una consulta por tecla.
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });

    expect(onSearch).toHaveBeenCalledWith('car');
    fireEvent.press(await findByText('Carla'));
    fireEvent.press(getByTestId('share-send'));

    await waitFor(() => expect(onSend).toHaveBeenCalledWith(['u9']));
  });

  it('no consulta con menos de 2 caracteres', async () => {
    const onSearch = jest.fn().mockResolvedValue([]);
    const { getByTestId } = renderSheet({ onSearch });

    fireEvent.changeText(getByTestId('share-search'), 'a');
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });

    expect(onSearch).not.toHaveBeenCalled();
  });

  /**
   * `selected` guarda ids, no posiciones: se puede elegir a alguien del inbox,
   * buscar a otro y mandarle a los dos. Si el botón dependiera de la lista
   * visible, escribir una búsqueda escondería la selección ya hecha.
   */
  it('conserva lo seleccionado al escribir una búsqueda', async () => {
    const onSearch = jest.fn().mockResolvedValue([]);
    const onSend = jest.fn().mockResolvedValue(true);
    const { getByText, getByTestId } = renderSheet({
      items: [dm('u1', 'Ana')], onSearch, onSend,
    });

    fireEvent.press(getByText('Ana'));
    fireEvent.changeText(getByTestId('share-search'), 'zzz');
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });

    // Sin resultados, pero el botón sigue ahí con Ana elegida.
    fireEvent.press(getByTestId('share-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalledWith(['u1']));
  });

  it('usa el copy y la etiqueta que le pasan', () => {
    const { getByText } = renderSheet({
      onSearch: jest.fn().mockResolvedValue([]),
      title: 'Invitar a jugar',
      sendLabel: 'Invitar',
    });

    expect(getByText('Invitar a jugar')).toBeTruthy();
  });
});
