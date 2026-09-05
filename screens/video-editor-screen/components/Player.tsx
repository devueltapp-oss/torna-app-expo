import React from 'react';
import { View, Text, Pressable, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Maximize2, X } from 'lucide-react-native';
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
  // Pantalla completa IN-APP (Modal propio), no la nativa de expo-video: la nativa
  // con `nativeControls={false}` puede quedar sin forma de salir (sin botón ni back
  // de Android), así que el cierre lo controlamos nosotros — incluido el botón atrás
  // físico vía `onRequestClose` del Modal.
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const upper = endAt ?? totalSec;

  React.useImperativeHandle(ref, () => ({
    seek: (sec) => { player.currentTime = sec; },
    pause: () => player.pause(),
    resume: () => player.play(),
    enterFullscreen: () => setIsFullscreen(true),
    exitFullscreen: () => setIsFullscreen(false),
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
    // Loop del rango [startAt, endAt]: al llegar al fin vuelve al inicio y SIGUE
    // reproduciendo (antes pausaba ahí, así que el "preview" del recorte se veía
    // una sola vez y después había que arrastrar un handle para volver a verlo).
    if (endAt !== undefined && player.playing && currentTime >= endAt) {
      player.currentTime = startAt;
    }
  });

  function togglePlay() {
    if (player.playing) player.pause();
    else player.play();
  }

  const pct = upper > startAt ? Math.min(1, (positionSec - startAt) / (upper - startAt)) : 0;
  const inFullscreenView = fullscreen || isFullscreen;

  const body = (
    <View style={inFullscreenView ? { flex: 1, overflow: 'hidden', backgroundColor: '#000' } : {
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

      {/* Botón de cerrar — SOLO en el modal de pantalla completa propio. Es la
          única salida (no hay back nativo: `nativeControls={false}` lo suprime,
          y sin esto quedaba atrapado en el fullscreen sin forma de volver). */}
      {isFullscreen ? (
        <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, zIndex: 20 }}>
          <TouchableOpacity
            onPress={() => setIsFullscreen(false)}
            style={{
              margin: 10, width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center', justifyContent: 'center',
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>
      ) : (!hideControls && (
        <TouchableOpacity
          onPress={() => setIsFullscreen(true)}
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
      ))}

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

  // Modal propio en vez de VideoView.enterFullscreen(): la nativa respeta
  // `nativeControls={false}` incluso en fullscreen en algunos casos y no deja
  // ninguna forma de salir. `onRequestClose` además captura el botón atrás
  // físico de Android — sin eso, esa era otra vía sin salida.
  if (isFullscreen) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => setIsFullscreen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {body}
        </View>
      </Modal>
    );
  }

  return body;
});
