import React from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Search, Bell } from 'lucide-react-native';
import { useTheme } from '../theme';
import { SectionHeader } from '../components/ui';
import { LiveGameCard, FeedPost, LiveGameData, UpcomingGameTile } from '../components/cards';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { VideoPreviewModal } from '../components/VideoPreviewModal';
import { UpcomingMatchSheet } from '../components/UpcomingMatchSheet';
import type { FeedPost as FeedPostData, InvitablePlayer, UpcomingGameData, UpcomingGamePlayer } from '../data/types';
import type { ReelSection } from './ReelViewScreen';

const tornaLogo = require('../assets/torna-icon.png');

export type { UpcomingGamePlayer, UpcomingGameData } from '../data/types';

interface Props {
  greeting?: string;
  liveGames: LiveGameData[];
  upcomingGames?: UpcomingGameData[];
  feedPosts?: FeedPostData[];
  onOpenGame?: (id: string) => void;
  onOpenSearch?: () => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  onVerMas?: (section: ReelSection, initialIndex?: number) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenPlayerProfile?: (playerId: string) => void;
  invitablePlayers?: InvitablePlayer[];
  /** Sugerencias por defecto al buscar compañero: gente que seguís / te sigue. */
  suggestedPartners?: InvitablePlayer[];
  /** Búsqueda real de compañero (GET /user/search) rankeada con conexiones primero. */
  onSearchPartner?: (q: string) => Promise<InvitablePlayer[]>;
  /** Abre el chat de la partida (solo participantes). */
  onOpenChat?: (gameId: string, title?: string, readOnly?: boolean) => void;
  onAcceptApplication?: (gameId: string, appId: string) => void;
  onRejectApplication?: (gameId: string, appId: string) => void;
}

/**
 * Player feed home. Shows:
 *   1. "En vivo · de quienes seguís" — horizontal carousel of LiveGameTile.
 *   2. "Próximos · de tus seguidos" — horizontal carousel of upcoming game tiles.
 *   3. "Highlights · de tus seguidos" — horizontal carousel of FeedPost.
 *
 * The Club admin home is NOT here — it lives in `ClubHomeScreen`.
 */
export function HomeScreen({
  greeting = 'Maxi',
  liveGames,
  upcomingGames = [],
  feedPosts = [],
  onOpenGame,
  onOpenSearch,
  onChangeTab,
  activeTab = 'home',
  onVerMas,
  refreshing,
  onRefresh,
  onOpenPlayerProfile,
  invitablePlayers = [],
  suggestedPartners,
  onSearchPartner,
  onOpenChat,
  onAcceptApplication,
  onRejectApplication,
}: Props) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const [highlightModal, setHighlightModal] = React.useState<{ url: string; title: string; id: string } | null>(null);
  const [upcomingSheet, setUpcomingSheet] = React.useState<UpcomingGameData | null>(null);

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
          <Pressable style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={20} color={colors.text} />
            <View style={{ position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live, borderWidth: 2, borderColor: colors.surface }} />
          </Pressable>
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
        {liveGames.length === 0 && feedPosts.length === 0 && upcomingGames.length === 0 ? (
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

            {/* Próximos · de tus seguidos — strip horizontal (secundario) */}
            {upcomingGames.length > 0 && (
              <>
                <View style={{ paddingHorizontal: 16 }}>
                  <SectionHeader title="Próximos · de tus seguidos"
                    action={
                      <Pressable onPress={() => onVerMas?.('upcoming')} hitSlop={10}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentText }}>Ver todos</Text>
                      </Pressable>
                    }/>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                  {upcomingGames.map(g => (
                    <UpcomingGameTile key={g.id} game={g} onDoubleTap={() => setUpcomingSheet(g)} />
                  ))}
                </ScrollView>
              </>
            )}

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

      <UpcomingMatchSheet
        visible={upcomingSheet !== null}
        game={upcomingSheet}
        invitablePlayers={invitablePlayers}
        suggestedPartners={suggestedPartners}
        onSearchPartner={onSearchPartner}
        onOpenChat={onOpenChat}
        onClose={() => setUpcomingSheet(null)}
        onOpenPlayerProfile={onOpenPlayerProfile}
        onAcceptApplication={onAcceptApplication}
        onRejectApplication={onRejectApplication}
      />

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
