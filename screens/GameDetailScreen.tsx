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
 * **Portrait = el video de fondo y todo flotando encima (2026-09-01).** No hay barra
 * de header ni panel de comentarios: el partido no se interrumpe nunca.
 *
 *   arriba-izq   chip del club + ● EN VIVO + Seguir   → su perfil
 *   arriba-der   avatares (club + jugadores) + espectadores · X para salir
 *   sobre el video   los comentarios, **sin caja**: texto con sombra
 *   abajo        campo "Escribe algo..." + comentarios · compartir · pantalla completa
 *
 * ⚠️ **Los comentarios NO vuelven a un panel.** Antes se abrían abajo encogiendo el
 * video a 16:9; leer o escribir te sacaba de lo que estabas mirando. Ahora flotan y
 * se escribe en la barra, con `adjustResize` el teclado empuja la barra y el video
 * sigue a la vista. El botón 💬 solo los muestra/oculta.
 *
 * ⚠️ **El panel `players` FLOTA sobre el video; no le quita alto** (2026-09-02).
 * Antes era un bloque del layout y abrirlo encogía la transmisión: ver quién juega te
 * movía el partido. Ahora es `position: absolute` con fondo translúcido del tema, así
 * que el video no cambia de tamaño. Dos reglas suyas:
 *  - **Equipos solo si el dato existe** (`hasTeams`: alguien con `team === 2`). Sin eso
 *    va una sola sección "Jugadores": rotular "EQUIPO 1" a los cuatro sería inventar
 *    una división que la partida no declara.
 *  - **Los jugadores abren su perfil** (`onOpenPlayer`, necesita el `id`/UID que mapea
 *    `useGameDetail`). El **club no está en el panel**: ya está arriba en el chip.
 *
 * ⚠️ `resizeMode` es `CONTAIN` **por defecto**: la fuente es 16:9 (cancha apaisada) y
 * las cajas ya no lo son, así que con `COVER` fijo el video en vertical perdería media
 * cancha por recorte. El zoom lo decide el usuario **con un pellizco**. No cambies el
 * default.
 *
 * **Los controles del video son gestos, no botones** (2026-09-02):
 *   · **doble toque** → pausa / reanuda
 *   · **pellizco**    → zoom (CONTAIN ↔ COVER)
 * Los botones que hacían esto se eliminaron: son gestos que la gente ya trae aprendidos
 * y como botones solo tapaban la imagen. La barra de abajo queda para lo que NO tiene
 * gesto obvio: comentarios, compartir y pantalla completa.
 *
 * Si la transmisión se corta y el reenganche automático se rinde, aparece un **botón de
 * recarga grande al centro** con "Se interrumpió la transmisión" — ver
 * `useLiveStreamRecovery` (`stalled`).
 */
import React from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, TouchableOpacity,
  StatusBar, BackHandler, useWindowDimensions, TextInput, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Line } from 'react-native-svg';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as ScreenOrientation from 'expo-screen-orientation';
import {
  Scissors, Send, Forward,
  Maximize2, Minimize2, MessageCircle, X, RotateCw,
} from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar, AvatarStack, Button, HostBadge, CategoryBadge } from '../components/ui';
import { MatchParticipant, CameraAngleData } from '../components/cards';
import { GameCommentsPanel } from '../components/GameCommentsPanel';
import { useGameComments } from '../hooks/useGameComments';
import { useViewerPing } from '../hooks/useViewerPing';
import { useLiveStreamRecovery } from '../hooks/useLiveStreamRecovery';
import { useAuth } from '../contexts/AuthContext';
import type { GameComment } from '../api/games';

/**
 * A partir de cuántos espectadores se muestra el número.
 *
 * No es un detalle estético: "1 espectador" comunica peor que no decir nada, tanto al
 * jugador como al club. Por debajo del umbral el badge no aparece — no se miente, se
 * calla. Bajarlo a 1 es cambiar este número y nada más.
 */
export const MIN_VIEWERS_TO_SHOW = 3;

/* El logo de Torna ya no se usa acá: el avatar del club es su propia foto
   (`clubAvatar`), no un placeholder de marca. */

/**
 * Panel que puede ocupar la mitad de abajo en portrait. `null` = video a pantalla
 * completa. Solo queda `players`: los comentarios ya no abren panel — viven sobre
 * el video, con fondo transparente.
 */
type PortraitPanel = null | 'players';

export interface GameDetailData {
  id: string;
  court: string;
  /** Nivel de la partida: 1 = más alta, 7 = iniciación. Null = sin declarar. */
  category?: number | null;
  club: string;
  /** Id (Firebase UID) del club del partido, para seguir/dejar de seguir. '' si no hay. */
  clubId: string;
  clubHandle: string;
  /** Foto del club, para el avatar del panel y de la pila sobre el video. */
  clubAvatar?: string;
  time: string; date: string;
  /* Sin `viewers`: no hay forma de saber quién está mirando (el backend no lo
     mide) y el número que se mostraba era siempre 0. Ver la nota de CLAUDE.md. */
  isLive: boolean;
  players: MatchParticipant[];
  cameras: CameraAngleData[];
}

export function GameDetailScreen({
  game, fallbackStreamUrl, onBack, isFollowing = false, onToggleFollow, onCreateHighlight,
  onOpenPlayer, onOpenClub, onShare,
}: {
  game: GameDetailData; fallbackStreamUrl?: string; onBack?: () => void; isFollowing?: boolean; onToggleFollow?: () => void;
  onCreateHighlight?: () => void;
  /** Abre el perfil público de un jugador. Sin handler, la fila no es tocable. */
  onOpenPlayer?: (playerId: string) => void;
  /** Abre el perfil del club dueño de la cancha. */
  onOpenClub?: (clubId: string) => void;
  /** Compartir el partido. Sin handler, el botón no se pinta. */
  onShare?: () => void;
}) {
  const { colors, radii, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [camIdx, setCamIdx] = React.useState(0);
  const activeCam = game.cameras[camIdx];
  const [streamError, setStreamError] = React.useState(false);
  const [paused, setPaused] = React.useState(false);

  // Reutiliza la URL ya validada por la preview del Home (GET /game/live) si la cámara
  // activa del detalle (GET /game/:id) todavía no trae stream o el fetch falló.
  const streamSrc = activeCam?.streamUrl || fallbackStreamUrl;

  // Player de expo-video (SDK 55, reemplaza a `expo-av`). Instancia única para los
  // tres tamaños (card / absolute-fill / fullscreen): solo cambia el estilo del
  // contenedor, así el stream no se reinicia al expandir o encoger. El cambio de
  // cámara y el reenganche se hacen con `player.replace()`, no remontando.
  const player = useVideoPlayer(streamSrc ?? null, (p) => {
    p.loop = false;
    p.muted = false;
    p.timeUpdateEventInterval = 1;
    p.play();
  });
  /**
   * Reenganche automático de la transmisión en vivo. Solo se arma con la partida
   * EN VIVO: en un grabado, la posición detenida significa "pausado" o
   * "terminado", y remontar por eso lo reiniciaría en bucle.
   */
  /**
   * ¿El usuario está escribiendo un comentario? Mientras lo esté, el reenganche
   * NO remonta el video: remontarlo crea un `SurfaceView` nuevo, Android le da
   * el foco de ventana y **se cierra el teclado a mitad de la frase**.
   */
  const [composing, setComposing] = React.useState(false);
  const recovery = useLiveStreamRecovery(player, game.isLive, composing);

  // Volver a cargar la fuente cuando cambia la cámara (nuevo `streamSrc`) o cuando
  // el reenganche lo pide (`reloadNonce`). `replace` hace que el player vuelva a
  // pedir la playlist y entre por el borde en vivo.
  React.useEffect(() => {
    if (!streamSrc) return;
    player.replace(streamSrc);
    if (!paused) player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamSrc, recovery.reloadNonce]);

  // Pausa/reanuda. En un vivo, reanudar se maneja en `togglePaused` (remonta).
  React.useEffect(() => {
    if (paused) player.pause();
    else player.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  // Error de carga en un GRABADO: es definitivo, se muestra el cartel. En un vivo
  // lo maneja `useLiveStreamRecovery` (reintenta).
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'error' && !game.isLive) setStreamError(true);
  });

  /**
   * Zoom del video: `false` = CONTAIN (se ve la cancha entera, con franjas
   * negras arriba y abajo), `true` = COVER (llena la pantalla, recortando).
   *
   * ⚠️ **El default sigue siendo CONTAIN y no hay que cambiarlo.** La fuente es
   * 16:9 (cancha apaisada) y el contenedor en vertical no lo es: con COVER fijo
   * se pierde media cancha por recorte, que es peor que las franjas. Por eso el
   * zoom es un **toggle del usuario** y no una decisión nuestra — quien lo activa
   * sabe lo que está cambiando, y en horizontal (donde las franjas casi no
   * existen) ni hace falta.
   */
  const [zoomed, setZoomed] = React.useState(false);

  /**
   * Gestos sobre el video, en vez de botones (2026-09-02):
   *
   *  · **doble toque** → pausa / reanuda
   *  · **pellizco**    → zoom (CONTAIN ↔ COVER)
   *
   * Son los gestos que la gente ya trae aprendidos de cualquier reproductor; como
   * botones solo tapaban la imagen.
   *
   * ⚠️ El pellizco NO es un zoom continuo con escala libre: `expo-av` no expone
   * transform del contenido, así que se traduce a los dos `resizeMode` que el
   * reproductor entiende. Abrir los dedos llena la pantalla (COVER) y cerrarlos
   * vuelve a la cancha entera (CONTAIN). Un zoom libre exigiría envolver el video
   * en un contenedor animado y recortar por fuera — mucho más frágil, y con la
   * fuente 16:9 los dos estados cubren lo que la gente realmente quiere.
   *
   * ⚠️ **Sin `runOnJS` a propósito.** Ese helper es de `react-native-reanimated`,
   * que este proyecto **no** tiene instalado; sin reanimated, RNGH corre los
   * callbacks directamente en el hilo de JS y `setState` funciona normal. Si
   * algún día se suma reanimated y estos callbacks pasan a ser worklets, hay que
   * envolverlos en `runOnJS` o van a reventar en release.
   */
  const videoGestures = React.useMemo(() => {
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDuration(300)
      .onEnd((_e, ok) => { if (ok) togglePausedRef.current(); });

    const pinch = Gesture.Pinch()
      .onEnd((e) => {
        // Umbral del 12 %: por debajo suele ser ruido de los dedos, no intención.
        if (e.scale > 1.12) setZoomed(true);
        else if (e.scale < 0.88) setZoomed(false);
      });

    // Simultáneos: pellizcar no debe cancelar el doble toque ni al revés.
    return Gesture.Simultaneous(doubleTap, pinch);
  }, []);

  /**
   * Pausa. Es un vivo, así que pausar es "me alejo un momento": al reanudar se
   * **remonta** (`recovery.retryNow()`) en vez de continuar donde quedó, porque
   * los segmentos de hace dos minutos ya no existen — reanudar dejaría el
   * reproductor pidiendo cosas borradas, que es justo la traba que arreglamos.
   */
  const togglePaused = React.useCallback(() => {
    setPaused((p) => {
      if (p && game.isLive) recovery.retryNow();
      return !p;
    });
  }, [game.isLive, recovery]);

  /**
   * El gesto se construye UNA vez (`useMemo` sin deps) para no recrear el
   * detector en cada render, pero `togglePaused` cambia de identidad. El ref lo
   * puentea: el gesto llama siempre a la versión vigente.
   */
  const togglePausedRef = React.useRef(togglePaused);
  React.useEffect(() => { togglePausedRef.current = togglePaused; }, [togglePaused]);

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

  /**
   * Comentarios **encima del video**, con fondo transparente (2026-09-01).
   *
   * Antes vivían en un panel que encogía el partido: para leer o escribir había
   * que dejar de mirar. Ahora flotan sobre la imagen y se escribe desde la barra
   * de abajo, así el stream nunca se interrumpe. `commentsVisible` permite
   * ocultarlos para ver la cancha limpia.
   */
  const [commentsVisible, setCommentsVisible] = React.useState(true);
  const [draft, setDraft] = React.useState('');
  const composerRef = React.useRef<TextInput>(null);

  /** Últimos comentarios, del más nuevo al más viejo (la capa va `inverted`). */
  const overlayComentarios = React.useMemo(
    () => [...comments].reverse().slice(0, 30),
    [comments],
  );

  const submitComment = React.useCallback(async () => {
    const value = draft.trim();
    if (!value || sending) return;
    setDraft('');
    // Tocar el botón de enviar le saca el foco al campo. Se lo devolvemos para
    // que el teclado no se cierre entre comentario y comentario.
    composerRef.current?.focus();
    const ok = await send(value);
    if (!ok) setDraft(value); // restaurar si falló, para no perderlo
  }, [draft, sending, send]);

  // Espectadores conectados. Solo tiene sentido con la partida EN VIVO: en una
  // grabación no hay "gente mirando ahora" que contar.
  const viewers = useViewerPing(game.id, !!game.id && game.isLive);
  const showViewers = viewers !== null && viewers >= MIN_VIEWERS_TO_SHOW;

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
   * prácticamente toda la pantalla, así que escribir devuelve la app a vertical y
   * enfoca el campo de la barra de abajo. El respiro de 350 ms es porque el foco
   * pedido durante la rotación se pierde.
   */
  const composeFromFullscreen = React.useCallback(() => {
    exitFullscreen();
    setCommentsVisible(true);
    setTimeout(() => composerRef.current?.focus(), 350);
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
  /** En landscape los comentarios siguen siendo el panel superpuesto a la derecha. */
  const commentsOpen = overlayComments;

  /**
   * Las dos parejas: 1 = lado del organizador, 2 = retadores.
   *
   * ⚠️ Solo se separa en equipos si el dato **existe de verdad**: una partida vieja
   * puede no tener `team` en ninguno, y ahí mostrar "EQUIPO 1" con los cuatro
   * adentro es inventar una división que nadie declaró. En ese caso va una sola
   * sección "Jugadores".
   */
  const hasTeams = game.players.some((p) => p.team === 2);
  const teamA = game.players.filter((p) => p.team !== 2);
  const teamB = game.players.filter((p) => p.team === 2);

  /** Pila de avatares sobre el video: el club primero, después los jugadores. */
  const stackUsers = React.useMemo(
    () => [
      ...(game.club ? [{ name: game.club, imageUri: game.clubAvatar }] : []),
      ...game.players.map((p) => ({ name: p.name || p.username, imageUri: p.profilePicture })),
    ],
    [game.club, game.clubAvatar, game.players],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={fullscreen ? [] : ['top']}>
      <StatusBar hidden={fullscreen} />

      {/* Sin barra oscura arriba: el video es el fondo y todo flota encima. La barra
          traía un segundo "EN VIVO" (el otro era el badge sobre el video) y un botón
          de tres puntos que no hacía nada. Ahora el estado LIVE se dice UNA vez, en
          el chip del club, y el lugar del menú lo ocupa Compartir, que sí funciona. */}
      {/* HLS player — la MISMA instancia de <Video> en los tres tamaños: solo cambia
          el estilo del contenedor, así el stream no se reinicia al expandir/encoger. */}
      {/* `KeyboardAvoidingView` y no `View`: en iOS no hay equivalente al
          `adjustResize` de Android — sin esto el teclado se dibuja ENCIMA de la
          barra de comentarios (`position:absolute, bottom:0`) en vez de
          empujarla, y ni el campo ni los botones de enviar (nativo o de la app)
          quedan alcanzables. `behavior:'padding'` reduce el alto de este
          contenedor lo que mide el teclado, así el `bottom:0` de la barra
          termina arriba de él. En Android no hace falta (el manifest ya
          resuelve el resize), así que ahí queda en `undefined` para no doblar
          el ajuste. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={fullscreen
          ? { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 50 }
          // El video se queda con TODO el alto libre, haya panel o no: el panel de
          // jugadores mide lo que ocupa su contenido, así que lo que sobra es video.
          // Antes el video se encogía a 16:9 fijo y el panel se quedaba con el
          // resto, dejando un hueco vacío enorme abajo del último jugador.
          : { flex: 1, backgroundColor: '#000' }}
      >
        <View
          style={fullscreen
            ? { flex: 1, backgroundColor: '#000', position: 'relative', alignItems: 'center', justifyContent: 'center' }
            : { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        >
          {hasStream ? (
            <GestureDetector gesture={videoGestures}>
            <View style={StyleSheet.absoluteFill}>
            {/*
              El reenganche de una transmisión trabada NO remonta este `<VideoView>`:
              lo hace `useLiveStreamRecovery` bumpeando `reloadNonce`, y el efecto de
              arriba llama `player.replace(streamSrc)` — el player vuelve a pedir la
              playlist y entra por el borde en vivo. Un HLS en vivo casi nunca
              "falla": se traba (microcorte → segmentos que ya no existen → espera
              eterna, imagen congelada, sin evento de error). Ver `useLiveStreamRecovery`.

              `contentFit`: 'contain' por defecto — la fuente es 16:9 (cancha
              apaisada) y las cajas ya no lo son, así que con 'cover' fijo se
              perdería media cancha por recorte. 'cover' solo si el usuario pide
              zoom (pellizco) — ver `zoomed`.
            */}
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit={zoomed ? 'cover' : 'contain'}
              nativeControls={false}
            />
            </View>
            </GestureDetector>
          ) : (
            <>
              <Svg viewBox="0 0 360 200" width="58%" height="58%" style={{ opacity: 0.4 }} testID="no-stream-placeholder">
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

          {/*
            Estado de la conexión, centrado sobre el video.
            - Reconectando: la app ya está remontando sola; el cartel existe para
              que la imagen quieta no parezca la app colgada.
            - En pausa: recuerda que fue una decisión del usuario.
            El botón "Reintentar" está siempre en un vivo: si el reenganche
            automático no alcanza, tiene que haber una salida a mano en vez de
            obligar a salir y volver a entrar.
          */}
          {/*
            Estado del stream, CENTRADO sobre el video.

            Tres casos distintos, y la diferencia importa:
             · **reconectando** — la app ya está remontando sola. Spinner y nada
               que tocar: el cartel existe para que la imagen quieta no parezca
               la app colgada.
             · **se cortó** — el reenganche automático se rindió (`stalled`).
               Botón de recarga GRANDE y al centro, que es lo que se pidió: sin
               él la única salida era cerrar el visor y volver a entrar.
             · **en pausa** — fue una decisión del usuario; solo se recuerda.

            ⚠️ `pointerEvents="box-none"` es lo que deja pasar el doble toque y el
            pellizco al video que está debajo. Con el default, esta capa se comería
            los gestos en toda la pantalla.
          */}
          {hasStream && game.isLive && (recovery.reconnecting || recovery.stalled || paused) && (
            <View
              testID="stream-status"
              pointerEvents="box-none"
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                alignItems: 'center', justifyContent: 'center', zIndex: 20,
              }}
            >
              {recovery.stalled ? (
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <Pressable
                    onPress={recovery.retryNow}
                    testID="retry-stream"
                    accessibilityRole="button"
                    accessibilityLabel="Volver a cargar la transmisión"
                    style={({ pressed }) => ({
                      width: 68, height: 68, borderRadius: 34,
                      backgroundColor: colors.accent,
                      alignItems: 'center', justifyContent: 'center',
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <RotateCw size={30} color={colors.ink} strokeWidth={2.4} />
                  </Pressable>
                  <View style={{
                    backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: 12,
                    paddingVertical: 8, paddingHorizontal: 14, maxWidth: 260,
                  }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: fonts.bold, textAlign: 'center' }}>
                      Se interrumpió la transmisión
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center', marginTop: 2 }}>
                      Puede que haya terminado. Toca para volver a intentar.
                    </Text>
                  </View>
                </View>
              ) : recovery.reconnecting ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: 999,
                  paddingVertical: 9, paddingHorizontal: 14,
                }}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: fonts.bold }}>
                    Reconectando…
                  </Text>
                </View>
              ) : (
                /*
                 * ⚠️ **Un ícono de play TOCABLE, no el cartel "En pausa".**
                 *
                 * Dos bugs en uno, y el segundo era el grave: la píldora de texto
                 * quedaba justo en el centro de la pantalla, o sea encima del
                 * área donde hay que hacer doble toque para reanudar. Como es una
                 * `View` normal, se comía el gesto y **el video no se podía
                 * reanudar de ninguna forma**.
                 *
                 * Ahora es un botón: un toque simple reanuda. El doble toque
                 * sobre el video sigue funcionando en el resto de la pantalla.
                 */
                <Pressable
                  onPress={togglePaused}
                  testID="resume-stream"
                  accessibilityRole="button"
                  accessibilityLabel="Reanudar"
                  style={({ pressed }) => ({
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    alignItems: 'center', justifyContent: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  {/* Triángulo de play, corrido a la derecha para que se vea
                      centrado (un triángulo centrado por caja se ve a la izquierda). */}
                  <View style={{
                    width: 0, height: 0, marginLeft: 6,
                    borderLeftWidth: 26, borderLeftColor: '#FFFFFF',
                    borderTopWidth: 16, borderTopColor: 'transparent',
                    borderBottomWidth: 16, borderBottomColor: 'transparent',
                  }} />
                </Pressable>
              )}
            </View>
          )}

          {/* Identidad, arriba a la izquierda: club + estado. Es el equivalente al
              chip del anfitrión en un live: quién transmite, y el "Seguir" al lado.
              Aquí vive el ÚNICO "EN VIVO" de la pantalla. */}
          {!fullscreen && !!game.club && (
            <View style={{
              position: 'absolute', top: 10, left: 10, zIndex: 10,
              flexDirection: 'row', alignItems: 'center', gap: 8,
              maxWidth: '62%',
            }}>
              <Pressable
                onPress={game.clubId && onOpenClub ? () => onOpenClub(game.clubId) : undefined}
                disabled={!game.clubId || !onOpenClub}
                accessibilityRole="button"
                accessibilityLabel={`Ver perfil de ${game.club}`}
                testID="header-club"
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  paddingLeft: 4, paddingRight: 12, paddingVertical: 4,
                  borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.55)',
                  opacity: pressed ? 0.75 : 1, flexShrink: 1,
                })}
              >
                <Avatar name={game.club} size={28} imageUri={game.clubAvatar} />
                <View style={{ flexShrink: 1 }}>
                  <Text
                    style={{ color: '#FFFFFF', fontSize: 13, fontFamily: fonts.bold }}
                    numberOfLines={1}
                  >
                    {game.club}
                  </Text>
                  {game.isLive && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live }} />
                      <Text style={{ color: colors.live, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.6 }}>
                        EN VIVO
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>

              {!isFollowing && onToggleFollow && (
                <Pressable
                  onPress={onToggleFollow}
                  accessibilityRole="button"
                  testID="header-follow"
                  style={({ pressed }) => ({
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                    backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ color: colors.ink, fontSize: 12, fontFamily: fonts.bold }}>Seguir</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Arriba a la derecha: quién está (avatares + espectadores) y salir. */}
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
                <AvatarStack users={stackUsers} size={24} max={3} />
                {/* Espectadores conectados, pegado a los avatares: "quiénes" y
                    "cuántos" son la misma pregunta. Solo si hay Redis y llega al
                    umbral — por debajo se calla, no se inventa. */}
                {showViewers && (
                  <Text
                    testID="viewer-count"
                    style={{
                      marginLeft: 6, color: portraitPanel === 'players' ? colors.ink : '#FFFFFF',
                      fontSize: 12, fontFamily: fonts.bold,
                    }}
                  >
                    {viewers}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            {/* Salir del partido. Reemplaza a la flecha de la barra que se eliminó. */}
            {!fullscreen && (
              <TouchableOpacity
                onPress={onBack}
                testID="close-stream"
                style={circleBtn('rgba(0,0,0,0.55)')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Salir del partido"
              >
                <X size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {fullscreen && (
              <>
                <TouchableOpacity
                  onPress={() => setOverlayComments((v) => !v)}
                  style={circleBtn(commentsOpen ? 'rgba(214,255,126,0.9)' : 'rgba(0,0,0,0.55)')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={commentsOpen ? 'Ocultar comentarios' : 'Ver comentarios'}
                  testID="toggle-comments"
                >
                  <MessageCircle size={18} color={commentsOpen ? colors.ink : '#FFFFFF'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={exitFullscreen}
                  testID="toggle-fullscreen"
                  style={circleBtn('rgba(0,0,0,0.55)')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Minimize2 size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Comentarios flotando sobre el video, sin caja ni fondo: solo texto con
              sombra para que se lea sobre cualquier imagen. Es lo que permite mirar
              el partido y seguir el chat a la vez. */}
          {!fullscreen && commentsVisible && overlayComentarios.length > 0 && (
            <View
              testID="comments-overlay"
              style={{
                position: 'absolute', left: 0, right: 0,
                bottom: game.cameras.length > 1 ? 100 : 62,
                // 25% y no 42%: ocupaba casi media pantalla y competía con el
                // partido. Lo que importa es lo último que se dijo, no el historial
                // — para leer todo está el scroll de la propia capa.
                maxHeight: '25%', zIndex: 5,
              }}
            >
              <FlatList<GameComment>
                data={overlayComentarios}
                inverted
                keyExtractor={(c) => c.id}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={false}
                contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '88%' }}>
                    <Avatar name={item.name || item.username || '?'} size={24} />
                    <Text style={{
                      flex: 1, color: '#FFFFFF', fontSize: 13, lineHeight: 18,
                      // Sin fondo: la sombra es lo que lo hace legible sobre un
                      // video claro sin tapar la imagen con una caja.
                      textShadowColor: 'rgba(0,0,0,0.85)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 3,
                    }}>
                      <Text style={{ fontFamily: fonts.bold, color: colors.accent }}>
                        {item.name || item.username}{'  '}
                      </Text>
                      {item.comment}
                    </Text>
                  </View>
                )}
              />
            </View>
          )}

          {/* Barra de abajo: escribir + acciones. Es lo que hace que el visor se
              parezca a un live y no a un reproductor: el comentario se escribe
              desde aquí, sin salir del partido, y las acciones quedan a mano
              derecha (pulgar). */}
          {!fullscreen && (
            <View style={{
              position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10,
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingHorizontal: 12, paddingBottom: 12, paddingTop: 10,
            }}>
              {/* Se escribe ACÁ MISMO, sobre el video. Antes esto abría un panel que
                  encogía el partido: escribir te sacaba de lo que estabas mirando. */}
              <TextInput
                ref={composerRef}
                value={draft}
                onChangeText={setDraft}
                placeholder="Escribe algo..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                returnKeyType="send"
                onSubmitEditing={submitComment}
                // ⚠️ Sin esto el teclado se cierra en CADA comentario: en un input de
                // una línea `blurOnSubmit` es true por defecto, así que "enviar" quita
                // el foco. En un vivo se comenta seguido; que haya que reabrir el
                // teclado cada vez es insoportable.
                blurOnSubmit={false}
                // Mientras el campo tiene foco, el reenganche del stream no
                // remonta el <Video>: ese remonte le cierra el teclado.
                onFocus={() => setComposing(true)}
                onBlur={() => setComposing(false)}
                // ⚠️ `editable` SIEMPRE true: con `editable={!sending}` el campo
                // se volvía no-editable durante el envío y Android le quitaba el
                // foco, cerrando el teclado en cada comentario. El envío ya se
                // bloquea en `submitComment` (`if (!value || sending) return`).
                editable
                maxLength={500}
                testID="compose-bar"
                style={{
                  flex: 1, height: 38, borderRadius: 999,
                  paddingHorizontal: 14, paddingVertical: 0,
                  color: '#FFFFFF', fontSize: 13, fontFamily: fonts.regular,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
                }}
              />
              {/* Siempre montado, deshabilitado cuando no hay texto. Si apareciera y
                  desapareciera con el borrador, ese desmontaje también le roba el
                  foco al input (y mueve la barra justo cuando estás escribiendo). */}
              <TouchableOpacity
                onPress={submitComment}
                disabled={sending || !draft.trim()}
                style={circleBtn(draft.trim() ? colors.accent : 'rgba(0,0,0,0.55)')}
                accessibilityRole="button"
                accessibilityLabel="Enviar comentario"
                testID="send-comment"
              >
                <Send size={18} color={draft.trim() ? colors.ink : 'rgba(255,255,255,0.6)'} />
              </TouchableOpacity>

              {/* Muestra/oculta la capa de comentarios. Ya no abre nada: sirve para
                  dejar la cancha limpia un momento. */}
              <TouchableOpacity
                onPress={() => setCommentsVisible((v) => !v)}
                style={circleBtn(commentsVisible ? 'rgba(214,255,126,0.9)' : 'rgba(0,0,0,0.55)')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={commentsVisible ? 'Ocultar comentarios' : 'Ver comentarios'}
                testID="toggle-comments"
              >
                <MessageCircle size={18} color={commentsVisible ? colors.ink : '#FFFFFF'} />
                {comments.length > 0 && !commentsVisible && (
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

              {onShare && (
                <TouchableOpacity
                  onPress={onShare}
                  style={circleBtn('rgba(0,0,0,0.55)')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Compartir el partido"
                  testID="share-game"
                >
                  <Forward size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              {/*
                ⚠️ Acá había botones de **pausa** y **zoom**. Se eliminaron el
                2026-09-02: los dos son gestos que la gente ya trae aprendida de
                cualquier reproductor de video, y como botones solo sumaban ruido
                sobre la imagen.
                  · pausa → **doble toque** en el video
                  · zoom  → **pellizco** (pinch)
                No los repongas: la barra tiene que quedar para lo que NO tiene
                un gesto obvio (comentarios, compartir, pantalla completa).
              */}
              {hasStream && (
                <TouchableOpacity
                  onPress={enterFullscreen}
                  testID="toggle-fullscreen"
                  style={circleBtn('rgba(0,0,0,0.55)')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Pantalla completa"
                >
                  <Maximize2 size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Cámaras: chips superpuestos, justo encima de la barra de abajo. */}
          {!fullscreen && game.cameras.length > 1 && (
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 62, zIndex: 10 }}>
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
      </KeyboardAvoidingView>

      {/* Ya no hay panel de comentarios en portrait: viven sobre el video y se
          escribe en la barra de abajo. El panel obligaba a encoger el partido
          para leer o escribir, que era justo lo que había que evitar. */}
      {!fullscreen && portraitPanel === 'players' && (
        <ScrollView
          testID="players-panel"
          /*
           * ⚠️ **Capa FLOTANTE sobre el video, no un bloque del layout.**
           *
           * Antes era un hermano del contenedor de video en el flujo normal, así
           * que abrirlo le quitaba alto al video: la transmisión **se movía y se
           * encogía** cada vez que querías ver quién juega. Ahora va
           * `position: absolute` anclado abajo — el video no cambia de tamaño ni
           * un píxel.
           *
           * El fondo es translúcido con el color del tema (no un gris fijo): así
           * se intuye el partido detrás y los textos siguen usando `colors.text`,
           * que es legible en los dos temas. Un fondo oscuro fijo habría dejado el
           * texto azul del modo claro ilegible.
           *
           * `maxHeight` sigue en 55 %: mide lo que ocupan los jugadores y, si son
           * muchos, scrollea en vez de comerse la pantalla.
           */
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
            flexGrow: 0, maxHeight: '55%',
            backgroundColor: isDark ? 'rgba(37,64,107,0.93)' : 'rgba(255,255,255,0.94)',
            borderTopLeftRadius: 18, borderTopRightRadius: 18,
            borderTopWidth: 1, borderTopColor: colors.line,
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: 26, gap: 14 }}
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

          {/* Solo jugadores. El club salió de acá: ya está arriba, en el chip sobre
              el video, con su foto y su perfil a un toque. Repetirlo era lo mismo
              que pasaba con "EN VIVO" y con "Seguir". */}
          <View style={{ backgroundColor: colors.bg2, borderRadius: 14, padding: 12, gap: 12 }}>
            {/* Solo se separa en equipos si el dato existe: ver `hasTeams`. */}
            {hasTeams ? (
              <>
                <TeamGroup title="Equipo 1" players={teamA} onOpenPlayer={onOpenPlayer} />
                <TeamGroup title="Equipo 2" players={teamB} onOpenPlayer={onOpenPlayer} />
              </>
            ) : (
              <TeamGroup title="Jugadores" players={game.players} onOpenPlayer={onOpenPlayer} />
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

/**
 * Grupo de jugadores dentro del cuadro del panel: una pareja ("Equipo 1"/"Equipo 2")
 * o todos juntos ("Jugadores") cuando la partida no declara equipos.
 *
 * Ya no dibuja su propia tarjeta: vive dentro del cuadro que comparte con el club.
 * Cada fila abre el perfil si el jugador trae `id` y hay handler.
 */
function TeamGroup({ title, players, onOpenPlayer }: {
  title: string;
  players: MatchParticipant[];
  onOpenPlayer?: (playerId: string) => void;
}) {
  const { colors } = useTheme();
  if (players.length === 0) return null;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.muted2, fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.8 }}>
        {title.toUpperCase()}
      </Text>
      {players.map((p) => {
        const canOpen = !!p.id && !!onOpenPlayer;
        return (
          <Pressable
            key={p.id ?? p.username}
            onPress={canOpen ? () => onOpenPlayer!(p.id!) : undefined}
            disabled={!canOpen}
            accessibilityRole={canOpen ? 'button' : undefined}
            accessibilityLabel={canOpen ? `Ver perfil de ${p.name || p.username}` : undefined}
            testID={`open-player-${p.username}`}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 10,
              opacity: pressed ? 0.7 : 1,
            })}
          >
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
          </Pressable>
        );
      })}
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
