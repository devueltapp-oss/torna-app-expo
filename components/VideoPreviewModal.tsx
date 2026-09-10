import React from 'react';
import {
  Modal, View, Text, Pressable, Platform, ActivityIndicator,
  FlatList, TextInput, KeyboardAvoidingView, Keyboard, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
 * Piso del cluster de like/comentarios (2026-09-10): tiene que quedar SIEMPRE
 * arriba del bloque de título+barra de progreso+tiempo, que ancla en
 * `bottom: 76 + insets.bottom` y crece hacia arriba con su contenido (título
 * opcional + barra de 4px + tiempo, con gaps de 8 ≈ 60px en el caso más alto,
 * con título). `76 (el mismo offset del bloque) + 60 (su alto) + 16 (margen)`.
 * Igual que ese bloque, suma `insets.bottom` — así los dos escalan juntos en
 * cualquier tamaño de pantalla y nunca se pisan.
 */
const BUTTONS_BASE = 76 + 60 + 16;

/**
 * Modal de reproducción de un highlight. Carga la URL (MP4 o HLS) con expo-av y
 * abre **siempre en pantalla completa in-app**, con los controles y —si
 * `showComments`— el panel de comentarios superpuestos al video.
 */
/** Burbuja de un comentario (raíz o respuesta) con acción "Responder". */
function CommentBubble({
  row, colors, isDark, onReply, size = 'md',
}: {
  row: CommentRow;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
  onReply: () => void;
  size?: 'sm' | 'md';
}) {
  const av = size === 'sm' ? 28 : 34;
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {/* Ícono de "perfil vacío" del comentario: fondo `colors.bg` en oscuro,
          NO `colors.ink` (navy invariante por tema) — ver el comentario
          equivalente en ChatsInboxScreen.tsx (2026-09-09). */}
      <View style={{
        width: av, height: av, borderRadius: av / 2,
        backgroundColor: isDark ? colors.bg : colors.ink,
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
  const { colors, isDark } = useTheme();
  // Mismo patrón que el visor de streaming (`GameDetailScreen`): el `SafeAreaView`
  // de este modal usa `edges={[]}` a propósito (el video llega hasta el borde real
  // de la pantalla), así que la X, el título y los controles necesitan sumar los
  // insets a mano en vez de depender del `SafeAreaView`.
  const insets = useSafeAreaInsets();
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
      // Likes SIEMPRE que haya highlightId (2026-09-10: antes solo se cargaban
      // con `showComments`, así que el corazón flotante — que ahora es
      // independiente del panel de comentarios — arrancaba en 0/sin likear
      // aunque el highlight ya tuviera likes). Comentarios + descripción solo
      // si además `showComments`.
      if (highlightId) {
        let cancelled = false;
        fetchHighlightDetail(highlightId)
          .then((d) => {
            if (cancelled) return;
            setLikesCount(d.likesCount);
            setIsLiked(d.isLikedByMe);
            if (showComments) {
              setComments(d.comments.map(mapComment));
              setDescription(d.description ?? null);
            }
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

  // Corazón grande que aparece un instante al doble-tap sobre el video —
  // mismo tratamiento que en el feed (components/cards.tsx → FeedPost).
  const heartBurst = React.useRef(new Animated.Value(0)).current;
  function burstHeart() {
    heartBurst.stopAnimation();
    heartBurst.setValue(0);
    Animated.sequence([
      Animated.spring(heartBurst, { toValue: 1, useNativeDriver: true, friction: 4, tension: 140 }),
      Animated.delay(350),
      Animated.timing(heartBurst, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }

  /**
   * Doble tap → like (2026-09-10). Igual que Instagram: solo AGREGA el like
   * (nunca lo saca) — para sacarlo está el corazón flotante, que sí togglea.
   */
  function handleDoubleTapLike() {
    if (!isLikedRef.current) toggleLikeRef.current();
    burstHeart();
  }

  /**
   * Gestos sobre el video (2026-09-04): un toque simple pausa/reanuda
   * (`togglePlay`), y un swipe RÁPIDO de derecha a izquierda cierra el
   * modal — el mismo gesto de "volver" que la X de arriba, disponible en toda la
   * superficie del video, igual que en el visor de streaming (`GameDetailScreen`).
   * Se arma una sola vez (`useMemo` sin deps); los refs puentean la versión
   * vigente de `togglePlay`/`onClose`/`toggleLike` para no recrear el detector
   * en cada render.
   *
   * ⚠️ 2026-09-10: se suma el doble tap → like. `Gesture.Exclusive(doubleTap,
   * singleTap)` (RNGH) hace que el tap simple espere a que el de doble falle
   * antes de disparar — la única forma de distinguirlos sobre la misma
   * superficie. Le agrega ~300ms de latencia al pausar con un toque, el mismo
   * costo que paga cualquier video con doble-tap-para-like (Instagram incluido).
   */
  const togglePlayRef = React.useRef(togglePlay);
  React.useEffect(() => { togglePlayRef.current = togglePlay; });
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const isLikedRef = React.useRef(isLiked);
  React.useEffect(() => { isLikedRef.current = isLiked; }, [isLiked]);
  const toggleLikeRef = React.useRef<() => void>(() => {});
  React.useEffect(() => { toggleLikeRef.current = toggleLike; });

  const videoGestures = React.useMemo(() => {
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(250)
      .onEnd((_e, ok) => { if (ok) handleDoubleTapLike(); });

    const singleTap = Gesture.Tap()
      .maxDuration(250)
      .onEnd((_e, ok) => { if (ok) togglePlayRef.current(); });

    const tap = Gesture.Exclusive(doubleTap, singleTap);

    const swipeClose = Gesture.Pan()
      .onEnd((e) => {
        if (e.translationX < -70 && e.velocityX < -600 && Math.abs(e.translationY) < 60) {
          onCloseRef.current();
        }
      });

    return Gesture.Simultaneous(tap, swipeClose);
  }, []);

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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
        keyboardDismissMode="on-drag"
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
              isDark={isDark}
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
                    isDark={isDark}
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
          {/* `GestureDetector` y no `Pressable`: además del toque simple (pausa/
              reanuda, `togglePlay`), esta superficie reconoce el swipe rápido de
              derecha a izquierda que cierra el modal — ver `videoGestures`. */}
          <GestureDetector gesture={videoGestures}>
          <View style={{ width: '100%', height: '100%' }}>
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
              ninguna señal de que el toque hizo algo. Va DENTRO del detector de
              gestos y con `pointerEvents="none"` para que el toque siga llegando
              al video y reanude.
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

            {/* Corazón del doble-tap (2026-09-10) — mismo tratamiento que el feed. */}
            <Animated.View pointerEvents="none" style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center',
              opacity: heartBurst,
              transform: [{ scale: heartBurst.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.15] }) }],
            }}>
              <Heart size={110} color="#FFFFFF" fill="#FFFFFF" style={{ opacity: 0.95 }}/>
            </Animated.View>
          </View>
          </GestureDetector>
          {isBuffering && (
            <ActivityIndicator
              size="large"
              color="#BFFE3D"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }] }}
            />
          )}

          {/* Overlays sobre el video */}
          <>
              {/* Cerrar (arriba-izquierda). Antes acá vivía también el título, pero
                  en iPhone quedaba debajo del notch/cámara — se movió abajo, junto
                  a los controles (ver el bloque de progreso). `top` suma
                  `insets.top` a mano: este `SafeAreaView` usa `edges={[]}` a
                  propósito (el video llega hasta el borde real de la pantalla), así
                  que sin el inset la X quedaba pegada a la hora del status bar. */}
              <View style={{
                position: 'absolute', top: 14 + insets.top, left: 14, right: 14,
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
              </View>

              {/*
                Título + barra de progreso + tiempo, sobre el video, cerca de los
                controles de abajo. El título vivía arriba, al lado de la X, pero en
                iPhone el notch/cámara se lo comía; bajarlo hasta acá lo saca de esa
                zona. `bottom` suma `insets.bottom`, el MISMO margen de safe-area que
                usa el visor de streaming (`bottomInset` en `GameDetailScreen`) para
                anclar sus controles — mismo motivo: este modal también usa
                `edges={[]}`, así que el borde inferior real (home indicator) no
                está reservado por el `SafeAreaView`. Se oculta con el panel de
                comentarios abierto (queda tapado) y con el teclado.
              */}
              {!showCommentsPanel && !kbVisible && (
                <View style={{
                  position: 'absolute', left: 16, right: 16, bottom: 76 + insets.bottom, gap: 8,
                }}>
                  {!!title && (
                    <Text
                      numberOfLines={1}
                      style={{
                        color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14,
                        textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4,
                      }}>
                      {title}
                    </Text>
                  )}
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

              {/* Botón flotante de like (2026-09-10) — antes el corazón vivía
                  SOLO adentro del panel de comentarios: había que abrirlo para
                  poder likear. Ahora es independiente y siempre visible,
                  arriba del botón de comentarios cuando ambos están.
                  ⚠️ **Arriba de la barra de progreso, siempre** (2026-09-10):
                  el bloque de título+progreso+tiempo ancla en
                  `bottom: 76 + insets.bottom` y crece hacia arriba con su
                  contenido (título opcional + barra + tiempo ≈ 60px). El
                  cluster de like/comentarios usaba un `bottom` fijo (20/74)
                  que no sumaba `insets.bottom`: en dispositivos con poco o
                  ningún inset inferior (Android, iPhone sin notch) los rangos
                  se pisaban y los botones quedaban tapando la barra en vez de
                  arriba de ella. `BUTTONS_BASE` reserva ese mismo alto
                  (76 + ~60 de contenido + 16 de margen) y suma `insets.bottom`
                  igual que la barra, para que los dos bloques escalen juntos
                  en cualquier tamaño de pantalla. */}
              {!!highlightId && !showCommentsPanel && (
                <Pressable
                  onPress={toggleLike}
                  hitSlop={8}
                  style={{
                    position: 'absolute',
                    // Apilado arriba del botón de comentarios cuando los dos existen.
                    bottom: (showComments ? BUTTONS_BASE + 54 : BUTTONS_BASE) + insets.bottom,
                    right: 16,
                    flexDirection: 'row', alignItems: 'center', gap: 7,
                    backgroundColor: 'rgba(0,0,0,0.62)',
                    paddingHorizontal: 15, paddingVertical: 11, borderRadius: 24,
                  }}>
                  <Heart
                    size={18}
                    color={isLiked ? colors.live : '#FFFFFF'}
                    fill={isLiked ? colors.live : 'none'}
                  />
                  <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 }}>
                    {likesCount}
                  </Text>
                </Pressable>
              )}

              {/* Botón flotante "Comentarios (N)" (abajo derecha) */}
              {showComments && !showCommentsPanel && (
                <Pressable
                  onPress={() => setShowCommentsPanel(true)}
                  style={{
                    position: 'absolute', bottom: BUTTONS_BASE + insets.bottom, right: 16,
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
