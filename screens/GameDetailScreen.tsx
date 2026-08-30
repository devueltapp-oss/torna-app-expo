/**
 * Game Detail — VIEWER mode.
 * The user is a spectator: pick a camera angle, watch the HLS stream,
 * comment on the stream, see players, follow the club. NO stream control,
 * NO BLE pairing.
 *
 * Pantalla completa: **in-app + landscape**, NO el reproductor nativo.
 * `presentFullscreenPlayer()` no puede rotar porque la app está bloqueada en
 * portrait (`app.json` → `orientation: "portrait"`), así que expandía en vertical.
 * Acá el contenedor del MISMO `<Video>` pasa de card a absolute-fill y se
 * bloquea la orientación con `expo-screen-orientation`; además así se puede
 * superponer el panel de comentarios sobre el video (el fullscreen nativo no
 * admite overlays).
 *
 * **Comentarios superpuestos en los dos modos (2026-08-29).** El mismo
 * `GameCommentsPanel variant="overlay"` se usa en landscape (columna derecha) y en
 * portrait (banda inferior del video, `PORTRAIT_COMMENTS_HEIGHT`). En portrait
 * arrancan **visibles**: antes vivían detrás de un botón que abría un `<Modal>` a
 * pantalla completa, o sea que para leer un comentario había que dejar de ver el
 * partido. El botón de la esquina ahora **oculta** (no abre), por si se quiere el
 * cuadro entero. Por eso el card de portrait es 50% más alto que el 16:9 de antes:
 * el panel se come la mitad de abajo.
 */
import React from 'react';
import {
  View, Text, Pressable, ScrollView, Image, StyleSheet, TouchableOpacity,
  StatusBar, BackHandler, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Line } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  ChevronLeft, MoreHorizontal, Eye, Scissors,
  Maximize2, Minimize2, MessageCircle,
} from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar, AvatarStack, Button, StatusBadge, SurfaceChip, SectionHeader, HostBadge } from '../components/ui';
import { MatchParticipant, CameraAngleData } from '../components/cards';
import { GameCommentsPanel } from '../components/GameCommentsPanel';
import { useGameComments } from '../hooks/useGameComments';
import { useAuth } from '../contexts/AuthContext';

const tornaLogo = require('../assets/torna-icon.png');

/**
 * Alto del video en portrait. El card era 16:9; se lo hizo un **50% más alto**
 * (de ahí el `/ 1.5`) para que el stream ocupe más pantalla y para que quepa
 * abajo el panel de comentarios superpuesto sin tapar el juego.
 *
 * ⚠️ El `resizeMode` sigue siendo `COVER`: con una fuente 16:9 en una caja más
 * alta, eso **recorta a los costados** en vez de dejar franjas negras. Si algún
 * día se prefiere ver el cuadro completo, el cambio es `CONTAIN` acá.
 */
const PORTRAIT_VIDEO_ASPECT = (16 / 9) / 1.5;

/** Cuánto del alto del video ocupa el panel de comentarios superpuesto en portrait. */
const PORTRAIT_COMMENTS_HEIGHT = '52%';

export interface GameDetailData {
  id: string;
  court: string;
  floor: 'CLAY' | 'GRASS' | 'HARD' | 'CARPET';
  club: string;
  /** Id (Firebase UID) del club del partido, para seguir/dejar de seguir. '' si no hay. */
  clubId: string;
  clubHandle: string;
  clubFollowers: number;
  time: string; date: string;
  viewers: number;
  isLive: boolean;
  players: MatchParticipant[];
  cameras: CameraAngleData[];
}

export function GameDetailScreen({ game, fallbackStreamUrl, onBack, isFollowing = false, onToggleFollow, onCreateHighlight }: {
  game: GameDetailData; fallbackStreamUrl?: string; onBack?: () => void; isFollowing?: boolean; onToggleFollow?: () => void;
  onCreateHighlight?: () => void;
}) {
  const { colors, radii } = useTheme();
  const { width } = useWindowDimensions();
  const [camIdx, setCamIdx] = React.useState(0);
  const activeCam = game.cameras[camIdx];
  const [streamError, setStreamError] = React.useState(false);
  const videoRef = React.useRef<Video>(null);

  // Pantalla completa in-app (landscape) + paneles de comentarios.
  const [fullscreen, setFullscreen] = React.useState(false);
  const [overlayComments, setOverlayComments] = React.useState(false);
  /**
   * Comentarios en portrait: **visibles por defecto** y superpuestos al video, el
   * mismo concepto que en landscape. Antes eran un `<Modal>` a pantalla completa
   * detrás de un botón: para leerlos había que tapar el stream, o sea salirse del
   * partido. Se puede ocultar con el botón de comentarios si molesta.
   */
  const [portraitComments, setPortraitComments] = React.useState(true);

  // Comentarios públicos del stream (GameComment) — aislados de los del highlight
  // (HighlightComment) y del chat privado de la partida (GameChatMessage).
  const { user } = useAuth();
  const author = React.useMemo(
    () => (user ? { id: user.id, username: user.username, name: user.name, profilePicture: user.profilePicture } : undefined),
    [user?.id, user?.username, user?.name, user?.profilePicture],
  );
  const { comments, loading: loadingComments, sending, send } = useGameComments(game.id, {
    enabled: !!game.id,
    author,
  });

  // Reutiliza la URL ya validada por la preview del Home (GET /game/live) si la cámara
  // activa del detalle (GET /game/:id) todavía no trae stream o el fetch falló.
  const streamSrc = activeCam?.streamUrl || fallbackStreamUrl;

  if (__DEV__) {
    console.log('[STREAM DEBUG] GameDetail cameras=', game.cameras.length,
      'activeCam=', activeCam, 'fallbackStreamUrl=', fallbackStreamUrl, 'streamSrc=', streamSrc);
  }

  // El detalle carga async: las cámaras llegan después del montaje. Si la cámara
  // activa no tiene stream (p. ej. una secundaria sin URL tras la unificación, en
  // la que solo la primaria trae streamingUrl), saltar a la primera disponible.
  // Evita el "Stream no disponible para esta cámara" al entrar.
  React.useEffect(() => {
    const firstAvailable = game.cameras.findIndex((c) => c.state === 'available');
    if (firstAvailable >= 0 && game.cameras[camIdx]?.state !== 'available') {
      setCamIdx(firstAvailable);
    }
  }, [game.cameras]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => { setStreamError(false); }, [activeCam?.id]);

  /* ── Pantalla completa: rotar a landscape y volver ──
     `lockAsync` en runtime pisa el `screenOrientation` del manifest (Android) —
     por eso la app puede seguir bloqueada en portrait globalmente. */
  const enterFullscreen = React.useCallback(() => {
    setFullscreen(true);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, []);

  const exitFullscreen = React.useCallback(() => {
    setOverlayComments(false);
    setFullscreen(false);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  // Siempre devolver el device a portrait al desmontar la pantalla.
  React.useEffect(() => () => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  // Botón "atrás" de Android: primero cierra el fullscreen, no la pantalla.
  React.useEffect(() => {
    if (!fullscreen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { exitFullscreen(); return true; });
    return () => sub.remove();
  }, [fullscreen, exitFullscreen]);

  const overlayWidth = Math.min(380, Math.max(260, width * 0.4));
  const hasStream = !!streamSrc && !streamError;
  /** ¿Hay un panel de comentarios tapando parte del video, en el modo actual? */
  const commentsOverVideo = fullscreen ? overlayComments : portraitComments;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={fullscreen ? [] : ['top']}>
      <StatusBar hidden={fullscreen} />

      {/* Dark header — top bar */}
      {!fullscreen && (
        <View style={{ backgroundColor: colors.ink }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
            <Pressable onPress={onBack} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={20} color="#FFFFFF" />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {game.isLive && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.live }} />}
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>
                {game.isLive ? 'EN VIVO' : ''} · {game.viewers} viewers
              </Text>
            </View>
            <Pressable style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <MoreHorizontal size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}

      {/* HLS player — la MISMA instancia de <Video> en ambos modos: solo cambia el
          estilo del contenedor (card 16:9 ↔ absolute-fill), así el stream no se
          reinicia al entrar/salir de pantalla completa. */}
      <View
        style={fullscreen
          ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 50 }
          : { backgroundColor: colors.ink, paddingHorizontal: 16 }}
      >
        <View
          style={fullscreen
            ? { flex: 1, backgroundColor: '#000', position: 'relative', alignItems: 'center', justifyContent: 'center' }
            : { borderRadius: 18, overflow: 'hidden', aspectRatio: PORTRAIT_VIDEO_ASPECT, backgroundColor: colors.ink2, borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        >
          {hasStream ? (
            <Video
              ref={videoRef}
              key={activeCam?.id ?? game.id}
              source={{ uri: streamSrc! }}
              style={StyleSheet.absoluteFill}
              resizeMode={fullscreen ? ResizeMode.CONTAIN : ResizeMode.COVER}
              shouldPlay
              isLooping={false}
              isMuted={false}
              onError={() => setStreamError(true)}
            />
          ) : (
            <>
              <Svg viewBox="0 0 360 200" width="58%" height="58%" style={{ opacity: 0.4 }}>
                <Rect x={40} y={22} width={280} height={156} stroke={colors.accent} strokeWidth={1.6} fill="none"/>
                <Line x1={180} y1={22} x2={180} y2={178} stroke={colors.accent} strokeWidth={1.6}/>
                <Line x1={40} y1={68} x2={320} y2={68} stroke={colors.accent} strokeWidth={1}/>
                <Line x1={40} y1={132} x2={320} y2={132} stroke={colors.accent} strokeWidth={1}/>
              </Svg>
              <View style={{ position: 'absolute', bottom: 14, alignItems: 'center' }}>
                <Text style={{ color: colors.muted2, fontSize: 12, fontWeight: '600' }}>
                  {streamError
                    ? 'Señal no disponible · reintentando...'
                    : 'Stream no disponible para esta cámara'}
                </Text>
                {streamError && (
                  <TouchableOpacity
                    onPress={() => setStreamError(false)}
                    style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8,
                             backgroundColor: colors.ink, borderRadius: radii.md }}>
                    <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 13 }}>Reintentar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {game.isLive && (
            <View style={{ position: 'absolute', top: 10, left: 10 }}>
              <StatusBadge status="LIVE" />
            </View>
          )}
          {/* Meta del pie: se oculta cuando el panel de comentarios lo taparía. */}
          {!commentsOverVideo && (
            <>
              <Text style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, color: colors.accent, fontWeight: '600' }}>
                HLS · 1080p · {activeCam?.label}
              </Text>
              <View style={{ position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Eye size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>{game.viewers}</Text>
              </View>
            </>
          )}

          {/* Controles superpuestos: comentarios + expandir/contraer */}
          <View style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}>
            {/* Mostrar/ocultar comentarios. En los DOS modos: en portrait arrancan
                visibles, así que este botón sirve para taparlos y ver el cuadro entero. */}
            <TouchableOpacity
                onPress={() => (fullscreen ? setOverlayComments((v) => !v) : setPortraitComments((v) => !v))}
                style={circleBtn(commentsOverVideo ? 'rgba(214,255,126,0.9)' : 'rgba(0,0,0,0.55)')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={commentsOverVideo ? 'Ocultar comentarios' : 'Mostrar comentarios'}
                testID="toggle-comments"
              >
                <MessageCircle size={18} color={commentsOverVideo ? colors.ink : '#FFFFFF'} />
                {comments.length > 0 && !commentsOverVideo && (
                  <View style={{
                    position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16,
                    borderRadius: 8, paddingHorizontal: 4, backgroundColor: colors.accent,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: colors.ink, fontSize: 9, fontFamily: fonts.bold }}>
                      {comments.length > 99 ? '99+' : comments.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            {hasStream && (
              <TouchableOpacity
                onPress={fullscreen ? exitFullscreen : enterFullscreen}
                style={circleBtn('rgba(0,0,0,0.55)')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {fullscreen
                  ? <Minimize2 size={18} color="#FFFFFF" />
                  : <Maximize2 size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            )}
          </View>

          {/* Comentarios superpuestos en PORTRAIT — mismo concepto que el overlay de
              landscape: se leen y se escriben sin tapar el partido ni salir de la
              pantalla. Van dentro del card del video (que por eso es más alto), así
              que el stream sigue corriendo arriba. */}
          {!fullscreen && portraitComments && (
            <View style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              height: PORTRAIT_COMMENTS_HEIGHT, zIndex: 20,
            }}>
              <GameCommentsPanel
                variant="overlay"
                comments={comments}
                loading={loadingComments}
                sending={sending}
                onSend={send}
                onClose={() => setPortraitComments(false)}
              />
            </View>
          )}
        </View>

        {/* Panel de comentarios superpuesto (solo en pantalla completa) */}
        {fullscreen && overlayComments && (
          <View style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: overlayWidth, zIndex: 60,
          }}>
            <GameCommentsPanel
              variant="overlay"
              comments={comments}
              loading={loadingComments}
              sending={sending}
              onSend={send}
              onClose={() => setOverlayComments(false)}
            />
          </View>
        )}
      </View>

      {/* Camera angle tabs */}
      {!fullscreen && (
        <View style={{ backgroundColor: colors.ink, paddingBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
            {game.cameras.map((cam, i) => {
              const on = i === camIdx;
              const disabled = cam.state === 'inactive';
              return (
                <Pressable key={cam.id} disabled={disabled} onPress={() => setCamIdx(i)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 90,
                    backgroundColor: on ? colors.primary : 'rgba(255,255,255,0.08)',
                    borderWidth: on ? 0 : 1, borderColor: 'rgba(255,255,255,0.18)',
                    opacity: disabled ? 0.45 : 1,
                  }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: 0.8, fontWeight: '700' }}>CAM {cam.number}</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 2 }}>{cam.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Light info sheet */}
      {!fullscreen && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.bg, marginTop: -14, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
          contentContainerStyle={{ padding: 16, gap: 14 }}>
          {/* Heading */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <View>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20, letterSpacing: -0.2 }}>{game.court}</Text>
              <Text style={{ color: colors.muted2, fontSize: 13, marginTop: 2 }}>
                {[game.time, game.date].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <SurfaceChip surface={game.floor}/>
          </View>

          {/* Club — va ANTES que cualquier otra cosa de la hoja: los comentarios ahora
              viven sobre el video, así que "Seguir" es la primera acción de acá abajo.
              ⚠️ Si ya seguís al club, el botón NO se muestra: ofrecer "Siguiendo" solo
              servía para dejar de seguir por accidente mientras mirás el partido. Para
              dejar de seguir está el perfil del club. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg2, padding: 12, borderRadius: 14 }}>
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={tornaLogo} style={{ width: 30, height: 30 }}/>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{game.club}</Text>
              <Text style={{ color: colors.muted2, fontSize: 12 }}>{game.clubHandle} · {game.clubFollowers} seguidores</Text>
            </View>
            {!isFollowing && onToggleFollow && (
              <Button size="sm" variant="primary" onPress={onToggleFollow}>
                Seguir
              </Button>
            )}
          </View>

          {/* Players */}
          <View>
            <SectionHeader title={`Jugadores · ${game.players.length}`} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {game.players.map(p => (
                <View key={p.username} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, width: '50%' }}>
                  <Avatar name={p.name || p.username} size={32}/>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{p.name || p.username}</Text>
                      {p.isHost && <HostBadge />}
                    </View>
                    <Text style={{ color: colors.muted2, fontSize: 11 }}>{p.username}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Crear highlight — disponible cuando el partido NO está en vivo
              (i.e. ya hay grabación completa para recortar). */}
          {!game.isLive && onCreateHighlight ? (
            <View style={{ marginTop: 4 }}>
              <Button fullWidth size="lg" onPress={onCreateHighlight}
                icon={<Scissors size={16} color={colors.primaryFg}/>}>
                Crear highlight
              </Button>
              <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 6, textAlign: 'center' }}>
                Recordá hasta 60s para tu perfil o el feed.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

/** Botón circular translúcido para los controles sobre el video. */
function circleBtn(background: string) {
  return {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: background,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
}
