/**
 * Login por email/contraseña — el caso que rompía con cuentas creadas a mano
 * desde la consola de Firebase.
 *
 * El backend responde **200** con `{ exists:false, firebaseUser, tokens }`
 * cuando las credenciales son válidas en Firebase pero el usuario no tiene fila
 * en la DB de Torna. Antes la app destructuraba `user` directo y reventaba con
 * "cannot read property 'id' of undefined", que se mostraba como error genérico
 * y dejaba al usuario sin salida. Ahora se rutea a completar el perfil, igual
 * que en el login social.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../theme';
import { LoginWithRoleScreen } from '../LoginWithRoleScreen';

const mockLoginWithEmailPassword = jest.fn();
const mockLoginWithGoogle = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    loginWithEmailPassword: mockLoginWithEmailPassword,
    loginWithGoogle: mockLoginWithGoogle,
    loginWithApple: jest.fn(),
    isLoading: false,
  }),
}));

function renderScreen(props: Record<string, unknown> = {}) {
  return render(
    <ThemeProvider initial="light">
      <LoginWithRoleScreen {...props} />
    </ThemeProvider>,
  );
}

function fillCredentials(getByPlaceholderText: any) {
  fireEvent.changeText(getByPlaceholderText('tu@email.com'), 'raulsncz@gmail.com');
  fireEvent.changeText(getByPlaceholderText('••••••••'), '12345678');
}

beforeEach(() => {
  mockLoginWithEmailPassword.mockReset();
  mockLoginWithGoogle.mockReset();
});

describe('LoginWithRoleScreen — login por email', () => {
  it('usuario válido en Firebase pero sin cuenta en Torna → va a completar perfil', async () => {
    mockLoginWithEmailPassword.mockResolvedValue({
      status: 'needs_registration',
      idToken: 'id-token-firebase',
      email: 'raulsncz@gmail.com',
    });
    const onNeedsRegistration = jest.fn();
    const onLogin = jest.fn();
    const { getByText, getByPlaceholderText } = renderScreen({ onNeedsRegistration, onLogin });

    fillCredentials(getByPlaceholderText);
    fireEvent.press(getByText('Ingresar como Player'));

    await waitFor(() => expect(onNeedsRegistration).toHaveBeenCalledTimes(1));
    const [result, provider] = onNeedsRegistration.mock.calls[0];
    expect(result.idToken).toBe('id-token-firebase');
    expect(provider).toBe('email');
    // No debe tratarlo como sesión iniciada ni mostrar error.
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('usuario existente → onLogin con el rol elegido', async () => {
    mockLoginWithEmailPassword.mockResolvedValue({
      status: 'authenticated',
      user: { id: 'u1', email: 'a@b.com', username: 'raul', isClub: false },
    });
    const onLogin = jest.fn();
    const onNeedsRegistration = jest.fn();
    const { getByText, getByPlaceholderText } = renderScreen({ onLogin, onNeedsRegistration });

    fillCredentials(getByPlaceholderText);
    fireEvent.press(getByText('Ingresar como Player'));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('player'));
    expect(onNeedsRegistration).not.toHaveBeenCalled();
  });

  it('credenciales incorrectas → error legible, sin navegar', async () => {
    mockLoginWithEmailPassword.mockRejectedValue(new Error('auth/invalid-credential'));
    const onNeedsRegistration = jest.fn();
    const { getByText, getByPlaceholderText } = renderScreen({ onNeedsRegistration });

    fillCredentials(getByPlaceholderText);
    fireEvent.press(getByText('Ingresar como Player'));

    await waitFor(() => expect(getByText('Email o contraseña incorrectos.')).toBeTruthy());
    expect(onNeedsRegistration).not.toHaveBeenCalled();
  });

  it('sin completar los campos no llama a la API', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Ingresar como Player'));

    expect(mockLoginWithEmailPassword).not.toHaveBeenCalled();
    expect(getByText('Completá el email y la contraseña.')).toBeTruthy();
  });

  it('el botón de recuperar contraseña pasa el email ya tipeado', () => {
    const onForgot = jest.fn();
    const { getByText, getByPlaceholderText } = renderScreen({ onForgot });

    fireEvent.changeText(getByPlaceholderText('tu@email.com'), 'raulsncz@gmail.com');
    fireEvent.press(getByText('Olvidé mi contraseña'));

    expect(onForgot).toHaveBeenCalledWith('raulsncz@gmail.com');
  });
});

/**
 * Login con Google — bug real: `GoogleSignin.signIn()` (v15) devuelve
 * `{ type: 'cancelled', data: null }` cuando el usuario cierra el selector de
 * cuenta sin elegir ninguna, y `AuthContext.loginWithGoogle` (antes de este fix)
 * hacía `data!.idToken` sin chequear — reventaba con
 * "Cannot read property 'idToken' of null" en vez de simplemente no hacer nada.
 * `loginWithGoogle` ahora traduce ese caso a `new Error('SIGN_IN_CANCELLED')`,
 * y esta pantalla no debe mostrarlo como error.
 */
describe('LoginWithRoleScreen — login con Google', () => {
  it('cancelar el selector de Google NO muestra ningún error', async () => {
    mockLoginWithGoogle.mockRejectedValue(new Error('SIGN_IN_CANCELLED'));
    const onLogin = jest.fn();
    const { getByText, queryByText } = renderScreen({ onLogin });

    fireEvent.press(getByText('Continuar con Google'));

    await waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1));
    expect(queryByText('Ocurrió un error inesperado. Intenta de nuevo.')).toBeNull();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('un error real de Google SÍ se muestra', async () => {
    mockLoginWithGoogle.mockRejectedValue(new Error('network error'));
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Continuar con Google'));

    await waitFor(() => expect(getByText('Sin conexión a internet. Verifica tu red e intenta de nuevo.')).toBeTruthy());
  });

  it('login exitoso con Google → onLogin con el rol', async () => {
    mockLoginWithGoogle.mockResolvedValue({
      status: 'authenticated',
      user: { id: 'u1', email: 'a@b.com', username: 'raul', isClub: false },
    });
    const onLogin = jest.fn();
    const { getByText } = renderScreen({ onLogin });

    fireEvent.press(getByText('Continuar con Google'));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('player'));
  });
});
