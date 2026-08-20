/**
 * Recuperación de contraseña. Lo que este test protege:
 *   1. El botón manda el mail vía Firebase (`sendPasswordReset` del AuthContext).
 *   2. **No se filtra qué emails existen**: si Firebase responde `user-not-found`
 *      la pantalla muestra exactamente la misma confirmación que en el caso feliz.
 *   3. Un email mal escrito no llega a pegarle a Firebase.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { ForgotPasswordScreen } from '../ForgotPasswordScreen';

const mockSendPasswordReset = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ sendPasswordReset: mockSendPasswordReset }),
}));

function renderScreen(prefillEmail?: string) {
  return render(
    <ThemeProvider initial="light">
      <ForgotPasswordScreen prefillEmail={prefillEmail} onBack={jest.fn()} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockSendPasswordReset.mockReset();
  mockSendPasswordReset.mockResolvedValue(undefined);
});

describe('ForgotPasswordScreen', () => {
  it('envía el mail con el email tipeado y confirma', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('tu@email.com'), '  jugador@torna.io ');
    fireEvent.press(getByText('Enviarme el enlace'));

    await waitFor(() => expect(mockSendPasswordReset).toHaveBeenCalledWith('jugador@torna.io'));
    await waitFor(() => expect(getByText('Revisá tu correo')).toBeTruthy());
  });

  it('usa el email que venía del login sin obligar a reescribirlo', async () => {
    const { getByText } = renderScreen('club@torna.io');

    fireEvent.press(getByText('Enviarme el enlace'));

    await waitFor(() => expect(mockSendPasswordReset).toHaveBeenCalledWith('club@torna.io'));
  });

  it('con user-not-found muestra la MISMA confirmación (no delata si la cuenta existe)', async () => {
    mockSendPasswordReset.mockRejectedValue({ code: 'auth/user-not-found' });
    const { getByText, getByPlaceholderText, queryByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('tu@email.com'), 'noexiste@torna.io');
    fireEvent.press(getByText('Enviarme el enlace'));

    await waitFor(() => expect(getByText('Revisá tu correo')).toBeTruthy());
    expect(queryByText(/no encontramos/i)).toBeNull();
  });

  it('un error real sí se muestra, sin confirmar el envío', async () => {
    mockSendPasswordReset.mockRejectedValue({ code: 'auth/too-many-requests' });
    const { getByText, getByPlaceholderText, queryByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('tu@email.com'), 'jugador@torna.io');
    fireEvent.press(getByText('Enviarme el enlace'));

    await waitFor(() => expect(getByText(/Demasiados intentos/)).toBeTruthy());
    expect(queryByText('Revisá tu correo')).toBeNull();
  });

  it('email inválido: ni siquiera llama a Firebase', () => {
    const { getByText, getByPlaceholderText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('tu@email.com'), 'jugador@');
    fireEvent.press(getByText('Enviarme el enlace'));

    expect(mockSendPasswordReset).not.toHaveBeenCalled();
    expect(getByText('Escribí un email válido.')).toBeTruthy();
  });
});
