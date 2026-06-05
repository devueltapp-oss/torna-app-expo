import React from 'react';
import {
  Modal, View, Text, Pressable, Platform, ActivityIndicator,
  FlatList, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Maximize2, MessageCircle, Send } from 'lucide-react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';

export interface VideoPreviewModalProps {
  visible: boolean;
  url: string;
  title: string;
  durationSeconds: number;
  onClose: () => void;
  autoFullscreen?: boolean;
  showComments?: boolean;
}

interface Comment { id: string; user: string; text: string; time: string; }

const INITIAL_COMMENTS: Comment[] = [
  { id: '1', user: 'carlos_padel', text: '¡Qué punto! Tremendo nivel 🔥', time: '2m' },
  { id: '2', user: 'marta.rq',     text: 'El remate desde el fondo fue increíble', time: '5m' },
  { id: '3', user: 'padelero92',   text: 'Clase de juego, lo vi tres veces', time: '12m' },
];

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/**
 * Modal de preview de video. Carga la URL (MP4 o HLS) con expo-av.
 * Con `showComments` activa la sección de comentarios debajo del player.
 *
 * NOTA: presentFullscreenPlayer() puede no funcionar en el emulador
 * Android — usar dispositivo real para probar esta funcionalidad.
 */
export function VideoPreviewModal({
  visible, url, title, durationSeconds, onClose, autoFullscreen, showComments = false,
}: VideoPreviewModalProps) {
  const { colors } = useTheme();
  const videoRef = React.useRef<Video>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [positionSec, setPositionSec] = React.useState(0);
  const [totalSec, setTotalSec] = React.useState(durationSeconds);
  const hasAutoFullscreened = React.useRef(false);
  const [comments, setComments] = React.useState<Comment[]>(INITIAL_COMMENTS);
  const [commentText, setCommentText] = React.useState('');

  React.useEffect(() => {
    if (visible) {
      setPositionSec(0);
      setIsPlaying(false);
      setComments(INITIAL_COMMENTS);
      setCommentText('');
    } else {
      hasAutoFullscreened.current = false;
    }
  }, [visible]);

  function handleStatus(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    setIsBuffering(status.isBuffering ?? false);
    setPositionSec(status.positionMillis / 1000);
    if (status.durationMillis) {
      setTotalSec(status.durationMillis / 1000);
      if (autoFullscreen && !hasAutoFullscreened.current) {
        hasAutoFullscreened.current = true;
        setTimeout(() => videoRef.current?.presentFullscreenPlayer(), 400);
      }
    }
  }

  function togglePlay() {
    if (isPlaying) videoRef.current?.pauseAsync();
    else videoRef.current?.playAsync();
  }

  function sendComment() {
    if (!commentText.trim()) return;
    setComments(prev => [{
      id: Date.now().toString(),
      user: 'vos',
      text: commentText.trim(),
      time: 'Ahora',
    }, ...prev]);
    setCommentText('');
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
          {isBuffering && (
            <ActivityIndicator
              size="large"
              color="#D6FF7E"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }] }}
            />
          )}
        </View>

        {/* Controles */}
        <View style={{
          paddingHorizontal: 16, paddingTop: 14,
          paddingBottom: showComments ? 10 : 24,
          gap: 12,
        }}>
          {/* Barra de progreso */}
          <View style={{ height: 4, backgroundColor: colors.line, borderRadius: 2 }}>
            <View style={{
              width: `${pct * 100}%`, height: '100%',
              backgroundColor: colors.accent, borderRadius: 2,
            }}/>
          </View>

          {/* Fila de controles */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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

            <Text style={{
              flex: 1, color: colors.muted2, fontSize: 13, fontFamily: fonts.mono,
            }}>
              {fmt(positionSec)} / {fmt(totalSec)}
            </Text>

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

          {__DEV__ && !showComments && (
            <Text style={{ fontSize: 10, color: colors.muted2, textAlign: 'center' }}>
              Pantalla completa puede no funcionar en el emulador — usar dispositivo real.
            </Text>
          )}
        </View>

        {/* ── Sección de comentarios ── */}
        {showComments && (
          <>
            {/* Contador */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 16, paddingVertical: 10,
              borderTopWidth: 1, borderTopColor: colors.line,
            }}>
              <MessageCircle size={14} color={colors.muted2}/>
              <Text style={{
                color: colors.muted2, fontSize: 12,
                fontFamily: fonts.bold,
              }}>
                {comments.length} comentario{comments.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Lista */}
            <FlatList
              style={{ flex: 1 }}
              data={comments}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 18 }}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{
                    width: 34, height: 34, borderRadius: 17,
                    backgroundColor: colors.ink,
                    alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 13 }}>
                      {item.user.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 13 }}>
                        {item.user}
                      </Text>
                      <Text style={{ color: colors.muted2, fontSize: 11, fontFamily: fonts.regular }}>
                        {item.time}
                      </Text>
                    </View>
                    <Text style={{
                      color: colors.text, fontFamily: fonts.regular,
                      fontSize: 14, lineHeight: 20,
                    }}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              )}
            />

            {/* Input */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingHorizontal: 16, paddingVertical: 12,
                borderTopWidth: 1, borderTopColor: colors.line,
              }}>
                <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Escribe un comentario..."
                  placeholderTextColor={colors.muted2}
                  returnKeyType="send"
                  onSubmitEditing={sendComment}
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    paddingHorizontal: 14, paddingVertical: 10,
                    color: colors.text,
                    fontFamily: fonts.regular,
                    fontSize: 14,
                    borderWidth: 1, borderColor: colors.line,
                  }}
                />
                <Pressable
                  onPress={sendComment}
                  disabled={!commentText.trim()}
                  style={{
                    width: 42, height: 42, borderRadius: 12,
                    backgroundColor: commentText.trim() ? colors.accent : colors.line,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Send size={18} color={commentText.trim() ? colors.ink : colors.muted2}/>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </>
        )}

      </SafeAreaView>
    </Modal>
  );
}
