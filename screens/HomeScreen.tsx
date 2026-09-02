import React from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Search } from 'lucide-react-native';
import { useTheme } from '../theme';
import { SectionHeader, NotificationBell } from '../components/ui';
import { LiveGameCard, FeedPost, LiveGameData } from '../components/cards';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { VideoPreviewModal } from '../components/VideoPreviewModal';
import type { FeedPost as FeedPostData, UpcomingGamePlayer, UpcomingGameData } from '../data/types';

const tornaLogo = require('../assets/torna-icon.png');

export type { UpcomingGamePlayer, UpcomingGameData } from '../data/types';

interface Props {
  greeting?: string;
  liveGames: LiveGameData[];
  feedPosts?: FeedPostData[];
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
 * Player feed home — **lo que hacen los demás**:
 *   1. "En vivo · de quienes seguís"
 *   2. "Highlights · de tus seguidos"
 *
 * ⚠️ **Las partidas propias NO van acá** (2026-09-02). Había una sección
 * "Próximos" al final del feed: para ver tu propia partida de esta tarde había
 * que scrollear los highlights de otros primero, y era una copia de
 * Juegos → "Mis partidas", que además deja gestionarlas. Tus partidas son un hub
 * aparte; mezclarlas con el feed era lo que las enterraba.
 *
 * Con esa sección se fueron sus props (`upcomingGames`, `invitablePlayers`,
 * `suggestedPartners`, `onSearchPartner`, `onOpenChat`, `onAccept/RejectApplication`,
 * `onOpenPlayerProfile`, `onVerMas`) y el `UpcomingMatchSheet` local: solo
 * alimentaban ese carrusel y la hoja que abría su doble tap.
 *
 * The Club admin home is NOT here — it lives in `ClubHomeScreen`.
 */
export function HomeScreen({
  greeting = 'Maxi',
  liveGames,
  feedPosts = [],
  onOpenGame,
  onOpenSearch,
  onChangeTab,
  activeTab = 'home',
  refreshing,
  onRefresh,
  unreadNotifications = 0,
  onOpenNotifications,
}: Props) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [highlightModal, setHighlightModal] = React.useState<{ url: string; title: string; id: string } | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
      }}>
        <View>
          <Text style={{ color: colors.muted2, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' }}>Hola</Text>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }}>{greeting}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={onOpenSearch} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center' }}>
            <Search size={20} color={colors.text} />
          </Pressable>
          <NotificationBell count={unreadNotifications} onPress={onOpenNotifications} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 20, gap: 14 }}
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
            de quienes seguís, como cards a lo ancho. */}
        {/* ⚠️ Sin `upcomingGames` en la condición: al sacar esa sección, dejarlo
            acá haría que alguien con partidas agendadas y sin live ni highlights
            no viera **ni el contenido ni el estado vacío** — una pantalla en blanco. */}
        {liveGames.length === 0 && feedPosts.length === 0 ? (
          <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 56, gap: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Tu feed está vacío</Text>
            <Text style={{ fontSize: 13, color: colors.muted2, textAlign: 'center', lineHeight: 19 }}>
              Seguí a jugadores y clubes para ver acá sus transmisiones en vivo y sus highlights.
            </Text>
          </View>
        ) : (
          <>
            {/* En vivo · de quienes seguís — cards a lo ancho, apiladas */}
            {liveGames.length > 0 && (
              <>
                <View style={{ paddingHorizontal: 16 }}>
                  <SectionHeader title="En vivo · de quienes seguís" />
                </View>
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                  {liveGames.map((g) => (
                    <LiveGameCard key={g.id} game={g} onPress={onOpenGame} tornaLogo={tornaLogo} isActive={isFocused} />
                  ))}
                </View>
              </>
            )}

            {/*
              ⚠️ Acá vivía "Próximos", un carrusel con las partidas propias
              agendadas. **Se eliminó el 2026-09-02 y no hay que reponerlo.**

              Quedaba al final del feed, así que solo aparecía después de bajar
              todo el Inicio — o sea que para ver tu propia partida de esta tarde
              tenías que scrollear los highlights de otros. Y era una copia: las
              mismas partidas ya están en **Juegos → "Mis partidas"**
              (`GET /game/mine` devuelve SCHEDULED/WAITING/LIVE del usuario),
              que además deja gestionarlas y ver los postulados.

              El Inicio es el feed de lo que hacen los demás; tus partidas son un
              hub aparte. Mezclarlos era lo que enterraba lo tuyo.
            */}

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
                      onDoubleTap={p.type === 'highlight' && p.videoUrl
                        ? () => setHighlightModal({ url: p.videoUrl!, title: p.caption ?? 'Highlight', id: p.id })
                        : undefined}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}

      {/* El `UpcomingMatchSheet` de acá se eliminó junto con la sección "Próximos":
          solo lo abría el doble tap de aquellas tiles, así que quedó inalcanzable.
          El que se usa vive en `MainPlayer`, y se abre desde Juegos → Mis partidas. */}

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
