/**
 * El corazón de un mensaje **no se dibuja hasta que hay algo que mostrar**.
 *
 * Antes había uno vacío bajo cada burbuja: en un hilo de treinta mensajes eran
 * treinta corazones grises compitiendo con el texto. El me gusta pasó a darse
 * con doble toque sobre el mensaje (`useDoubleTap`), así que el botón solo
 * aparece cuando ya hay likes — y ahí sí sirve, de contador y para sacar el
 * propio.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { MessageLikeButton } from '../ui';

function renderButton(props: Partial<React.ComponentProps<typeof MessageLikeButton>> = {}) {
  return render(
    <ThemeProvider initial="light">
      <MessageLikeButton count={0} liked={false} onPress={jest.fn()} {...props} />
    </ThemeProvider>,
  );
}

describe('MessageLikeButton', () => {
  it('sin likes no dibuja nada', () => {
    const { toJSON } = renderButton({ count: 0, liked: false });
    expect(toJSON()).toBeNull();
  });

  it('con likes de otros aparece con el número', () => {
    const { getByText } = renderButton({ count: 3, liked: false });
    expect(getByText('3')).toBeTruthy();
  });

  /**
   * El caso del que acaba de likear: el contador todavía puede leerse 0 en un
   * render optimista intermedio, pero si `liked` es true el corazón tiene que
   * seguir en pantalla — si no, quitar el propio like sería imposible.
   */
  it('si YO lo likeé sigue visible aunque el contador venga en 0', () => {
    const onPress = jest.fn();
    const { getByLabelText } = renderButton({ count: 0, liked: true, onPress });
    fireEvent.press(getByLabelText('Quitar me gusta'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
