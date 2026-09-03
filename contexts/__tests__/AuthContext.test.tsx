/**
 * Regresión del bug "la sesión se cierra sola a las 3-5 horas".
 *
 * Causa: `loginWithEmailPassword` (el camino más común — alguien volviendo a
 * entrar, no dando de alta una cuenta) solo autenticaba contra el BACKEND y
 * nunca contra el SDK cliente de Firebase. Todo el mecanismo de refresh del
 * archivo (`onIdTokenChanged`, el listener de `AppState`, el fallback de
 * `restoreSession`) depende de `firebaseAuth().currentUser` — sin él, el
 * idToken guardado en el login queda fijo, vence a la hora (fija, no
 * configurable en Firebase) y no hay nada que lo renueve. El síntoma se sentía
 * como "3-5 horas" porque recién se notaba al reabrir la app, no al momento
 * exacto de vencer.
 *
 * Lo que fija este test: que el login por email/contraseña también deje
 * sesión en el SDK cliente (`signInWithEmailAndPassword`), que es lo mismo que
 * ya hacían `registerWithEmailPassword` y los logins sociales.
 */
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';

const mockSignInWithEmailAndPassword = jest.fn();
const mockOnIdTokenChanged = jest.fn(() => jest.fn());

jest.mock('@react-native-firebase/auth', () => {
  const fn: any = () => ({
    onIdTokenChanged: mockOnIdTokenChanged,
    currentUser: null,
    signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
    signOut: jest.fn(async () => undefined),
  });
  fn.GoogleAuthProvider = { credential: jest.fn() };
  fn.OAuthProvider = jest.fn();
  return { __esModule: true, default: fn };
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn(), signIn: jest.fn() },
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock('../../services/notifications', () => ({
  identifyUser: jest.fn(async () => undefined),
  clearIdentity: jest.fn(async () => undefined),
}));

jest.mock('../../hooks/useNearbyLocation', () => ({
  forgetLocationOnLogout: jest.fn(async () => undefined),
}));

// El mock global de jest.setup.js devuelve 'test-token' siempre, lo que haría
// que `restoreSession` (efecto de montaje) dispare su propio fetch a
// /auth/me y se coma el mock de fetch pensado para el login. Sin token
// guardado, ese efecto no llama a la red.
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

global.fetch = jest.fn();

function mockLoginResponse() {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      data: {
        exists: true,
        user: {
          id: 'u1', username: 'jugador', email: 'jugador@torna.io', isClub: false,
        },
        tokens: { idToken: 'backend-id-token', refreshToken: 'r', expiresIn: '3600' },
      },
    }),
  });
}

describe('AuthContext — loginWithEmailPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnIdTokenChanged.mockImplementation(() => jest.fn());
  });

  it('inicia sesión también en el SDK cliente de Firebase, no solo contra el backend', async () => {
    mockLoginResponse();
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({
      user: { getIdToken: async () => 'client-sdk-id-token' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.loginWithEmailPassword('jugador@torna.io', 'clave123');
    });

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith('jugador@torna.io', 'clave123');
  });

  /**
   * Si el SDK cliente falla (sin red, throttling), el login no debe romperse:
   * el backend ya validó la contraseña. Se sigue con su token — logueado, sin
   * auto-refresh hasta el próximo login — en vez de dejar a la persona afuera.
   */
  it('si el SDK cliente falla, el login igual completa con el token del backend', async () => {
    mockLoginResponse();
    mockSignInWithEmailAndPassword.mockRejectedValueOnce(new Error('sin red'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: any;
    await act(async () => {
      outcome = await result.current.loginWithEmailPassword('jugador@torna.io', 'clave123');
    });

    expect(outcome.status).toBe('authenticated');
    expect(result.current.token).toBe('backend-id-token');

    errSpy.mockRestore();
  });
});
