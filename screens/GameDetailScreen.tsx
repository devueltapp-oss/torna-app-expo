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
 * **Portrait = video a pantalla completa + paneles que lo encogen (2026-08-29).**
 * Sin panel abierto, el video toma TODO el alto libre debajo del header. Al abrir
 * comentarios o jugadores, el video **se encoge a su 16:9 natural** y el panel ocupa
 * la mitad de abajo — modelo Instagram: el panel nunca tapa el partido y nunca te
 * saca de la pantalla. Un panel por vez (`portraitPanel`).
 *
 * Todo lo que antes vivía en una hoja de info debajo del video se movió acá adentro,
 * porque ya no hay "debajo": los **jugadores** (las dos parejas, por `team`) y el
 * **club** con su ícono y el botón de seguir están en el panel `players`, que se abre
 * con los avatares superpuestos al video. Las **cámaras** pasaron a chips superpuestos
 * (solo si hay más de una).
 *
 * ⚠️ `resizeMode` es `CONTAIN` en los tres tamaños: la fuente es 16:9 (cancha
 * apaisada) y las cajas ya no lo son, así que con `COVER` el video a pantalla completa
 * en vertical perdería media cancha por recorte.
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
  Maximize2, Minimize2, MessageCircle, X,
} from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar, AvatarStack, Button, StatusBadge, HostBadge, CategoryBadge } from '../components/ui';
import { MatchParticipant, CameraAngleData } from '../components/cards';
import { GameCommentsPanel } from '../components/GameCommentsPanel';
import { useGameComments } from '../hooks/useGameComments';
import { useAuth } from '../contexts/AuthContext';

const tornaLogo = require('../assets/torna-icon.png');

/** Paneles que pueden ocupar la mitad de abajo en portrait. `null` = video a pantalla completa. */
type PortraitPanel = null | 'comments' | 'players';

export interface GameDetailData {
  id: string;
  court: string;
  /** Nivel de la partida: 1 = más alta, 7 = iniciación. Null = sin declarar. */
  category?: number | null;
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
   * Portrait: el video ocupa TODA la pantalla y los paneles (comentarios /
   * jugadores) se abren abajo **encogiendo el video a su 16:9 natural**, al estilo
   * de Instagram: nunca tapan el partido ni te sacan de la pantalla. Uno por vez.
   */
  const [portraitPanel, setPortraitPanel] = React.useState<PortraitPanel>(null);
  const togglePanel = React.useCallback(
    (panel: Exclude<PortraitPanel, null>) =>
      setPortraitPanel((cur) => (cur === panel ? null : panel)),
    [],
  );

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

  /**
   * Comentar desde pantalla completa (landscape): en horizontal el teclado ocupa
   * prácticamente toda la pantalla — tapa el partido *y* el hilo que estás
   * leyendo —, así que escribir vuelve la app a vertical, donde el video se
   * encoge a 16:9 y el panel se queda con la mitad de abajo. El foco se pide en
   * el panel de portrait (`autoFocus`), después de que termine la rotación.
   */
  const [composeIntent, setComposeIntent] = React.useState(false);
  const composeFromFullscreen = React.useCallback(() => {
    exitFullscreen();
    setPortraitPanel('comments');
    setComposeIntent(true);
  }, [exitFullscreen]);

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
  /** ¿Están los comentarios a la vista en el modo actual? (marca el botón) */
  const commentsOpen = fullscreen ? overlayComments : portraitPanel === 'comments';

  // Las dos parejas: 1 = lado del organizador, 2 = retadores. Sin `team` (partidas
  // viejas) cae todo al equipo 1 para no esconder jugadores.
  const teamA = game.players.filter((p) => p.team !== 2);
  const teamB = game.players.filter((p) => p.team === 2);

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

      {/* HLS player — la MISMA instancia de <Video> en los tres tamaños: solo cambia
          el estilo del contenedor, así el stream no se reinicia al expandir/encoger. */}
      <View
        style={fullscreen
          ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 50 }
          // Sin panel abierto el video se queda con TODO el alto libre; con panel,
          // se encoge a su 16:9 y le cede el resto de la pantalla.
          : portraitPanel ? { backgroundColor: '#000' } : { flex: 1, backgroundColor: '#000' }}
      >
        <View
          style={fullscreen
            ? { flex: 1, backgroundColor: '#000', position: 'relative', alignItems: 'center', justifyContent: 'center' }
            : portraitPanel
              ? { aspectRatio: 16 / 9, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', position: 'relative' }
              : { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        >
          {hasStream ? (
            <Video
              ref={videoRef}
              key={activeCam?.id ?? game.id}
              source={{ uri: streamSrc! }}
              style={StyleSheet.absoluteFill}
              // CONTAIN siempre: la fuente es 16:9 (cancha apaisada) y las cajas ya
              // no lo son. Con COVER, el video a pantalla completa en vertical se
              // recortaría tanto que se perdería media cancha.
              resizeMode={ResizeMode.CONTAIN}
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
          <Text style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, color: colors.accent, fontWeight: '600' }}>
            HLS · 1080p · {activeCam?.label}
          </Text>
          <View style={{ position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Eye size={14} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>{game.viewers}</Text>
          </View>

          {/* Controles superpuestos: jugadores + comentarios + expandir/contraer */}
          <View style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}>
            {/* Jugadores: los avatares SON el botón. Abre el panel con las dos
                parejas y el club — reemplaza a la sección "Jugadores" que estaba
                abajo, fuera del stream. Solo en portrait: en landscape el ancho
                útil es para el partido. */}
            {!fullscreen && game.players.length > 0 && (
              <TouchableOpacity
                onPress={() => togglePanel('players')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Ver jugadores y club"
                testID="toggle-players"
                style={{
                  height: 36, paddingHorizontal: 8, borderRadius: 18,
                  backgroundColor: portraitPanel === 'players' ? 'rgba(214,255,126,0.9)' : 'rgba(0,0,0,0.55)',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <AvatarStack users={game.players} size={24} max={4} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
                onPress={() => (fullscreen ? setOverlayComments((v) => !v) : togglePanel('comments'))}
                style={circleBtn(commentsOpen ? 'rgba(214,255,126,0.9)' : 'rgba(0,0,0,0.55)')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={commentsOpen ? 'Ocultar comentarios' : 'Ver comentarios'}
                testID="toggle-comments"
              >
                <MessageCircle size={18} color={commentsOpen ? colors.ink : '#FFFFFF'} />
                {comments.length > 0 && !commentsOpen && (
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
                testID="toggle-fullscreen"
                style={circleBtn('rgba(0,0,0,0.55)')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {fullscreen
                  ? <Minimize2 size={18} color="#FFFFFF" />
                  : <Maximize2 size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            )}
          </View>

          {/* Cámaras: chips superpuestos abajo a la izquierda. Antes eran una barra
              aparte debajo del video; con el video a pantalla completa no hay "debajo". */}
          {!fullscreen && game.cameras.length > 1 && (
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 34, zIndex: 10 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
                {game.cameras.map((cam, i) => {
                  const on = i === camIdx;
                  const disabled = cam.state === 'inactive';
                  return (
                    <Pressable key={cam.id} disabled={disabled} onPress={() => setCamIdx(i)}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
                        backgroundColor: on ? colors.primary : 'rgba(0,0,0,0.55)',
                        opacity: disabled ? 0.45 : 1,
                      }}>
                      <Text style={{ color: on ? colors.ink : '#FFFFFF', fontSize: 11, fontFamily: fonts.bold }}>
                        CAM {cam.number}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
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
              onComposePress={composeFromFullscreen}
            />
          </View>
        )}
      </View>

      {/* Mitad de abajo (solo portrait, solo con un panel abierto). El video de arriba
          ya se encogió a 16:9, así que esto NO tapa nada: se sigue viendo el partido. */}
      {!fullscreen && portraitPanel === 'comments' && (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <GameCommentsPanel
            comments={comments}
            loading={loadingComments}
            sending={sending}
            onSend={send}
            onClose={() => { setPortraitPanel(null); setComposeIntent(false); }}
            autoFocus={composeIntent}
            onAutoFocusHandled={() => setComposeIntent(false)}
          />
        </View>
      )}

      {!fullscreen && portraitPanel === 'players' && (
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.bg }}
          contentContainerStyle={{ padding: 16, gap: 14 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.2 }} numberOfLines={1}>
                  {game.court}
                </Text>
                {/* Nivel: ocupa el lugar que tenía el chip de superficie. */}
                <CategoryBadge category={game.category} />
              </View>
              {!!(game.time || game.date) && (
                <Text style={{ color: colors.muted2, fontSize: 13, marginTop: 2 }}>
                  {[game.time, game.date].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
            <Pressable onPress={() => setPortraitPanel(null)} hitSlop={12} accessibilityLabel="Cerrar">
              <X size={20} color={colors.muted2} />
            </Pressable>
          </View>

          {/* Las dos parejas. El equipo 2 solo aparece si hay retadores anotados. */}
          <TeamRow title="Equipo 1" players={teamA} />
          {teamB.length > 0 && <TeamRow title="Equipo 2" players={teamB} />}

          {/* Club — con su ícono. ⚠️ Si ya lo seguís, el botón NO se muestra: ofrecer
              "Siguiendo" solo servía para dejar de seguir por accidente en pleno
              partido. La baja se hace desde el perfil del club. */}
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

          {/* Crear highlight — solo con el partido terminado (ya hay grabación completa). */}
          {!game.isLive && onCreateHighlight ? (
            <View>
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

/** Una pareja del partido, dentro del panel de jugadores. */
function TeamRow({ title, players }: { title: string; players: MatchParticipant[] }) {
  const { colors } = useTheme();
  if (players.length === 0) return null;
  return (
    <View style={{ backgroundColor: colors.bg2, borderRadius: 14, padding: 12, gap: 10 }}>
      <Text style={{ color: colors.muted2, fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.8 }}>
        {title.toUpperCase()}
      </Text>
      {players.map((p) => (
        <View key={p.username} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar name={p.name || p.username} size={34} imageUri={p.profilePicture} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, flexShrink: 1 }} numberOfLines={1}>
                {p.name || p.username}
              </Text>
              {p.isHost && <HostBadge />}
            </View>
            <Text style={{ color: colors.muted2, fontSize: 12 }}>{p.username}</Text>
          </View>
        </View>
      ))}
    </View>
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
