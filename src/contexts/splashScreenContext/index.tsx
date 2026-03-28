import {ReactNode, createContext, useContext, useEffect, useState} from 'react';
import * as SplashScreen from 'expo-splash-screen';

import {useAuth} from '../authContext';
import {useOneSignal} from '../oneSignalContext';
interface SplashScreenProviderProps {
  children: ReactNode;
}

interface SplashScreenValue {
  loading: boolean;
  splashScreenHide: boolean;
}

const SplashScreenContext = createContext<SplashScreenValue>({
  loading: false,
  splashScreenHide: true,
});

export function useSplashScreen() {
  return useContext(SplashScreenContext);
}
export function SplashScreenProvider({children}: SplashScreenProviderProps) {
  const [loading, setLoading] = useState(true);
  const [splashScreenHide, setSplashScreenHide] = useState(false);
  const {loadingNotification} = useOneSignal();
  const {loading: authLoading} = useAuth();

  const hideSplashScreen = async () => {
    await SplashScreen.hideAsync();
    setSplashScreenHide(true);
  };

  useEffect(() => {
    if (!authLoading && !loadingNotification) {
      setLoading(false);
      hideSplashScreen();
    }
  }, [authLoading, loadingNotification]);

  const value = {
    loading,
    splashScreenHide,
  };

  return (
    <SplashScreenContext.Provider value={value}>
      {children}
    </SplashScreenContext.Provider>
  );
}
