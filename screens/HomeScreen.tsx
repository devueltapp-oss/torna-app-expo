import React from 'react';
import { View, Text, Image, ScrollView, Animated, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Search } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { SectionHeader, NotificationBell } from '../components/ui';
import { LiveGameCard, FeedPost, LiveGameData } from '../components/cards';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { VideoPreviewModal } from '../components/VideoPreviewModal';
import type { FeedPost as FeedPostData, UpcomingGamePlayer, UpcomingGameData } from '../data/types';

const tornaLogo = require('../assets/torna-icon.png');
// Imagotipo (ícono + wordmark "torna") — reemplaza el texto "Torna" del header
// del Inicio (2026-09-11). Dos variantes según el modo: la clara es navy sobre
// transparente (pensada para fondo blanco/claro) y la oscura es lima + blanco
// sobre transparente (pensada para el navy oscuro de `darkColors.bg`).
const imagotipoLight = require('../assets/imagotipo-light.png');
const imagotipoDark = require('../assets/imagotipo-dark.png');

// Alto del header (logo + búsqueda + campanita), para ocultarlo al scrollear
// (2026-09-11) — ver el comentario en el `Animated.View` del header más abajo.
// `paddingTop` + el más alto de sus hijos (los botones de 40) + `paddingBottom`.
const HEADER_HEIGHT = 8 + 40 + 14;

export type { UpcomingGamePlayer, UpcomingGameData } from '../data/types';

interface Props {
  liveGames: LiveGameData[];
  /**
   * Próximas partidas: **las mías + las de la gente y los clubes que sigo**
   * (`GET /game/upcoming-feed`, ya deduplicadas del lado del backend). Van en un
   * strip compacto ARRIBA DE TODO — ver `UpcomingStrip`.
   */
  upcomingGames?: UpcomingGameData[];
  /** Abre la hoja de gestión de esa partida (la misma de Juegos → Mis partidas). */
  onOpenUpcoming?: (game: UpcomingGameData) => void;
  feedPosts?: FeedPostData[];
  /** Like/unlike de un highlight del feed (POST /highlights/:id/like, optimista). */
  onLikeHighlight?: (id: string) => void;
  onOpenGame?: (id: string) => void;
  onOpenSearch?: () => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  refreshing: boolean;
  onRefresh: () => void;
  /** No leídos de la campanita (GET /notification/unread-count). */
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
}

/**
 * Player home, en este orden:
 *   1. **"Próximas partidas"** — mías + de quienes sigo, strip compacto ARRIBA DE TODO
 *   2. "En vivo · de quienes seguís"
 *   3. "Highlights · de tus seguidos"
 *
 * ⚠️ **El orden es la feature.** Las partidas propias estuvieron al FINAL, en un
 * carrusel de tiles grandes: había que bajar todo el Inicio —pasando por los
 * highlights de otros— para saber cuándo jugabas. Arriba y chico: lo que más se
 * consulta, primero y sin ocupar la pantalla.
 *
 * ⚠️ **Sin `UpcomingMatchSheet` local.** El strip delega en `onOpenUpcoming` y la
 * hoja vive una sola vez en `MainPlayer`. La copia local que había acá era lo que
 * arrastraba media docena de props (`invitablePlayers`, `suggestedPartners`,
 * `onSearchPartner`, `onAccept/RejectApplication`…) que el Inicio no usa para nada
 * más; se eliminaron y no hay que reponerlas.
 *
 * The Club admin home is NOT here — it lives in `ClubHomeScreen`.
 */
export function HomeScreen({
  liveGames,
  upcomingGames = [],
  onOpenUpcoming,
  feedPosts = [],
  onLikeHighlight,
  onOpenGame,
  onOpenSearch,
  onChangeTab,
  activeTab = 'home',
  refreshing,
  onRefresh,
  unreadNotifications = 0,
  onOpenNotifications,
}: Props) {
  const { colors, isDark } = useTheme();
  const isFocused = useIsFocused();
  const [highlightModal, setHighlightModal] = React.useState<{ url: string; title: string; id: string } | null>(null);

  // Header (logo + búsqueda + campanita) fijo → se ocultaba tapando contenido
  // sin aportar nada mientras se lee el feed (2026-09-11). Se sube fuera de
  // pantalla a medida que se scrollea, y vuelve solo al volver arriba: no hace
  // falta trackear la dirección del scroll, alcanza con la posición.
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: 'clamp',
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.6, HEADER_HEIGHT],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header — flotante (2026-09-11): antes vivía en el flujo normal y se
          quedaba fijo tapando la pantalla todo el scroll. Ahora es absoluto,
          por ENCIMA del feed (`zIndex`), y se traduce fuera de pantalla según
          `scrollY` — así el feed puede ocupar todo el alto y el header se
          esconde con la transición al bajar (ver `headerTranslateY` arriba). */}
      {/* ⚠️ `colors.bg`, NO `colors.surface` (2026-09-09): en claro son el mismo
          blanco, pero en oscuro `surface` (#0E2646) desentonaba contra el resto
          de la pantalla — la barra de búsqueda/notificaciones quedaba con un
          tono de "caja" en vez de fundirse con el fondo general (#08203E). */}
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
        transform: [{ translateY: headerTranslateY }], opacity: headerOpacity,
      }}>
        {/* ⛔ Acá había un "Hola / <tu nombre>". Se eliminó el 2026-09-02: le
            decía al usuario cómo se llama, que es lo único que ya sabe, y se
            comía la franja más valiosa de la pantalla — la de arriba de todo,
            que ahora es para las próximas partidas. No lo repongas. */}
        {/* Imagotipo a la izquierda (2026-09-11; antes centrado — reemplazaba
            el rótulo "Inicio", 2026-09-10). Reducido un 30% (2026-09-11): a
            40 de alto —igual que los botones de la derecha— quedaba
            demasiado grande para un header; 28 sigue leyéndose bien. */}
        <Image
          source={isDark ? imagotipoDark : imagotipoLight}
          style={{ width: 158, height: 28 }}
          resizeMode="contain"
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={onOpenSearch} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center' }}>
            <Search size={20} color={colors.text} />
          </Pressable>
          <NotificationBell count={unreadNotifications} onPress={onOpenNotifications} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT + 4, paddingBottom: 20, gap: 14 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
            colors={[colors.ink]}
          />
        }
      >
        {/* Feed vertical (scroll hacia abajo): transmisiones en vivo + highlights
            de quienes sigues, como cards a lo ancho. */}
        {/*
          Próximas partidas (mías + de quienes sigo): **lo primero de la
          pantalla**, antes del feed. Estuvo al final y había que bajar todo el
          Inicio para saber cuándo jugabas — el dato que más se consulta y el más
          enterrado.

          Va fuera del `if` del feed vacío a propósito: puedes tener partidas
          agendadas sin seguir a nadie, y ese estado vacío habla del feed.
        */}
        <UpcomingStrip games={upcomingGames} onOpen={onOpenUpcoming} />

        {/* ⚠️ Sin `upcomingGames` en la condición: el estado vacío es el del
            FEED. Con el strip arriba, alguien con partidas agendadas y sin live
            ni highlights tiene que seguir viendo "Tu feed está vacío" abajo. */}
        {liveGames.length === 0 && feedPosts.length === 0 ? (
          <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 56, gap: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Tu feed está vacío</Text>
            <Text style={{ fontSize: 13, color: colors.muted2, textAlign: 'center', lineHeight: 19 }}>
              Sigue a jugadores y clubes para ver aquí sus transmisiones en vivo y sus highlights.
            </Text>
          </View>
        ) : (
          <>
            {/* En vivo · de quienes seguís — cards a lo ancho, apiladas */}
            {liveGames.length > 0 && (
              <>
                <View style={{ paddingHorizontal: 16 }}>
                  {/* Sin acción "Ver todos": las cards ya están todas acá abajo,
                      así que era un botón que no llevaba a nada nuevo. */}
                  <SectionHeader title="En vivo · de quienes sigues" />
                </View>
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                  {liveGames.map((g) => (
                    <LiveGameCard key={g.id} game={g} onPress={onOpenGame} tornaLogo={tornaLogo} isActive={isFocused} />
                  ))}
                </View>
              </>
            )}

            {/* ⚠️ Acá vivía "Próximos". Ahora está ARRIBA (`UpcomingStrip`), antes
                del feed: al final había que bajar toda la pantalla para verlo. No
                lo devuelvas a esta posición. */}

            {/* Highlights · de tus seguidos — cards a lo ancho, apiladas */}
            {feedPosts.length > 0 && (
              <>
                <View style={{ paddingHorizontal: 16 }}>
                  <SectionHeader title="Highlights · de tus seguidos" />
                </View>
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                  {feedPosts.map(p => (
                    <FeedPost
                      key={p.id}
                      post={p}
                      fullWidth
                      isActive={isFocused}
                      onOpen={p.type === 'highlight' && p.videoUrl
                        ? () => setHighlightModal({ url: p.videoUrl!, title: p.caption ?? 'Highlight', id: p.id })
                        : undefined}
                      onLike={p.type === 'highlight' ? () => onLikeHighlight?.(p.id) : undefined}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </Animated.ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}

      {/* No hay `UpcomingMatchSheet` acá: el strip delega en `onOpenUpcoming` y la
          hoja real vive en `MainPlayer`, una sola vez. Tener una copia local era
          lo que arrastraba media docena de props (invitablePlayers,
          suggestedPartners, onSearchPartner, onAccept/RejectApplication…) que el
          Inicio no usa para nada más. */}

      <VideoPreviewModal
        visible={highlightModal !== null}
        url={highlightModal?.url ?? ''}
        title={highlightModal?.title ?? ''}
        durationSeconds={0}
        onClose={() => setHighlightModal(null)}
        highlightId={highlightModal?.id}
        showComments
      />
    </SafeAreaView>
  );
}

/* ─────────── Próximas partidas (strip compacto del tope) ─────────── */

/**
 * Strip horizontal con las próximas partidas —**las mías y las de la gente y
 * los clubes que sigo**— arriba de todo el Inicio.
 *
 * La lista llega ya deduplicada de `GET /game/upcoming-feed`: una partida
 * alcanzable por varios caminos (sigo al club *y* a un jugador) viene una sola
 * vez porque el backend la resuelve con un único `OR`. **No dedupliques acá**;
 * si aparece repetida, el problema está en esa query.
 *
 * ## Por qué acá y por qué chico
 *
 * Esto vivía al final del feed como un carrusel de tiles de 220 px: había que
 * bajar todo el Inicio —pasando por los highlights de otros— para saber cuándo
 * jugabas. Es el dato que más se consulta y era el más enterrado.
 *
 * Arriba tiene que ocupar poco o desplaza al feed, así que la tile es de 132 px
 * y muestra **solo lo que se consulta de un vistazo**: cuándo y dónde. Todo lo
 * demás (jugadores, postulados, gestión) está a un toque, en la misma hoja que
 * usa Juegos → "Mis partidas".
 *
 * ⚠️ **Un toque, no doble toque.** La tile vieja abría con `onDoubleTap`, un
 * gesto que nadie descubre en una tarjeta.
 *
 * ⚠️ Si no hay partidas **no renderiza nada**, ni título ni caja vacía: un hueco
 * fijo arriba del feed le cobraría espacio permanente a quien no tiene ninguna.
 */
function UpcomingStrip({ games, onOpen }: {
  games: UpcomingGameData[];
  onOpen?: (game: UpcomingGameData) => void;
}) {
  const { colors } = useTheme();
  if (games.length === 0) return null;

  return (
    <View testID="upcoming-strip" style={{ gap: 8, paddingTop: 4, paddingBottom: 4 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <SectionHeader title="Próximas partidas" />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {games.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => onOpen?.(g)}
            testID={`upcoming-${g.id}`}
            style={({ pressed }) => ({
              width: 132,
              backgroundColor: colors.surface,
              borderWidth: 1, borderColor: colors.line,
              borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9,
              gap: 2, opacity: pressed ? 0.85 : 1,
            })}
          >
            {!!g.date && (
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.muted2, letterSpacing: 0.4, textTransform: 'uppercase' }} numberOfLines={1}>
                {g.date}
              </Text>
            )}
            <Text style={{ fontSize: 17, fontFamily: fonts.bold, color: colors.text, letterSpacing: -0.3 }} numberOfLines={1}>
              {g.time}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted2 }} numberOfLines={1}>
              {[g.court, g.club].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
