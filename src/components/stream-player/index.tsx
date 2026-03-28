import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Animated, BackHandler, Pressable, StyleSheet, View, ActivityIndicator} from 'react-native';
import {Text} from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import {useFocusEffect} from '@react-navigation/native';

import {useFadeAnimation} from '../../animations';
import {
  BackArrowIcon,
  FullscreenIcon,
  PauseIcon,
  ResumeIcon,
  TouchableIcon,
} from '../../assets/icons';
import EyeIcon from '../../assets/icons/eye-icon';

import {colors} from '@/config/theme';
import {StreamPlayerProps} from '@/config/types';
import Player, {type PlayerHandle} from '@/components/video-player/player';
import useNativeControlsBridge from '@/components/video-player/useNativeControlsBridge';
// Inline types replacing react-native-video's OnBufferData / OnLoadData / OnProgressData
type OnBufferData = {isBuffering: boolean};
type OnLoadData = {duration: number; [key: string]: unknown};
type OnProgressData = {currentTime: number; [key: string]: unknown};

const logDev = (...args: unknown[]) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[stream-player]', ...args);
  }
};

function StreamPlayer({
  stream,
  navigation,
  viewers,
  timeToHideControls = 2500,
  initialVolume = 1,
  showControls = true,
  playUntilSecond,
  fullscreenResizeMode,
}: StreamPlayerProps): React.JSX.Element {
  const playerRef = useRef<PlayerHandle>(null);
  const {toggleFullscreen} = useNativeControlsBridge(playerRef);
  const {fadeIn, fadeOut, opacityValue} = useFadeAnimation({
    fadeInConfig: {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    },
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [hours, setHours] = useState<string>('00');
  const [minutes, setMinutes] = useState<string>('00');
  const [seconds, setSeconds] = useState<string>('00');
  const [isShowingControls, setIsShowingControls] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [videoKey, setVideoKey] = useState<number>(0);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Log la URL que se usa para depuraci?n (ver en consola al reproducir)
    logDev('stream URL in use:', stream ?? '(null/undefined)');
    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
  }, [stream]);

  const handleLoad = useCallback((data: OnLoadData) => {
    logDev('loaded', data?.duration);
    setIsLoading(false);
    setHasError(false);
    setRetryCount(0);
  }, []);

  const handleBuffer = useCallback((data: OnBufferData) => {
    logDev('buffering', data?.isBuffering);
    setIsBuffering(Boolean(data?.isBuffering));
  }, []);

  const handleError = useCallback((error: unknown) => {
    logDev('error', error);
    setIsLoading(false);
    setHasError(true);

    if (retryCount < 3) {
      logDev(`retrying ${retryCount + 1}/3`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setVideoKey(prev => prev + 1);
        setHasError(false);
        setIsLoading(true);
      }, 2000);
    }
  }, [retryCount]);

  const handleReadyForDisplay = useCallback(() => {
    logDev('ready for display');
    setIsLoading(false);
  }, []);

  const fadeAfterTimeout = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      fadeIn();
      hideControlsTimerRef.current = null;
      setIsShowingControls(false);
    }, timeToHideControls);
  }, [fadeIn, timeToHideControls]);

  const handleFullscreenChange = useCallback(
    (value: boolean) => {
      setIsFullscreen(value);
      if (value) {
        setIsShowingControls(true);
        fadeAfterTimeout();
    } else {
        fadeAfterTimeout();
      }
    },
    [fadeAfterTimeout],
  );

  const handleFullscreen = useCallback(() => {
    toggleFullscreen();
  }, [toggleFullscreen]);

  const handleBackButton = useCallback(() => {
    // Si está en fullscreen, primero salir de fullscreen
    if (playerRef.current?.isFullscreen()) {
      playerRef.current.exitFullscreen();
      return true; // Prevenir que se cierre la pantalla
    }
    
    // Si no está en fullscreen, volver atrás
    if (navigation) {
      navigation.goBack();
      return true;
    }
    return false;
  }, [navigation]);

  useFocusEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackButton,
    );
    return () => backHandler.remove();
  });

  const handlePauseAndResume = useCallback(() => {
    if (!isShowingControls) {
      return;
    }
    
    // Usar el valor actual ANTES de cambiarlo
    const willBePlaying = !isPlaying;
    setIsPlaying(willBePlaying);

    if (willBePlaying) {
      playerRef.current?.resume?.();
    } else {
      playerRef.current?.pause?.();
    }
  }, [isPlaying, isShowingControls]);

  const formatNumbers = useCallback(
    (num: number) => (num > 9 ? num.toString() : `0${num}`),
    [],
  );

  useEffect(() => {
    fadeAfterTimeout();
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
        hideControlsTimerRef.current = null;
      }
    };
  }, [fadeAfterTimeout]);

  const onProgress = useCallback(
    (data: OnProgressData) => {
    setCurrentTime(data.currentTime);

    const time = data.currentTime;
    const h = Math.floor(time / 3600);
    const m = Math.floor(time / 60) - h * 3600;
    const s = Math.floor(time) - m * 60;

    setHours(formatNumbers(h));
    setMinutes(formatNumbers(m));
    setSeconds(formatNumbers(s));

    // play in loop from start to playUntilSecond
    if (playUntilSecond && playUntilSecond <= time) {
        playerRef.current?.seek?.(0);
    }
    },
    [formatNumbers, playUntilSecond],
    );

  const handleVideoPress = useCallback(() => {
    const show = !isShowingControls;
    setIsShowingControls(show);

    if (show) {
      fadeOut();

      fadeAfterTimeout();
    } else {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
        hideControlsTimerRef.current = null;
      }

      fadeIn();
    }
  }, [fadeAfterTimeout, fadeIn, fadeOut, isShowingControls]);

  const playerContainerStyle = useMemo(
    () => (isFullscreen ? styles.fullscreenWrapper : styles.inlineWrapper),
    [isFullscreen],
  );

  return (
    <View style={playerContainerStyle}>
      <Player
        key={videoKey}
        ref={playerRef}
        uri={stream}
        containerStyle={isFullscreen ? undefined : styles.playerContainer}
        controls={false}
        paused={!isPlaying}
        volume={initialVolume}
        resizeModeInFullscreen={fullscreenResizeMode}
        playInBackground={false}
        onProgress={onProgress}
        onLoad={handleLoad}
        onBuffer={handleBuffer}
        onError={handleError}
        onReadyForDisplay={handleReadyForDisplay}
        onFullscreenChange={handleFullscreenChange}
      />
      {(isLoading || isBuffering) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>
            {isBuffering ? 'Cargando...' : 'Conectando...'}
          </Text>
        </View>
      )}
      {hasError && retryCount >= 3 && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error al cargar el streaming</Text>
          <Text style={styles.errorSubtext}>
            Verifica tu conexión a internet
          </Text>
        </View>
      )}
      {showControls && (
        <Pressable style={styles.overlayControls} onPress={handleVideoPress}>
          {_data => (
            <Animated.View
              style={[styles.controlsWrapper, {opacity: opacityValue}]}>
              <LinearGradient
                colors={['transparent', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.9)']}
                style={styles.controlsContainer}>
                <Pressable style={styles.backButton} onPress={handleBackButton}>
                  {({pressed}) => (
                    <>
                      <BackArrowIcon
                        accessibilityLabel="Atrás"
                        width={11}
                        height={15}
                        fill={pressed ? colors.tintMuted : 'white'}
                        scaleX={pressed ? 0.75 : 1}
                        scaleY={pressed ? 0.75 : 1}
                      />
                    </>
                  )}
                </Pressable>
                <View style={styles.playPauseContainer}>
                  <Pressable onPress={handlePauseAndResume}>
                    {({pressed}) =>
                      isPlaying ? (
                        <TouchableIcon
                          Icon={PauseIcon}
                          pressed={pressed}
                          style={{width: 24, height: 24}}
                        />
                      ) : (
                        <TouchableIcon
                          Icon={ResumeIcon}
                          pressed={pressed}
                          style={{width: 32, height: 32}}
                        />
                      )
                    }
                  </Pressable>
                </View>
                <View style={styles.bottomControls}>
                  <View style={styles.infoContainer}>
                    <View style={styles.info}>
                      <Text style={styles.record}>���</Text>
                      <Text style={styles.text}>
                        {hours}:{minutes}:{seconds}
                      </Text>
                    </View>
                    <View style={styles.info}>
                      <EyeIcon />
                      <Text style={styles.text}>{viewers}</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={handleFullscreen}
                    style={styles.fullscreenButton}>
                    {({pressed}) => (
                      <TouchableIcon Icon={FullscreenIcon} pressed={pressed} />
                    )}
                  </Pressable>
                </View>
              </LinearGradient>
            </Animated.View>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inlineWrapper: {
    height: 200,
    width: '100%',
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  fullscreenWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  playerContainer: {
    height: '100%',
  },
  overlayControls: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsContainer: {
    flex: 1,
    width: '100%',
    paddingBottom: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  playPauseContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControls: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  record: {
    color: colors.danger,
    transform: [{scale: 2.5}],
  },
  text: {
    color: 'white',
    fontSize: 12,
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullscreenButton: {
    width: 24,
    height: 24,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    color: colors.tintMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default StreamPlayer;
