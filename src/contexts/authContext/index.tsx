import {createContext, useContext, useEffect, useState, ReactNode} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';

import {UserResponse} from '@/config/types';
import {getApiProfileData} from '@/api/Profile/GetAPiProfile';
import {
  deleteCurrentUser,
  logInUserWithEmailAndPassword,
  logOut,
  registerUserWithEmailAndPassword,
} from '@/firebase/auth';
import {SignupPost} from '@/auth';
import {getData, STORAGE_KEYS, storeData} from '@/utils/storage';
import {DEBOUNCE_TIME} from '@/utils';

interface AuthProviderProps {
  children: ReactNode;
}

export enum ErrorType {
  DEFAULT = 'default',
  NO_AUTHORIZED = 'no_authorized',
  INTERNAL_SERVER = 'internal_server',
  USER_NOT_FOUND_IN_DB = 'user_not_found_in_db',
}

interface Error {
  error: string;
  type: ErrorType;
}

export interface AuthType {
  firebaseUser: FirebaseAuthTypes.User;
}

const AuthContext = createContext<any>(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({children}: AuthProviderProps) {
  const [popupShow, setPopupShow] = useState(false);
  // Destructure `children` here
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [firebaseUser, setFirebaseUser] =
    useState<FirebaseAuthTypes.User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [, setDebounceTimeout] = useState<NodeJS.Timeout | null>();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(initializeUser);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function safeLogOut() {
    try {
      // Solo hacer logout si hay un usuario autenticado
      const currentUser = auth().currentUser;
      if (currentUser) {
        await logOut();
      }
    } catch (err) {
      console.log('logOut', err);
    }
  }

  async function getProfile(token: string) {
    let badLogin = false;
    let profile = null;
    try {
      profile = await getApiProfileData(token);
    } catch (err) {
      console.log('code:', err);
      switch (err) {
        case 500:
          setError({
            error: 'Servidor no disponible, intenta más tarde',
            type: ErrorType.INTERNAL_SERVER,
          });
          break;
        case 404:
          setError({
            error: 'Error de servidor, intenta registrarte nuevamente',
            type: ErrorType.INTERNAL_SERVER,
          });
          // Delete firebase user
          deleteCurrentUser();
          break;
        default:
          setError({
            error: 'Error al iniciar sesión, intenta nuevamente',
            type: ErrorType.DEFAULT,
          });
          break;
      }
    }

    if (profile) {
      if (profile.isClub) {
        setError({
          error:
            'Un usuario de tipo club no puede iniciar sesión en la app de jugadores',
          type: ErrorType.NO_AUTHORIZED,
        });
        badLogin = true;
      } else {
        setCurrentUser(profile);
        setIsUserLoggedIn(true);
        await storeData(STORAGE_KEYS.USER_ID, profile.id);
        return profile;
      }
    } else {
      badLogin = true;
    }

    if (badLogin) {
      safeLogOut();
    }
  }

  async function logInUser(email: string, password: string) {
    let token = '';
    try {
      const result = await logInUserWithEmailAndPassword(email, password);
      console.log('log in:', result.user);
      token = await result.user.getIdToken();

      getProfile(token);
    } catch (err: any) {
      console.log('[Auth] login error code:', err?.code, 'message:', err?.message);
      safeLogOut();

      setError({
        error: 'Ingresa un usuario o contraseña válidos',
        type: ErrorType.DEFAULT,
      });
      return;
    }
  }

  async function signUpUser(email: string, password: string, data: any) {
    try {
      const firebaseRes = await registerUserWithEmailAndPassword(
        email,
        password,
      );
      await firebaseRes.user.sendEmailVerification();

      const token = await firebaseRes.user.getIdToken();

      const res = await SignupPost(data, token);
      setCurrentUser(res);
      storeData(STORAGE_KEYS.USER_ID, res.id);
      setIsUserLoggedIn(true);

      return res;
    } catch (err: any) {
      console.log(err);
      safeLogOut();

      throw err.code;
    }
  }

  function initializeUser(user: FirebaseAuthTypes.User | null) {
    setDebounceTimeout(old => {
      if (old) {
        clearTimeout(old);
      }
      return setTimeout(() => {
        setDebounceTimeout(null);
        handleInitializeUser(user);
      }, DEBOUNCE_TIME);
    });
  }

  async function handleInitializeUser(user: FirebaseAuthTypes.User | null) {
    if (user) {
      let token = '';
      try {
        token = await user.getIdToken();
        setFirebaseUser(user);
        setAccessToken(token);

        const userId = await getData(STORAGE_KEYS.USER_ID);
        const u = await getProfile(token);

        if (u) {
          if (userId && userId !== u.id) {
            await storeData(STORAGE_KEYS.USER_ID, u.id);
          } else if (!userId) {
            await storeData(STORAGE_KEYS.USER_ID, u.id);
          }
        } else {
          throw 'No se pudo obtener el perfil del usuario';
        }
      } catch (err) {
        console.error('Error on get accessToken', err);
        setError({
          error: 'Error al iniciar sesión, intenta nuevamente',
          type: ErrorType.DEFAULT,
        });
      }
    } else {
      setFirebaseUser(null);
      setCurrentUser(null);
      setAccessToken(null);
      setIsUserLoggedIn(false);
      await storeData(STORAGE_KEYS.USER_ID, '');
      setError(null);
    }

    setLoading(false);
  }

  const getAccessToken = async () => {
    try {
      const token = await firebaseUser?.getIdToken();
      return token;
    } catch (err) {
      console.log('Error on get Access Token:', err);
    }
    return null;
  };

  const refreshCurrentUser = async () => {
    if (!firebaseUser) return;

    try {
      const token = await getAccessToken();
      if (!token) return;

      const updatedProfile = await getApiProfileData(token);
      if (updatedProfile) {
        setCurrentUser(updatedProfile);
      }
    } catch (error) {
      console.error('Error al refrescar datos del usuario:', error);
    }
  };

  const value = {
    setPopupShow,
    popupShow,
    currentUser,
    setCurrentUser,
    firebaseUser,
    accessToken,
    isUserLoggedIn,
    loading,
    error,
    logInUser,
    signUpUser,
    getAccessToken,
    refreshCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
