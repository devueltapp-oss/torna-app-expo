import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {VideoView, useVideoPlayer} from 'expo-video';

import useVideoFullscreen, {type VideoViewRef} from '@/hooks/useVideoFullscreen';

export type PlayerHandle = {
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  getVideoRef: () => VideoView | null;
  isFullscreen: () => boolean;
  /** Seek to absolute time in seconds */
  seek: (time: number) => void;
  /** Pause playback */
  pause: () => void;
  /** Resume playback */
  resume: () => void;
};

export type PlayerProps = {
  /**
   * URI del recurso a reproducir.
   */
  uri: string;
  /**
   * Estilo aplicado al contenedor del video.
   */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Estilo aplicado a la vista de video.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * ResizeMode para fullscreen. Por defecto `cover`.
   */
  resizeModeInFullscreen?: 'contain' | 'cover' | 'stretch';
  /**
   * Controla si se activa el fullscreen nativo (principalmente iOS).
   * @default Platform.OS === 'ios'
   */
  enableNativeFullscreenIOS?: boolean;
  /**
   * Si el video está pausado.
   */
  paused?: boolean;
  /**
   * Volumen 0–1.
   */
  volume?: number;
  /**
   * Mostrar controles nativos.
   */
  controls?: boolean;
  /**
   * Repetir en loop.
   */
  repeat?: boolean;
  /**
   * Reproducir en background.
   */
  playInBackground?: boolean;
  /**
   * Callback cuando el player terminó de entrar a fullscreen.
   */
  onEnterFullscreen?: () => void;
  /**
   * Callback cuando el player terminó de salir de fullscreen.
   */
  onExitFullscreen?: () => void;
  /**
   * Callback para observar el estado de fullscreen.
   */
  onFullscreenChange?: (isFullscreen: boolean) => void;
  /**
   * Callback de progreso de reproducción.
   */
  onProgress?: (data: {currentTime: number}) => void;
  /**
   * Callback al cargar el video.
   */
  onLoad?: (data: {duration: number}) => void;
  /**
   * Callback de error.
   */
  onError?: (error: unknown) => void;
  /**
   * Callback cuando el video está listo para mostrarse.
   */
  onReadyForDisplay?: () => void;
  /**
   * Callback cuando el buffer cambia.
   */
  onBuffer?: (data: {isBuffering: boolean}) => void;
};

const Player = forwardRef<PlayerHandle, PlayerProps>(
  (
    {
      uri,
      containerStyle,
      resizeModeInFullscreen,
      enableNativeFullscreenIOS = Platform.OS === 'ios',
      paused = false,
      volume = 1,
      controls = false,
      repeat = false,
      playInBackground: _playInBackground,
      onEnterFullscreen,
      onExitFullscreen,
      onFullscreenChange,
      onProgress,
      onLoad,
      onError,
      onReadyForDisplay,
      onBuffer,
      style,
    },
    ref,
  ) => {
    const videoViewRef = useRef<VideoView | null>(null);

    const player = useVideoPlayer(uri, p => {
      p.loop = repeat ?? false;
      p.volume = volume ?? 1;
      if (!paused) {
        p.play();
      }
    });

    // Keep paused state in sync
    React.useEffect(() => {
      if (paused) {
        player.pause();
      } else {
        player.play();
      }
    }, [paused, player]);

    // Volume sync
    React.useEffect(() => {
      player.volume = volume ?? 1;
    }, [volume, player]);

    // Progress tracking
    React.useEffect(() => {
      if (!onProgress) {
        return;
      }
      const interval = setInterval(() => {
        onProgress({currentTime: player.currentTime});
      }, 1000);
      return () => clearInterval(interval);
    }, [onProgress, player]);

    // Status events
    React.useEffect(() => {
      const subscription = player.addListener('statusChange', event => {
        if (event.status === 'readyToPlay') {
          onReadyForDisplay?.();
          onLoad?.({duration: player.duration ?? 0});
        } else if (event.status === 'error') {
          onError?.(event.error);
        }
      });
      return () => subscription.remove();
    }, [player, onReadyForDisplay, onLoad, onError]);

    // Buffering
    React.useEffect(() => {
      if (!onBuffer) {
        return;
      }
      const subscription = player.addListener('playingChange', event => {
        // When not playing and not paused intentionally = buffering heuristic
        onBuffer?.({isBuffering: !event.isPlaying && !paused});
      });
      return () => subscription.remove();
    }, [player, onBuffer, paused]);

    const {
      isFullscreen,
      enterFullscreen,
      exitFullscreen,
    } = useVideoFullscreen(videoViewRef as React.RefObject<VideoViewRef>, {
      enabled: enableNativeFullscreenIOS,
      resizeModeInFullscreen,
      onEnter: () => {
        onEnterFullscreen?.();
        onFullscreenChange?.(true);
      },
      onExit: () => {
        onExitFullscreen?.();
        onFullscreenChange?.(false);
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        enterFullscreen,
        exitFullscreen,
        getVideoRef: () => videoViewRef.current,
        isFullscreen: () => isFullscreen,
        seek: (time: number) => {
          player.currentTime = time;
        },
        pause: () => player.pause(),
        resume: () => player.play(),
      }),
      [enterFullscreen, exitFullscreen, isFullscreen, player],
    );

    const containerStyles = useMemo(() => {
      if (isFullscreen) {
        return [styles.container, styles.fullscreenContainer];
      }
      return [styles.container, containerStyle];
    }, [containerStyle, isFullscreen]);

    const videoStyle = useMemo(
      () => [styles.video, style, isFullscreen && styles.videoFullscreen],
      [isFullscreen, style],
    );

    return (
      <View pointerEvents="box-none" style={containerStyles}>
        <VideoView
          ref={videoViewRef}
          player={player}
          contentFit={isFullscreen ? (resizeModeInFullscreen === 'cover' ? 'cover' : 'contain') : 'contain'}
          nativeControls={controls}
          style={videoStyle}
        />
      </View>
    );
  },
);

Player.displayName = 'Player';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'black',
  },
  fullscreenContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: 'black',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
  },
  videoFullscreen: {
    width: '100%',
    height: '100%',
  },
});

export default Player;
