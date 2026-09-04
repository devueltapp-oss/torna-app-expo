import React from 'react';
import {
  Modal, View, Text, Pressable, Platform, ActivityIndicator,
  FlatList, TextInput, KeyboardAvoidingView, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, MessageCircle, Send, Heart } from 'lucide-react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import {
  fetchHighlightDetail, toggleHighlightLike, addHighlightComment,
  type HighlightComment,
} from '../api/highlights';

export interface VideoPreviewModalProps {
  visible: boolean;
  url: string;
  title: string;
  durationSeconds: number;
  onClose: () => void;
  showComments?: boolean;
  /** Id del highlight: habilita likes y comentarios reales (GET /highlights/:id). */
  highlightId?: string;
}

/** Fila de comentario ya mapeada para render. */
interface CommentRow {
  id: string;
  user: string;
  text: string;
  time: string;
  parentId: string | null;
}

function mapComment(c: HighlightComment): CommentRow {
  return {
    id: c.id,
    user: c.name ?? c.username,
    text: c.content,
    time: relativeTime(c.createdAt),
    parentId: c.parentId ?? null,
  };
}

/** Comentario raíz con sus respuestas anidadas (formato thread). */
interface CommentThread extends CommentRow {
  replies: CommentRow[];
}

/**
 * Agrupa una lista plana de comentarios en threads: cada raíz (parentId=null)
 * con sus respuestas ordenadas por antigüedad. Las respuestas huérfanas (padre
 * borrado/ausente) se muestran como raíces para no perderlas.
 */
function buildThreads(rows: CommentRow[]): CommentThread[] {
  const roots: CommentThread[] = [];
  const byId = new Map<string, CommentThread>();
  for (const r of rows) {
    if (!r.parentId) {
      const t = { ...r, replies: [] as CommentRow[] };
      byId.set(r.id, t);
      roots.push(t);
    }
  }
  for (const r of rows) {
    if (r.parentId) {
      const parent = byId.get(r.parentId);
      if (parent) parent.replies.push(r);
      else roots.push({ ...r, replies: [] }); // huérfano → raíz
    }
  }
  return roots;
}

/** ISO → etiqueta corta relativa ("Ahora", "5m", "3h", "2d", o fecha). */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(then).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/**
 * Modal de reproducción de un highlight. Carga la URL (MP4 o HLS) con expo-av y
 * abre **siempre en pantalla completa in-app**, con los controles y —si
 * `showComments`— el panel de comentarios superpuestos al video.
 */
/** Burbuja de un comentario (raíz o respuesta) con acción "Responder". */
function CommentBubble({
  row, colors, onReply, size = 'md',
}: {
  row: CommentRow;
  colors: ReturnType<typeof useTheme>['colors'];
  onReply: () => void;
  size?: 'sm' | 'md';
}) {
  const av = size === 'sm' ? 28 : 34;
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{
        width: av, height: av, borderRadius: av / 2,
        backgroundColor: colors.ink,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: size === 'sm' ? 11 : 13 }}>
          {row.user.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 13 }}>
            {row.user}
          </Text>
          <Text style={{ color: colors.muted2, fontSize: 11, fontFamily: fonts.regular }}>
            {row.time}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
          {row.text}
        </Text>
        <Pressable onPress={onReply} hitSlop={6} style={{ alignSelf: 'flex-start', paddingTop: 2 }}>
          <Text style={{ color: colors.muted2, fontSize: 12, fontFamily: fonts.bold }}>
            Responder
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function VideoPreviewModal({
  visible, url, title, durationSeconds, onClose, showComments = false,
  highlightId,
}: VideoPreviewModalProps) {
  const { colors } = useTheme();
  // `expo-video` (SDK 55, reemplaza a `expo-av`): el player se crea con el hook y no
  // arranca solo (era `shouldPlay={false}`). Fuente `null` mientras el modal está
  // cerrado para no tener un player vivo de fondo.
  const player = useVideoPlayer(visible && url ? url : null, (p) => {
    p.muted = false;
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
  });
  // Ancho medido de la barra de progreso, para traducir un tap (locationX) → fracción.
  const seekBarWidth = React.useRef(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const [positionSec, setPositionSec] = React.useState(0);
  const [totalSec, setTotalSec] = React.useState(durationSeconds);
  const [comments, setComments] = React.useState<CommentRow[]>([]);
  const [commentText, setCommentText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [likesCount, setLikesCount] = React.useState(0);
  const [isLiked, setIsLiked] = React.useState(false);
  const [description, setDescription] = React.useState<string | null>(null);
  // Comentario al que se está respondiendo (thread). null = comentario raíz.
  const [replyingTo, setReplyingTo] = React.useState<{ id: string; user: string } | null>(null);
  const [showCommentsPanel, setShowCommentsPanel] = React.useState(false);
  // Teclado abierto: se usa para apartar los controles de abajo mientras se escribe.
  const [kbVisible, setKbVisible] = React.useState(false);

  const threads = React.useMemo(() => buildThreads(comments), [comments]);

  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  React.useEffect(() => {
    if (visible) {
      setPositionSec(0);
      setIsPlaying(false);
      try { player.currentTime = 0; } catch { /* aún sin fuente */ }
      setCommentText('');
      setComments([]);
      setLikesCount(0);
      setIsLiked(false);
      setDescription(null);
      setReplyingTo(null);
      setShowCommentsPanel(false);
      setKbVisible(false);
      // Comentarios + likes + descripción reales del highlight (si hay highlightId).
      if (highlightId && showComments) {
        let cancelled = false;
        fetchHighlightDetail(highlightId)
          .then((d) => {
            if (cancelled) return;
            setComments(d.comments.map(mapComment));
            setLikesCount(d.likesCount);
            setIsLiked(d.isLikedByMe);
            setDescription(d.description ?? null);
          })
          .catch(() => { /* sin datos → estado vacío, sin mock */ });
        return () => { cancelled = true; };
      }
    }
  }, [visible, highlightId, showComments]);

  async function toggleLike() {
    if (!highlightId) return;
    const prevLiked = isLiked;
    const prevCount = likesCount;
    // Optimista
    setIsLiked(!prevLiked);
    setLikesCount(prevCount + (prevLiked ? -1 : 1));
    try {
      const res = await toggleHighlightLike(highlightId);
      setIsLiked(res.liked);
      setLikesCount(res.likesCount);
    } catch {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  }

  // Estado del player vía eventos de expo-video (antes: `onPlaybackStatusUpdate`).
  // ⚠️ Nada de pantalla completa NATIVA acá: rota a horizontal y no admite superponer
  // el panel de comentarios. Este modal ya abre en completa in-app, la que sirve para
  // un vertical.
  useEventListener(player, 'playingChange', ({ isPlaying }) => setIsPlaying(isPlaying));
  useEventListener(player, 'statusChange', ({ status }) => {
    setIsBuffering(status === 'loading');
    if (status === 'readyToPlay' && player.duration > 0) setTotalSec(player.duration);
  });
  useEventListener(player, 'timeUpdate', ({ currentTime }) => setPositionSec(currentTime));

  function togglePlay() {
    if (player.playing) player.pause();
    else player.play();
  }

  /** Salta a una posición del video (0–1 del total) tras tocar la barra de progreso. */
  function seekToFraction(frac: number) {
    if (totalSec <= 0) return;
    const clamped = Math.max(0, Math.min(1, frac));
    setPositionSec(clamped * totalSec); // feedback inmediato de la UI
    try {
      player.currentTime = clamped * totalSec;
    } catch { /* video aún no cargado → ignorar */ }
  }

  async function sendComment() {
    const text = commentText.trim();
    if (!text || sending || !highlightId) return;
    const parentId = replyingTo?.id;
    setSending(true);
    setCommentText('');
    try {
      const created = await addHighlightComment(highlightId, text, parentId);
      // Append al final: las respuestas quedan bajo su raíz y los comentarios
      // raíz nuevos abajo (orden cronológico, igual que el backend).
      setComments(prev => [...prev, mapComment(created)]);
      setReplyingTo(null);
    } catch {
      // Restaurar el texto si falló, para no perder el comentario.
      setCommentText(text);
    } finally {
      setSending(false);
    }
  }

  const pct = totalSec > 0 ? Math.min(1, positionSec / totalSec) : 0;

  /** Descripción del highlight (caption). `false` si no tiene. */
  const renderDescription = () =>
    !!description && (
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
          {description}
        </Text>
      </View>
    );

  /** Barra de like + contador, lista de comentarios (threaded) y composer. Reutilizable
   *  tanto en la vista normal (bajo el video) como en el panel de pantalla completa. */
  const renderCommentSection = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {/* Like + contador de comentarios */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 16,
        paddingHorizontal: 16, paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: colors.line,
      }}>
        <Pressable
          onPress={toggleLike}
          disabled={!highlightId}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Heart
            size={16}
            color={isLiked ? colors.live : colors.muted2}
            fill={isLiked ? colors.live : 'none'}
          />
          <Text style={{ color: colors.muted2, fontSize: 12, fontFamily: fonts.bold }}>
            {likesCount}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MessageCircle size={14} color={colors.muted2}/>
          <Text style={{ color: colors.muted2, fontSize: 12, fontFamily: fonts.bold }}>
            {comments.length} comentario{comments.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Lista (threaded: raíz + respuestas anidadas) */}
      <FlatList
        style={{ flex: 1 }}
        data={threads}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 18 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={{ color: colors.muted2, fontSize: 13, paddingTop: 16, textAlign: 'center' }}>
            Sé el primero en comentar.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={{ gap: 12 }}>
            <CommentBubble
              row={item}
              colors={colors}
              onReply={() => setReplyingTo({ id: item.id, user: item.user })}
            />
            {/* Respuestas (thread), indentadas bajo la raíz */}
            {item.replies.length > 0 && (
              <View style={{ paddingLeft: 44, gap: 12 }}>
                {item.replies.map((r) => (
                  <CommentBubble
                    key={r.id}
                    row={r}
                    colors={colors}
                    size="sm"
                    onReply={() => setReplyingTo({ id: item.id, user: r.user })}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      />

      {/* Input */}
      <>
        {/* Chip "Respondiendo a X" cuando se responde en un thread */}
        {replyingTo && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 16, paddingTop: 8,
          }}>
            <Text style={{ color: colors.muted2, fontSize: 12, fontFamily: fonts.regular }}>
              Respondiendo a <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{replyingTo.user}</Text>
            </Text>
            <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
              <X size={16} color={colors.muted2}/>
            </Pressable>
          </View>
        )}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 16, paddingVertical: 12,
          borderTopWidth: 1, borderTopColor: colors.line,
        }}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={
              !highlightId ? 'Comentarios no disponibles'
                : replyingTo ? `Responder a ${replyingTo.user}...`
                : 'Escribe un comentario...'
            }
            placeholderTextColor={colors.muted2}
            editable={!!highlightId}
            returnKeyType="send"
            onSubmitEditing={sendComment}
            blurOnSubmit={false}
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
            disabled={!commentText.trim() || sending || !highlightId}
            style={{
              width: 42, height: 42, borderRadius: 12,
              backgroundColor: commentText.trim() && !sending ? colors.accent : colors.line,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Send size={18} color={commentText.trim() && !sending ? colors.ink : colors.muted2}/>
          </Pressable>
        </View>
      </>
    </KeyboardAvoidingView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {/*
        ⚠️ **Un solo modo: pantalla completa.** Un highlight es video vertical de
        consumo directo; la vista chica dejaba el clip arriba y media pantalla
        vacía en blanco. Antes se abría en completa y había un botón de
        minimizar que llevaba justo a esa vista rota — se eliminó el 2026-09-02
        junto con el modo entero (estado `expanded`, header, `Maximize2`).

        Es pantalla completa **in-app**, no `presentFullscreenPlayer`: la nativa
        rota a horizontal y no admite superponer el panel de comentarios.

        Se sale con la **X de arriba a la izquierda**, que cierra el modal.

        ⚠️ **`presentationStyle` tiene que ser `fullScreen` en LOS DOS, no
        `pageSheet` en iOS.** `pageSheet` le agrega a iOS su propio "grabber"
        (la barrita de arrastre nativa) en la franja de arriba de la hoja, que
        compite por el toque con la X (`top:14`) y con el gesto de swipe-down
        para cerrar — y ese swipe no dispara `onClose` (dispara `onDismiss`,
        que acá no estaba manejado), así que el estado del padre (`previewVideo`)
        quedaba en `true` con la hoja ya cerrada por iOS: la próxima vez que se
        tocaba un ítem de la biblioteca, `visible` pasaba de `true` a `true` y
        el modal no volvía a aparecer. Sin la X funcionando y sin back de
        hardware (eso es solo Android, vía `onRequestClose`), en iPhone no
        quedaba ninguna salida. `fullScreen` en los dos evita el grabber y el
        swipe nativo — la única salida es la X, y esa sí siempre llama a
        `onClose`. */}
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={[]}>

        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <Pressable onPress={togglePlay} style={{ width: '100%', height: '100%' }}>
            {visible && url ? (
              <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                nativeControls={false}
              />
            ) : null}

            {/*
              Ícono de play sobre el video cuando está en pausa.
              Sin esto, un video pausado se ve igual que uno trabado: no había
              ninguna señal de que el toque hizo algo. Va DENTRO del `Pressable`
              y con `pointerEvents="none"` para que el toque siga llegando al
              video y reanude.
            */}
            {!isPlaying && !isBuffering && (
              <View
                pointerEvents="none"
                testID="highlight-paused"
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <View style={{
                  width: 68, height: 68, borderRadius: 34,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* Triángulo corrido a la derecha: uno centrado por caja se ve a la izquierda. */}
                  <View style={{
                    width: 0, height: 0, marginLeft: 6,
                    borderLeftWidth: 24, borderLeftColor: '#FFFFFF',
                    borderTopWidth: 15, borderTopColor: 'transparent',
                    borderBottomWidth: 15, borderBottomColor: 'transparent',
                  }} />
                </View>
              </View>
            )}
          </Pressable>
          {isBuffering && (
            <ActivityIndicator
              size="large"
              color="#D6FF7E"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }] }}
            />
          )}

          {/* Overlays sobre el video */}
          <>
              {/* Cerrar + título (arriba). Antes acá había un "minimizar" que
                  llevaba a la vista chica; ahora se sale directo, y el título
                  viene con él porque el header donde vivía se eliminó. */}
              <View style={{
                position: 'absolute', top: 14, left: 14, right: 14,
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}>
                <Pressable
                  onPress={onClose}
                  testID="close-highlight"
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                  <X size={20} color="#FFFFFF"/>
                </Pressable>
                {!!title && (
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1, color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14,
                      textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4,
                    }}>
                    {title}
                  </Text>
                )}
              </View>

              {/*
                Barra de progreso + tiempo, sobre el video. Vivía en la vista
                chica que se eliminó; sin traerla acá, quitar el minimizar habría
                dejado el highlight **sin forma de adelantar**. Se oculta con el
                panel de comentarios abierto (queda tapada) y con el teclado.
              */}
              {!showCommentsPanel && !kbVisible && (
                <View style={{
                  position: 'absolute', left: 16, right: 16, bottom: 76, gap: 6,
                }}>
                  <Pressable
                    onLayout={(e) => { seekBarWidth.current = e.nativeEvent.layout.width; }}
                    onPress={(e) => seekToFraction(e.nativeEvent.locationX / (seekBarWidth.current || 1))}
                    hitSlop={{ top: 14, bottom: 14 }}
                    style={{
                      height: 4, backgroundColor: 'rgba(255,255,255,0.28)',
                      borderRadius: 2, justifyContent: 'center',
                    }}
                  >
                    <View style={{
                      width: `${pct * 100}%`, height: '100%',
                      backgroundColor: colors.accent, borderRadius: 2,
                    }}/>
                  </Pressable>
                  <Text style={{
                    color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: fonts.mono,
                    textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3,
                  }}>
                    {fmt(positionSec)} / {fmt(totalSec)}
                  </Text>
                </View>
              )}

              {/* Botón flotante "Comentarios (N)" (abajo derecha) */}
              {showComments && !showCommentsPanel && (
                <Pressable
                  onPress={() => setShowCommentsPanel(true)}
                  style={{
                    position: 'absolute', bottom: 20, right: 16,
                    flexDirection: 'row', alignItems: 'center', gap: 7,
                    backgroundColor: 'rgba(0,0,0,0.62)',
                    paddingHorizontal: 15, paddingVertical: 11, borderRadius: 24,
                  }}>
                  <MessageCircle size={18} color="#FFFFFF"/>
                  <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 }}>
                    {comments.length}
                  </Text>
                </Pressable>
              )}

              {/* Panel de comentarios superpuesto al video */}
              {showComments && showCommentsPanel && (
                <View style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, height: '66%',
                  backgroundColor: colors.bg,
                  borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden',
                }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingVertical: 12,
                  }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 15 }}>
                      Comentarios
                    </Text>
                    <Pressable onPress={() => setShowCommentsPanel(false)} hitSlop={8}>
                      <X size={20} color={colors.muted2}/>
                    </Pressable>
                  </View>
                  {renderDescription()}
                  {renderCommentSection()}
                </View>
              )}
            </>
        </View>

      </SafeAreaView>
    </Modal>
  );
}
