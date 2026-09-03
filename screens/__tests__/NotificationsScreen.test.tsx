/**
 * La pantalla de la campanita: lista de notificaciones con no leídos, tap que abre el
 * destino y "marcar todas como leídas". Es presentacional pura, así que se prueba
 * pasándole props (no toca `api/*` ni navegación).
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { NotificationsScreen } from '../NotificationsScreen';
import type { AppNotification } from '../../api/notifications';

const notif = (id: string, over: Partial<AppNotification> = {}): AppNotification => ({
  id,
  type: 'GAME_SCHEDULED',
  title: 'Mati agendó una partida',
  body: 'sáb 30/08 19:30 · Cancha 2',
  gameId: 'g1',
  entityId: null,
  data: { type: 'GAME_SCHEDULED', gameId: 'g1' },
  readAt: null,
  createdAt: new Date().toISOString(),
  actor: null,
  ...over,
});

function renderScreen(props: Partial<React.ComponentProps<typeof NotificationsScreen>> = {}) {
  return render(
    <ThemeProvider initial="light">
      <NotificationsScreen
        items={[notif('n1'), notif('n2', { title: 'Se está transmitiendo', type: 'STREAMING_STARTED' })]}
        loading={false}
        unreadCount={2}
        onRefresh={jest.fn()}
        onPress={jest.fn()}
        onMarkAllRead={jest.fn()}
        onBack={jest.fn()}
        {...props}
      />
    </ThemeProvider>,
  );
}

describe('NotificationsScreen', () => {
  it('lista título y cuerpo de cada notificación', () => {
    const { getByText, getAllByText } = renderScreen();
    expect(getByText('Mati agendó una partida')).toBeTruthy();
    expect(getByText('Se está transmitiendo')).toBeTruthy();
    expect(getAllByText('sáb 30/08 19:30 · Cancha 2')).toHaveLength(2);
  });

  it('tocar una fila avisa con ESA notificación', () => {
    const onPress = jest.fn();
    const { getByText } = renderScreen({ onPress });

    fireEvent.press(getByText('Se está transmitiendo'));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress.mock.calls[0][0]).toMatchObject({ id: 'n2', type: 'STREAMING_STARTED' });
  });

  it('el botón de "marcar todas" solo aparece si hay no leídas', () => {
    const onMarkAllRead = jest.fn();
    const { getByLabelText, queryByLabelText, rerender } = renderScreen({ onMarkAllRead });

    fireEvent.press(getByLabelText('Marcar todas como leídas'));
    expect(onMarkAllRead).toHaveBeenCalledTimes(1);

    rerender(
      <ThemeProvider initial="light">
        <NotificationsScreen
          items={[notif('n1', { readAt: new Date().toISOString() })]}
          loading={false}
          unreadCount={0}
          onRefresh={jest.fn()}
          onPress={jest.fn()}
          onMarkAllRead={onMarkAllRead}
          onBack={jest.fn()}
        />
      </ThemeProvider>,
    );
    expect(queryByLabelText('Marcar todas como leídas')).toBeNull();
  });

  it('sin notificaciones muestra el estado vacío; mientras carga, no', () => {
    const { getByText, queryByText, rerender } = renderScreen({ items: [], unreadCount: 0 });
    expect(getByText('No tienes notificaciones')).toBeTruthy();

    rerender(
      <ThemeProvider initial="light">
        <NotificationsScreen
          items={[]}
          loading
          unreadCount={0}
          onRefresh={jest.fn()}
          onPress={jest.fn()}
          onMarkAllRead={jest.fn()}
          onBack={jest.fn()}
        />
      </ThemeProvider>,
    );
    expect(queryByText('No tienes notificaciones')).toBeNull();
  });

  /**
   * ⛔ Ya no hay flecha propia: se vuelve con el botón atrás del sistema. El
   * test que probaba `onBack` se eliminó con ella.
   */
  it('no dibuja una flecha de volver propia', () => {
    const { queryByLabelText } = renderScreen();
    expect(queryByLabelText('Volver')).toBeNull();
  });

  /**
   * Limpiar el historial **borra de verdad**, así que se confirma antes: no hay
   * deshacer del lado del usuario.
   */
  it('limpiar el historial pide confirmación y recién ahí borra', () => {
    const onClearAll = jest.fn();
    const spy = jest.spyOn(Alert, 'alert');
    const { getByTestId } = renderScreen({ onClearAll });

    fireEvent.press(getByTestId('clear-notifications'));

    // Todavía no borró: primero pregunta.
    expect(onClearAll).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();

    // El botón destructivo de la confirmación es el que dispara el borrado.
    const botones = spy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    botones.find((b) => b.text === 'Limpiar')?.onPress?.();
    expect(onClearAll).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  /** Sin nada en la lista no hay nada que limpiar. */
  it('sin notificaciones no ofrece limpiar', () => {
    const { queryByTestId } = renderScreen({ items: [], onClearAll: jest.fn() });
    expect(queryByTestId('clear-notifications')).toBeNull();
  });
});
