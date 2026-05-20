import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useTheme } from '../../../theme';

export interface PlayerHandle {
  seek: (sec: number) => void;
  pause: () => void;
  resume: () => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
}

export interface PlayerProps {
  recordingUrl: string;
  durationSeconds: number;
  startAt?: number;
  endAt?: number;
  autoPlay?: boolean;
  label?: string;
  onProgress?: (currentTime: number) => void;
  onLoad?: (duration: number) => void;
  onBuffer?: (isBuffering: boolean) => void;
}

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export const Player = React.forwardRef<PlayerHandle, PlayerProps>(function Player(props, ref) {
  const { colors } = useTheme();
  const {
    recordingUrl, durationSeconds, startAt = 0, endAt,
    autoPlay = false, label, onProgress, onLoad, onBuffer,
  } = props;

  const videoRef = React.useRef<Video>(null);
  const [isPlaying, setIsPlaying] = React.useState(autoPlay);
  const [positionSec, setPositionSec] = React.useState(startAt);
  const [totalSec, setTotalSec] = React.useState(durationSeconds);

  const upper = endAt ?? totalSec;

  React.useImperativeHandle(ref, () => ({
    seek: (sec) => videoRef.current?.setPositionAsync(sec * 1000),
    pause: () => videoRef.current?.pauseAsync(),
    resume: () => videoRef.current?.playAsync(),
    enterFullscreen: () => videoRef.current?.presentFullscreenPlayer(),
    exitFullscreen: () => videoRef.current?.dismissFullscreenPlayer(),
  }), []);

  function handleStatus(status: AVPlaybackStatus) {
    if (!status.isLoaded) {
      onBuffer?.(true);
      return;
    }
    onBuffer?.(false);
    setIsPlaying(status.isPlaying);

    const posSec = status.positionMillis / 1000;
    setPositionSec(posSec);
    onProgress?.(posSec);

    if (status.durationMillis) {
      const dur = status.durationMillis / 1000;
      setTotalSec(dur);
      onLoad?.(dur);
    }
  }

  function togglePlay() {
    if (isPlaying) {
      videoRef.current?.pauseAsync();
    } else {
      videoRef.current?.playAsync();
    }
  }

  const pct = upper > startAt ? Math.min(1, (positionSec - startAt) / (upper - startAt)) : 0;

  return (
    <View style={{
      aspectRatio: 16 / 9, borderRadius: 18, overflow: 'hidden',
      backgroundColor: colors.ink2, borderWidth: 1, borderColor: colors.line,
    }}>
      <Video
        ref={videoRef}
        source={{ uri: recordingUrl }}
        style={{ width: '100%', height: '100%' }}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={autoPlay}
        isLooping={false}
        isMuted={false}
        useNativeControls={false}
        onPlaybackStatusUpdate={handleStatus}
      />

      {label ? (
        <View style={{
          position: 'absolute', top: 10, left: 12,
          paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
          backgroundColor: 'rgba(45,76,117,0.7)',
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>{label}</Text>
        </View>
      ) : null}

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, gap: 8 }}>
        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: colors.accent }}/>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={togglePlay}
            style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
            }}>
            {isPlaying ? (
              <View style={{ flexDirection: 'row', gap: 3 }}>
                <View style={{ width: 3, height: 12, backgroundColor: colors.ink }}/>
                <View style={{ width: 3, height: 12, backgroundColor: colors.ink }}/>
              </View>
            ) : (
              <View style={{
                width: 0, height: 0, marginLeft: 2,
                borderLeftWidth: 9, borderLeftColor: colors.ink,
                borderTopWidth: 6, borderTopColor: 'transparent',
                borderBottomWidth: 6, borderBottomColor: 'transparent',
              }}/>
            )}
          </Pressable>
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', fontFamily: 'Menlo' }}>
            {fmt(positionSec)} / {fmt(upper)}
          </Text>
        </View>
      </View>
    </View>
  );
});
