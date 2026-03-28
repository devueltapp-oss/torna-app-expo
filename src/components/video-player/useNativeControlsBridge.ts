import {useCallback} from 'react';

import type {PlayerHandle} from './player';

export type NativeControlsBridge = {
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
  toggleFullscreen: () => void;
};

/**
 * Hook liviano para enlazar `react-native-video-controls` u otros componentes
 * de UI con el fullscreen nativo expuesto por el `Player`.
 */
export const useNativeControlsBridge = (
  playerRef: React.RefObject<PlayerHandle | null>,
): NativeControlsBridge => {
  const onEnterFullscreen = useCallback(() => {
    playerRef.current?.enterFullscreen();
  }, [playerRef]);

  const onExitFullscreen = useCallback(() => {
    playerRef.current?.exitFullscreen();
  }, [playerRef]);

  const toggleFullscreen = useCallback(() => {
    if (playerRef.current?.isFullscreen()) {
      playerRef.current.exitFullscreen();
    } else {
      playerRef.current?.enterFullscreen();
    }
  }, [playerRef]);

  return {
    onEnterFullscreen,
    onExitFullscreen,
    toggleFullscreen,
  };
};

export default useNativeControlsBridge;



