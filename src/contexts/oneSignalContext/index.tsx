/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prettier/prettier */
/* eslint-disable no-trailing-spaces */
/* eslint-disable curly */
/* eslint-disable eqeqeq */
import {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {
  LogLevel,
  NotificationClickEvent,
  OneSignal,
  OSNotification,
} from 'react-native-onesignal';
const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '';
import PutApiUpdateNotificationID from '@/api/NotificationOneSignal/PutApiUpdateNotificationID';
import {useAuth} from '@/contexts/authContext';

const OneSignalContext = createContext<any>(null);

export function useOneSignal() {
  return useContext(OneSignalContext);
}

interface oneSignalProviderProps {
  children: ReactNode;
}

export function OneSignalProvider({children}: oneSignalProviderProps) {
  const [loadingNotification, setLoadingNotificacion] = useState<boolean>(true);
  const [notification, setNotificacion] = useState<OSNotification | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  // NO usar estado para playerId - siempre obtenerlo directamente de OneSignal
  const {accessToken, getAccessToken, isUserLoggedIn} = useAuth();

  const _opened = (event: NotificationClickEvent) => {
    setNotificacion(event.notification);
    setLoadingNotificacion(false);
  };

  useEffect(() => {
    // Configurar nivel de log
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);

    // OneSignal Initialization
    const oneSignalAppId = ONESIGNAL_APP_ID;
    
    if (!oneSignalAppId || oneSignalAppId === 'tu_app_id_de_onesignal_aqui') {
      console.warn('OneSignal App ID no está definido correctamente');
      setLoadingNotificacion(false);
      setIsInitialized(false);
      return;
    }
    
    try {
      OneSignal.initialize(oneSignalAppId);
      setIsInitialized(true);
      
      setTimeout(() => {
        OneSignal.Notifications.getPermissionAsync().then((hasPermission) => {
          if (!hasPermission) {
            OneSignal.Notifications.requestPermission(true).then((permission) => {
              if (permission) {
                OneSignal.User.pushSubscription.optIn();
                // El useEffect se encargará de obtener el ID y actualizar el backend
              }
            }).catch((error: any) => {
              console.error('Error al solicitar permisos de OneSignal:', error);
            });
          } else {
            OneSignal.User.pushSubscription.optIn();
            // El useEffect se encargará de obtener el ID y actualizar el backend
          }
        }).catch((error: any) => {
          console.error('Error al verificar permisos de OneSignal:', error);
          OneSignal.Notifications.requestPermission(true).then((permission) => {
            if (permission) {
              OneSignal.User.pushSubscription.optIn();
            }
          });
        });
      }, 500);

      // Suscribirse a eventos de notificaciones
      OneSignal.Notifications.addEventListener('click', _opened);
    } catch (error) {
      console.error('Error al inicializar OneSignal:', error);
      setLoadingNotificacion(false);
      setIsInitialized(false);
    }

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => {
      if (isInitialized) {
        OneSignal.Notifications.removeEventListener('click', _opened);
      }
    };
  }, []);

  //subscribe to `opened` after navigation is ready to can use navigate
  const onReady = () => {
    if (isInitialized) {
      OneSignal.Notifications.addEventListener('click', _opened);
      //setTimeout(fn, 0) mean function cannot run until the stack on the main thread is empty.
      //this ensure _opened is executed if app is opened from notification
      setTimeout(() => {
        if (!notification) {
          //remove loading screen and start with home
          setLoadingNotificacion(false);
        }
      }, 0);
    } else {
      setLoadingNotificacion(false);
    }
  };
  
  const fetchPlayerIdInternal = async (): Promise<string | null> => {
    try {
      if (!OneSignal || typeof OneSignal.User === 'undefined') {
        console.warn('⚠️ OneSignal: OneSignal.User no está disponible');
        return null;
      }
    } catch (error) {
      console.error('❌ OneSignal: Error al verificar OneSignal.User:', error);
      return null;
    }

    try {
      OneSignal.User.pushSubscription.optIn();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
      let onesignalId: string | null = null;
      try {
        onesignalId = await OneSignal.getUserId();
      } catch (error) {
        // Ignorar si no se puede obtener
      }
      
      // Log esencial: ambos IDs
      console.log('📱 OneSignal IDs - Subscription:', subscriptionId || 'NULL', '| OneSignal ID:', onesignalId || 'NULL');
      
      if (subscriptionId) {
        return subscriptionId;
      } else {
        console.warn('⚠️ OneSignal: Subscription ID es null - No se actualizará el backend');
        return null;
      }
    } catch (error) {
      console.error('❌ OneSignal: Error al obtener IDs:', error);
      return null;
    }
  };

  const fetchPlayerId = async (): Promise<string | null> => {
    // NO usar caché - siempre obtener el ID directamente de OneSignal
    return await fetchPlayerIdInternal();
  };

  const checkPermissions = async () => {
    if (!isInitialized) {
      return {
        hasPermission: false,
        isInitialized: false,
        playerId: null,
      };
    }

    try {
      const hasPermission = await OneSignal.Notifications.getPermissionAsync();
      // Obtener el ID directamente de OneSignal (sin usar caché)
      const currentSubscriptionId = await fetchPlayerIdInternal();
      
      return {
        hasPermission,
        isInitialized: true,
        playerId: currentSubscriptionId, // ID obtenido directamente de OneSignal
      };
    } catch (error) {
      console.error('Error al verificar permisos:', error);
      // Intentar obtener el ID incluso si hay error en permisos
      const currentSubscriptionId = await fetchPlayerIdInternal().catch(() => null);
      
      return {
        hasPermission: false,
        isInitialized: true,
        playerId: currentSubscriptionId, // ID obtenido directamente de OneSignal
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  const updateNotificationIdInBackend = async (
    notificationId: string | null,
    token: string,
  ) => {
    if (!notificationId || !token) {
      return;
    }

    try {
      await PutApiUpdateNotificationID(token, notificationId);
      console.log('✅ OneSignal: Notification ID actualizado');
    } catch (error) {
      console.error('❌ OneSignal: Error al actualizar Notification ID:', error);
    }
  };

  useEffect(() => {
    if (!isUserLoggedIn) return;

    const updateNotificationId = async () => {
      const currentSubscriptionId = await fetchPlayerIdInternal();

      if (!currentSubscriptionId) {
        return;
      }

      let token = accessToken;
      if (!token && getAccessToken) {
        token = await getAccessToken();
      }

      if (token) {
        await updateNotificationIdInBackend(currentSubscriptionId, token);
      }
    };

    updateNotificationId();
  }, [accessToken, getAccessToken, isUserLoggedIn]);

  const value = {
    loadingNotification,
    setLoadingNotificacion,
    notification,
    onReady,
    fetchPlayerId,
    updateNotificationIdInBackend,
    checkPermissions,
  };

  return (
    <OneSignalContext.Provider value={value}>
      {children}
    </OneSignalContext.Provider>
  );
}
