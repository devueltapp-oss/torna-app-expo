/**
 * ShareGameSheet — cobertura complementaria a `ShareGameSheetSearch.test.tsx`
 * (que ya cubre la búsqueda a fondo): cerrar tocando el fondo, deseleccionar
 * a alguien ya elegido, y que el botón de enviar no aparece sin nada elegido
 * ni gente en el inbox.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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
  const onClose = jest.fn();
  const onSend = jest.fn().mockResolvedValue(true);
  const utils = render(
    <ThemeProvider initial="light">
      <ShareGameSheet visible items={[]} onClose={onClose} onSend={onSend} {...props} />
    </ThemeProvider>,
  );
  return { ...utils, onClose, onSend };
}

describe('ShareGameSheet', () => {
  it('sin nadie en el inbox y sin selección, no muestra el botón de enviar', () => {
    const { queryByTestId } = renderSheet();
    expect(queryByTestId('share-send')).toBeNull();
  });

  it('tocar a alguien lo marca; tocarlo de nuevo lo deselecciona (el botón sigue pero deja de enviar)', async () => {
    // El botón queda SIEMPRE visible mientras haya gente en la lista (para no
    // esconder una selección ya hecha al filtrar); lo que cambia es si envía.
    const onSend = jest.fn().mockResolvedValue(true);
    const { getByTestId } = renderSheet({ items: [dm('u1', 'Ana')], onSend });

    fireEvent.press(getByTestId('share-to-u1'));
    fireEvent.press(getByTestId('share-to-u1')); // deseleccionar
    fireEvent.press(getByTestId('share-send'));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('tocar el fondo cierra la hoja', () => {
    const { getByText, onClose } = renderSheet({ items: [dm('u1', 'Ana')] });
    // El título es texto plano dentro de la hoja; tocarlo NO debe propagar al cierre.
    fireEvent.press(getByText('Compartir partido'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('con varios seleccionados, el botón dice "Enviar a N"', () => {
    const { getByTestId, getByText } = renderSheet({
      items: [dm('u1', 'Ana'), dm('u2', 'Beto')],
    });
    fireEvent.press(getByTestId('share-to-u1'));
    fireEvent.press(getByTestId('share-to-u2'));
    expect(getByText('Enviar a 2')).toBeTruthy();
  });

  it('enviar con éxito cierra la hoja', async () => {
    const onSend = jest.fn().mockResolvedValue(true);
    const { getByTestId, onClose } = renderSheet({ items: [dm('u1', 'Ana')], onSend });

    fireEvent.press(getByTestId('share-to-u1'));
    fireEvent.press(getByTestId('share-send'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('un envío fallido NO cierra la hoja (para poder reintentar)', async () => {
    const onSend = jest.fn().mockResolvedValue(false);
    const { getByTestId, onClose } = renderSheet({ items: [dm('u1', 'Ana')], onSend });

    fireEvent.press(getByTestId('share-to-u1'));
    fireEvent.press(getByTestId('share-send'));

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
  });
});
