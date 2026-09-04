import React from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Maximize2 } from 'lucide-react-native';
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
  muted?: boolean;
  label?: string;
  onProgress?: (currentTime: number) => void;
  onLoad?: (duration: number) => void;
  onBuffer?: (isBuffering: boolean) => void;
  hideControls?: boolean;
  fullscreen?: boolean;
  renderOverlay?: () => React.ReactNode;
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
    autoPlay = false, muted = false, label, onProgress, onLoad, onBuffer,
    hideControls = false, fullscreen = false, renderOverlay,
  } = props;

  // expo-video (SDK 55). El player se crea una vez; arranca en `startAt` y solo
  // reproduce si `autoPlay`. La instancia nativa se vuelve a crear si cambia
  // `recordingUrl` (el hook llama `replace` solo).
  const viewRef = React.useRef<VideoView>(null);
  const player = useVideoPlayer(recordingUrl, (p) => {
    p.muted = muted;
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
    p.currentTime = startAt;
    if (autoPlay) p.play();
  });
  const [isPlaying, setIsPlaying] = React.useState(autoPlay);
  const [positionSec, setPositionSec] = React.useState(startAt);
  const [totalSec, setTotalSec] = React.useState(durationSeconds);

  const upper = endAt ?? totalSec;

  React.useImperativeHandle(ref, () => ({
    seek: (sec) => { player.currentTime = sec; },
    pause: () => player.pause(),
    resume: () => player.play(),
    enterFullscreen: () => { viewRef.current?.enterFullscreen(); },
    exitFullscreen: () => { viewRef.current?.exitFullscreen(); },
  }), [player]);

  useEventListener(player, 'statusChange', ({ status }) => {
    onBuffer?.(status === 'loading');
    if (status === 'readyToPlay' && player.duration > 0) {
      setTotalSec(player.duration);
      onLoad?.(player.duration);
    }
  });
  useEventListener(player, 'playingChange', ({ isPlaying }) => setIsPlaying(isPlaying));
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    setPositionSec(currentTime);
    onProgress?.(currentTime);
    // Loop del rango [startAt, endAt]: al llegar al fin vuelve al inicio y para.
    if (endAt !== undefined && player.playing && currentTime >= endAt) {
      player.pause();
      player.currentTime = startAt;
    }
  });

  function togglePlay() {
    if (player.playing) player.pause();
    else player.play();
  }

  const pct = upper > startAt ? Math.min(1, (positionSec - startAt) / (upper - startAt)) : 0;

  return (
    <View style={fullscreen ? { flex: 1, overflow: 'hidden', backgroundColor: '#000' } : {
      aspectRatio: 16 / 9, borderRadius: 18, overflow: 'hidden',
      backgroundColor: colors.ink2, borderWidth: 1, borderColor: colors.line,
    }}>
      <VideoView
        ref={viewRef}
        player={player}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
        nativeControls={false}
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

      {!hideControls && (
        <TouchableOpacity
          onPress={() => viewRef.current?.enterFullscreen()}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(0,0,0,0.50)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Maximize2 size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {renderOverlay?.()}

      {!hideControls && (
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
      )}
    </View>
  );
});
