import React from 'react';
import { Modal, View, Text, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Maximize2 } from 'lucide-react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useTheme } from '../theme';

export interface VideoPreviewModalProps {
  visible: boolean;
  url: string;
  title: string;
  durationSeconds: number;
  onClose: () => void;
}

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/**
 * Modal de preview de video. Carga la URL (MP4 o HLS) con expo-av y
 * expone un botón de pantalla completa via presentFullscreenPlayer().
 *
 * NOTA: presentFullscreenPlayer() puede no funcionar en el emulador
 * Android — usar dispositivo real para probar esta funcionalidad.
 */
export function VideoPreviewModal({
  visible, url, title, durationSeconds, onClose,
}: VideoPreviewModalProps) {
  const { colors } = useTheme();
  const videoRef = React.useRef<Video>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [positionSec, setPositionSec] = React.useState(0);
  const [totalSec, setTotalSec] = React.useState(durationSeconds);

  React.useEffect(() => {
    if (visible) {
      setPositionSec(0);
      setIsPlaying(false);
    }
  }, [visible]);

  function handleStatus(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setPositionSec(status.positionMillis / 1000);
    if (status.durationMillis) setTotalSec(status.durationMillis / 1000);
  }

  function togglePlay() {
    if (isPlaying) videoRef.current?.pauseAsync();
    else videoRef.current?.playAsync();
  }

  const pct = totalSec > 0 ? Math.min(1, positionSec / totalSec) : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 12, gap: 12,
        }}>
          <Pressable
            onPress={onClose}
            style={{
              width: 36, height: 36, borderRadius: 12,
              backgroundColor: colors.bg2,
              alignItems: 'center', justifyContent: 'center',
            }}>
            <X size={20} color={colors.text}/>
          </Pressable>
          <Text
            style={{ flex: 1, fontSize: 14, fontWeight: '800', color: colors.text }}
            numberOfLines={1}>
            {title || 'Video'}
          </Text>
        </View>

        {/* Video */}
        <View style={{ backgroundColor: '#000000', aspectRatio: 16 / 9 }}>
          {visible && url ? (
            <Video
              ref={videoRef}
              source={{ uri: url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              isLooping={false}
              isMuted={false}
              useNativeControls={false}
              onPlaybackStatusUpdate={handleStatus}
            />
          ) : null}
        </View>

        {/* Controles */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>

          {/* Barra de progreso */}
          <View style={{ height: 4, backgroundColor: colors.line, borderRadius: 2 }}>
            <View style={{
              width: `${pct * 100}%`, height: '100%',
              backgroundColor: colors.accent, borderRadius: 2,
            }}/>
          </View>

          {/* Fila de controles */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>

            {/* Play / Pause */}
            <Pressable
              onPress={togglePlay}
              style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: colors.accent,
                alignItems: 'center', justifyContent: 'center',
              }}>
              {isPlaying ? (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ width: 4, height: 16, backgroundColor: colors.ink, borderRadius: 2 }}/>
                  <View style={{ width: 4, height: 16, backgroundColor: colors.ink, borderRadius: 2 }}/>
                </View>
              ) : (
                <View style={{
                  width: 0, height: 0, marginLeft: 3,
                  borderLeftWidth: 14, borderLeftColor: colors.ink,
                  borderTopWidth: 9, borderTopColor: 'transparent',
                  borderBottomWidth: 9, borderBottomColor: 'transparent',
                }}/>
              )}
            </Pressable>

            {/* Tiempo */}
            <Text style={{
              flex: 1, color: colors.muted2, fontSize: 13, fontFamily: 'Menlo',
            }}>
              {fmt(positionSec)} / {fmt(totalSec)}
            </Text>

            {/* Pantalla completa */}
            <Pressable
              onPress={() => videoRef.current?.presentFullscreenPlayer()}
              style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: colors.bg2,
                alignItems: 'center', justifyContent: 'center',
              }}>
              <Maximize2 size={20} color={colors.text}/>
            </Pressable>
          </View>

          {__DEV__ && (
            <Text style={{ fontSize: 10, color: colors.muted2, textAlign: 'center' }}>
              Pantalla completa puede no funcionar en el emulador — usar dispositivo real.
            </Text>
          )}
        </View>

      </SafeAreaView>
    </Modal>
  );
}
