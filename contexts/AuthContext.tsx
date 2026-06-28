/**
 * Torna — AuthContext
 *
 * Provides authentication state and actions across the entire app.
 * Currently implements email/password login fully; social providers are
 * stubbed with TODO placeholders until the native SDKs are installed.
 *
 * Dependencies to install before enabling social login:
 *   npx expo install @react-native-firebase/app @react-native-firebase/auth
 *   npx expo install expo-secure-store
 *   npx expo install expo-apple-authentication
 *   npx expo install @react-native-google-signin/google-signin
 *   npx expo install react-native-fbsdk-next
 *
 * Token storage key: torna_auth_token  (expo-secure-store)
 * Theme storage key: @torna/theme-mode  (async-storage — separate concern)
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import firebaseAuth from '@react-native-firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TornaUser {
  id: string;
  email: string;
  username: string;
  name?: string;
  phone?: string;
  region?: string;
  isClub: boolean;
  profilePicture?: string;
  frontPage?: string;
  authProvider?: 'email' | 'google' | 'apple' | 'facebook';
}

export interface RegisterDto {
  username: string;
  name?: string;
  phone?: string;
  region?: string;
  isClub?: boolean;
  authProvider?: 'email' | 'google' | 'apple' | 'facebook';
}

export type LoginResult =
  | { status: 'authenticated'; user: TornaUser }
  | { status: 'needs_registration'; idToken: string; name?: string; email?: string };

interface AuthContextValue {
  user: TornaUser | null;
  token: string | null;
  isLoading: boolean;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  /**
   * Alta por email/contraseña (solo Player). Crea el usuario en Firebase
   * (client SDK), obtiene el idToken y lo registra en el backend. El player
   * queda activo al instante (status=true); el club requeriría aprobación.
   */
  registerWithEmailPassword: (
    email: string,
    password: string,
    dto: Omit<RegisterDto, 'authProvider'>,
  ) => Promise<void>;
  /**
   * Cambia la contraseña de la cuenta. Re-autentica con la contraseña actual
   * (la verifica de verdad) y actualiza la nueva directamente en Firebase.
   */
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  loginWithGoogle: () => Promise<LoginResult>;
  loginWithApple: () => Promise<LoginResult>;
  register: (idToken: string, dto: RegisterDto) => Promise<void>;
  /** Actualiza la foto de perfil en el estado local tras subirla (PATCH /user/me). */
  updateProfilePicture: (url: string) => void;
  /** Actualiza la foto de portada en el estado local tras subirla (PATCH /user/me). */
  updateFrontPage: (url: string) => void;
  logout: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Secure storage — expo-secure-store (hardware-backed on device)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'torna_auth_token';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    if (__DEV__) console.log('[AUTH DEBUG] FAIL', `${API_URL}${path}`, 'status=', res.status);
    const body = await res.json().catch(() => ({})) as { message?: string };
    const err = new Error(body.message ?? `HTTP ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }

  // El backend envuelve toda respuesta exitosa en { data, statusCode, timestamp }
  // (TransformInterceptor global). Desenvolvemos `data` acá para que cada caller
  // reciba directamente el payload.
  const json = await res.json().catch(() => ({})) as { data?: T };
  return (json && typeof json === 'object' && 'data' in json
    ? json.data
    : json) as T;
}

// POST /auth/login-email-password
// El backend responde { exists, user: {...}, tokens: {...} } (ya desenvuelto el envelope).
interface BackendUser {
  id: string;
  username: string;
  email: string;
  name?: string;
  phone?: string;
  region?: string;
  isClub: boolean;
  profilePicture?: string;
  frontPage?: string;
  authProvider?: string;
}

interface EmailPasswordResponse {
  exists: boolean;
  user: BackendUser;
  tokens: {
    idToken: string;
    refreshToken: string;
    expiresIn: string;
  };
}

async function apiLoginEmailPassword(
  email: string,
  password: string,
): Promise<EmailPasswordResponse> {
  return apiFetch<EmailPasswordResponse>('/auth/login-email-password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// POST /auth/login (social — fires idToken obtained from Firebase)
// El backend responde { exists, user? } cuando el usuario existe, o
// { exists: false, firebaseUser } cuando hace falta completar el registro.
interface LoginResponse {
  exists: boolean;
  user?: BackendUser;
  firebaseUser?: { id: string; email: string; name?: string; picture?: string };
  message?: string;
}

async function apiLoginWithToken(idToken: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

// POST /auth/register
interface RegisterResponse {
  id: string;
  username: string;
  email: string;
  name?: string;
  isClub: boolean;
  authProvider?: string;
}

async function apiRegister(
  idToken: string,
  dto: RegisterDto,
): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ idToken, ...dto }),
  });
}

// GET /auth/me
async function apiGetMe(idToken: string): Promise<TornaUser> {
  return apiFetch<TornaUser>('/auth/me', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<TornaUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: restore session from SecureStore and validate with /auth/me
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!stored) return;

        const me = await apiGetMe(stored);
        if (!cancelled) {
          setToken(stored);
          setUser(me);
        }
      } catch (err) {
        console.error('[AuthContext] restoreSession failed:', err);
        // Token expired or invalid — wipe it
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // ------------------------------------------------------------------
  // registerNotificationId — best-effort: sends OneSignal push subscription
  // ID to the backend so the server can target this device for push alerts.
  // Uses require() to avoid static import issues when types may not be resolved.
  // ------------------------------------------------------------------
  async function registerNotificationId(idToken: string): Promise<void> {
    try {
      const OneSignal = require('react-native-onesignal').OneSignal;
      const subId: string | null = await OneSignal.User.pushSubscription.getIdAsync();
      if (!subId) return;
      await fetch(`${API_URL}/user/update-notification-id`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ notificationID: subId }),
      });
    } catch (err) {
      console.error('[AuthContext] registerNotificationId failed (non-critical):', err);
    }
  }

  // ------------------------------------------------------------------
  // loginWithEmailPassword
  // ------------------------------------------------------------------
  const loginWithEmailPassword = useCallback(
    async (email: string, password: string): Promise<void> => {
      const { user, tokens } = await apiLoginEmailPassword(email, password);

      await SecureStore.setItemAsync(TOKEN_KEY, tokens.idToken);

      setToken(tokens.idToken);
      setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        phone: user.phone,
        region: user.region,
        isClub: user.isClub,
        profilePicture: user.profilePicture,
        frontPage: user.frontPage,
        authProvider: 'email',
      });
      await registerNotificationId(tokens.idToken);
    },
    [],
  );

  // ------------------------------------------------------------------
  // loginWithGoogle
  // ------------------------------------------------------------------
  const loginWithGoogle = useCallback(async (): Promise<LoginResult> => {
    GoogleSignin.configure({
      webClientId: '83738503515-bit0pprnegn1eg2r3eodqshfgk64eh4d.apps.googleusercontent.com',
    });
    await GoogleSignin.hasPlayServices();
    const { data } = await GoogleSignin.signIn();
    const googleCredential = firebaseAuth.GoogleAuthProvider.credential(data!.idToken);
    const userCredential = await firebaseAuth().signInWithCredential(googleCredential);
    const firebaseIdToken = await userCredential.user.getIdToken();
    return _socialLogin(firebaseIdToken);
  }, []);

  // ------------------------------------------------------------------
  // loginWithApple
  // ------------------------------------------------------------------
  const loginWithApple = useCallback(async (): Promise<LoginResult> => {
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const { identityToken } = appleCredential;
    if (!identityToken) throw new Error('Apple Sign-In no retornó identityToken');
    const oauthCredential = new firebaseAuth.OAuthProvider('apple.com').credential(
      identityToken,
    );
    const userCredential = await firebaseAuth().signInWithCredential(oauthCredential);
    const firebaseIdToken = await userCredential.user.getIdToken();
    return _socialLogin(firebaseIdToken);
  }, []);

  // ------------------------------------------------------------------
  // Shared helper used by social flows once they have an idToken
  // ------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function _socialLogin(
    idToken: string,
    name?: string,
    email?: string,
  ): Promise<LoginResult> {
    try {
      const data = await apiLoginWithToken(idToken);

      // Firebase autenticó al usuario pero todavía no tiene cuenta Torna:
      // el backend responde 200 con { exists: false, firebaseUser }.
      if (!data.exists || !data.user) {
        return {
          status: 'needs_registration',
          idToken,
          name: name ?? data.firebaseUser?.name,
          email: email ?? data.firebaseUser?.email,
        };
      }

      const u = data.user;
      await SecureStore.setItemAsync(TOKEN_KEY, idToken);

      const tornaUser: TornaUser = {
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.name,
        isClub: u.isClub,
        profilePicture: u.profilePicture,
        frontPage: u.frontPage,
        authProvider: (u.authProvider as TornaUser['authProvider']) ?? 'google',
      };

      setToken(idToken);
      setUser(tornaUser);
      await registerNotificationId(idToken);

      return { status: 'authenticated', user: tornaUser };
    } catch (err: any) {
      if (err?.status === 404) {
        // Fallback defensivo: variantes del backend que devuelven 404.
        return { status: 'needs_registration', idToken, name, email };
      }
      throw err;
    }
  }

  // ------------------------------------------------------------------
  // register
  // ------------------------------------------------------------------
  const register = useCallback(
    async (idToken: string, dto: RegisterDto): Promise<void> => {
      const data = await apiRegister(idToken, dto);

      await SecureStore.setItemAsync(TOKEN_KEY, idToken);

      setToken(idToken);
      setUser({
        id: data.id,
        email: data.email,
        username: data.username,
        name: data.name,
        isClub: data.isClub ?? false,
        authProvider: dto.authProvider ?? 'google',
      });
      await registerNotificationId(idToken);
    },
    [],
  );

  // ------------------------------------------------------------------
  // registerWithEmailPassword (solo Player)
  // Crea la cuenta en Firebase con email/contraseña, obtiene el idToken y
  // reutiliza register() para darla de alta en el backend. El player entra al
  // instante (el backend setea status=true para isClub=false).
  // ------------------------------------------------------------------
  const registerWithEmailPassword = useCallback(
    async (
      email: string,
      password: string,
      dto: Omit<RegisterDto, 'authProvider'>,
    ): Promise<void> => {
      const credential = await firebaseAuth().createUserWithEmailAndPassword(
        email.trim(),
        password,
      );
      const idToken = await credential.user.getIdToken();
      await register(idToken, { ...dto, authProvider: 'email' });
    },
    [register],
  );

  // ------------------------------------------------------------------
  // changePassword
  // Re-autentica con la contraseña actual para (a) verificarla y (b) crear una
  // sesión en el cliente de Firebase — necesaria porque los usuarios que
  // entraron por email/password lo hicieron vía backend y NO tienen
  // currentUser en el SDK cliente. Luego actualiza la contraseña en Firebase y
  // refresca el idToken guardado para que la sesión siga válida.
  // ------------------------------------------------------------------
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<void> => {
      const email = user?.email;
      if (!email) throw new Error('No hay una sesión activa.');

      // 1. Verificar la contraseña actual + establecer sesión en el cliente.
      await firebaseAuth().signInWithEmailAndPassword(email, currentPassword);

      const current = firebaseAuth().currentUser;
      if (!current) throw new Error('No se pudo validar la sesión.');

      // 2. Actualizar la contraseña en Firebase.
      await current.updatePassword(newPassword);

      // 3. Refrescar el idToken guardado (el cambio puede invalidar el viejo).
      const fresh = await current.getIdToken(true);
      await SecureStore.setItemAsync(TOKEN_KEY, fresh);
      setToken(fresh);
    },
    [user],
  );

  // ------------------------------------------------------------------
  // updateProfilePicture — sincroniza el estado local tras subir la foto
  // (la subida + PATCH /user/me las hace expo/api/profile.ts)
  // ------------------------------------------------------------------
  const updateProfilePicture = useCallback((url: string) => {
    setUser((u) => (u ? { ...u, profilePicture: url } : u));
  }, []);

  // ------------------------------------------------------------------
  // updateFrontPage — sincroniza el estado local tras subir la portada
  // (la subida + PATCH /user/me las hace expo/api/profile.ts)
  // ------------------------------------------------------------------
  const updateFrontPage = useCallback((url: string) => {
    setUser((u) => (u ? { ...u, frontPage: url } : u));
  }, []);

  // ------------------------------------------------------------------
  // logout
  // ------------------------------------------------------------------
  const logout = useCallback(async (): Promise<void> => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    await firebaseAuth().signOut().catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    isLoading,
    loginWithEmailPassword,
    registerWithEmailPassword,
    changePassword,
    loginWithGoogle,
    loginWithApple,
    register,
    updateProfilePicture,
    updateFrontPage,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
