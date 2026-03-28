import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, StatusBar} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

// VideoView ref shape exposed by expo-video (enterFullscreen/exitFullscreen return Promise<void>)
export type VideoViewRef = {
  enterFullscreen: () => void | Promise<void>;
  exitFullscreen: () => void | Promise<void>;
};

type FullscreenPhase = 'idle' | 'entering' | 'full' | 'exiting';

export type UseVideoFullscreenOptions = {
  /**
   * Controla si el hook debe ejecutar lógica nativa de fullscreen.
   * Útil para plataformas donde no se soporta (Android puro).
   */
  enabled?: boolean;
  /**
   * Oculta la StatusBar al entrar en fullscreen.
   * @default true
   */
  hideStatusBar?: boolean;
  /**
   * Bloquea la orientación mientras el player está en fullscreen.
   * @default true
   */
  lockOrientation?: boolean;
  /**
   * ResizeMode deseado cuando el player ya está en fullscreen.
   * @default 'cover'
   */
  resizeModeInFullscreen?: 'cover' | 'contain' | 'stretch';
  /**
   * Callback disparado cuando el player termina de entrar en fullscreen.
   */
  onEnter?: () => void;
  /**
   * Callback disparado cuando el player termina de salir de fullscreen.
   */
  onExit?: () => void;
};

export type UseVideoFullscreenResult = {
  state: FullscreenPhase;
  resizeMode: 'cover' | 'contain' | 'stretch';
  isFullscreen: boolean;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  handleFullscreenWillPresent: () => void;
  handleFullscreenDidPresent: () => void;
  handleFullscreenWillDismiss: () => void;
  handleFullscreenDidDismiss: () => void;
};

const DEFAULT_RESIZE_MODE: 'cover' | 'contain' | 'stretch' = 'cover';

const logDev = (...args: unknown[]) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[video-fullscreen]', ...args);
  }
};

export const useVideoFullscreen = (
  videoRef: React.RefObject<VideoViewRef | null>,
  {
    enabled = Platform.OS === 'ios',
    hideStatusBar = true,
    lockOrientation = true,
    resizeModeInFullscreen = DEFAULT_RESIZE_MODE,
    onEnter,
    onExit,
  }: UseVideoFullscreenOptions = {},
): UseVideoFullscreenResult => {
  const [state, setState] = useState<FullscreenPhase>('idle');
  const pendingDismissRef = useRef(false);

  const isFullscreen = state === 'entering' || state === 'full';

  const resetDisplayState = useCallback(() => {
    pendingDismissRef.current = false;
    if (hideStatusBar) {
      StatusBar.setHidden(false, 'fade');
    }
    if (lockOrientation) {
      ScreenOrientation.unlockAsync().catch(() => {});
    }
    logDev('display state reset');
  }, [hideStatusBar, lockOrientation]);

  const handleFullscreenWillPresent = useCallback(() => {
    logDev('will present');
    setState('entering');
    if (hideStatusBar) {
      StatusBar.setHidden(true, 'fade');
    }
    if (lockOrientation) {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      ).catch(() => {});
    }
  }, [hideStatusBar, lockOrientation]);

  const handleFullscreenDidPresent = useCallback(() => {
    logDev('did present');
    setState('full');
    onEnter?.();
  }, [onEnter]);

  const handleFullscreenWillDismiss = useCallback(() => {
    logDev('will dismiss');
    setState('exiting');
    pendingDismissRef.current = true;
  }, []);

  const handleFullscreenDidDismiss = useCallback(() => {
    logDev('did dismiss');
    setState('idle');
    if (pendingDismissRef.current) {
      resetDisplayState();
      onExit?.();
    }
  }, [onExit, resetDisplayState]);

  const enterFullscreen = useCallback(() => {
    if (!enabled) {
      logDev('enterFullscreen skipped (disabled)');
      return;
    }
    if (isFullscreen) {
      logDev('enterFullscreen ignored (already fullscreen)');
      return;
    }
    const ref = videoRef.current;
    if (!ref) {
      logDev('enterFullscreen aborted (missing ref)');
      return;
    }
    setState('entering');
    try {
      if (hideStatusBar) {
        StatusBar.setHidden(true, 'fade');
      }
      if (lockOrientation) {
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        ).catch(() => {});
      }
      ref.enterFullscreen();
      logDev('enterFullscreen invoked');
    } catch (error) {
      logDev('enterFullscreen failed', error);
      resetDisplayState();
      setState('idle');
    }
  }, [enabled, hideStatusBar, isFullscreen, lockOrientation, resetDisplayState, videoRef]);

  const exitFullscreen = useCallback(() => {
    if (!enabled) {
      logDev('exitFullscreen skipped (disabled)');
      return;
    }
    if (!isFullscreen) {
      logDev('exitFullscreen ignored (not in fullscreen)');
      resetDisplayState();
      return;
    }
    const ref = videoRef.current;
    if (!ref) {
      logDev('exitFullscreen aborted (missing ref)');
      resetDisplayState();
      setState('idle');
      return;
    }
    setState('exiting');
    pendingDismissRef.current = true;
    try {
      ref.exitFullscreen();
      logDev('exitFullscreen invoked');
    } catch (error) {
      logDev('exitFullscreen failed', error);
      resetDisplayState();
      setState('idle');
    }
  }, [enabled, isFullscreen, resetDisplayState, videoRef]);

  useEffect(
    () => () => {
      resetDisplayState();
    },
    [resetDisplayState],
  );

  useEffect(() => {
    if (!enabled) {
      resetDisplayState();
      setState('idle');
    }
  }, [enabled, resetDisplayState]);

  const resizeMode = useMemo(() => {
    return isFullscreen ? resizeModeInFullscreen : DEFAULT_RESIZE_MODE;
  }, [isFullscreen, resizeModeInFullscreen]);

  return {
    state,
    resizeMode,
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    handleFullscreenWillPresent,
    handleFullscreenDidPresent,
    handleFullscreenWillDismiss,
    handleFullscreenDidDismiss,
  };
};

export default useVideoFullscreen;
