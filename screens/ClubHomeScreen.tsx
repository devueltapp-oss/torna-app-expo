import React from 'react';
import { View, Text, ScrollView, Pressable, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { useTheme } from '../theme';
import { NotificationBell } from '../components/ui';
import { LiveGameData } from '../components/cards';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { ClubAgendaSection } from '../components/ClubAgendaSection';
import type { GameListData } from '../components/cards';
import { SocialFeedSections } from '../components/SocialFeedSections';
import type { ClubTodayReservation, FeedPost as FeedPostData } from '../data/types';

const tornaLogo = require('../assets/torna-icon.png');

interface Props {
  clubName: string;
  /** Partidas EN VIVO de ESTE club (carrusel "En vivo en tu club"). */
  liveGames: LiveGameData[];
  todayReservations: ClubTodayReservation[];
  onOpenGame?: (id: string) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  /** No leídos de la campanita (GET /notification/unread-count). */
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
  games?: GameListData[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onPrepareGame?: (id: string) => void;
  onCreateGame?: () => void;
  /**
   * Feed de seguidos — paridad con `HomeScreen`: un club también sigue y es
   * seguido. `GET /game/live`, mismo hook (`useLiveGames`) que usa el player
   * — distinto de `liveGames` de arriba, que es EN VIVO de este club.
   */
  followedLiveGames?: LiveGameData[];
  feedPosts?: FeedPostData[];
  onLikeHighlight?: (id: string) => void;
  onOpenSearch?: () => void;
  /** Pausa los previews de video cuando esta pantalla no está visible. */
  isActive?: boolean;
}

/**
 * Club admin home. Surfaces live activity on this club's courts, today's
 * reservations with payment status, and quick KPIs. La agenda y la preparación de cámaras están en la app para usuarios club.
 *
 * In production:
 *   GET /clubs/:id/dashboard → stats
 *   GET /clubs/:id/today     → ClubTodayReservation[]
 *   GET /feed/live?clubId=:id → LiveGameData[]
 */
export function ClubHomeScreen({
  clubName,
  liveGames,
  todayReservations,
  onOpenGame,
  onChangeTab,
  activeTab = 'home',
  unreadNotifications = 0,
  onOpenNotifications,
  games = [], loading = false, error, onRefresh, onPrepareGame, onCreateGame,
  followedLiveGames = [],
  feedPosts = [],
  onLikeHighlight,
  onOpenSearch,
  isActive = true,
}: Props) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: colors.surface, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <View style={{
            width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF',
            borderWidth: 1, borderColor: colors.line,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Image source={tornaLogo} style={{ width: 30, height: 30 }}/>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: colors.muted2, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' }}>Hola</Text>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1}>{clubName}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Buscar jugadores/clubes para seguir — mismo ícono/tamaño que el
              header de HomeScreen (paridad club/player, 2026-10-02). */}
          {onOpenSearch && (
            <Pressable onPress={onOpenSearch} testID="club-open-search" accessibilityLabel="Buscar" style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center' }}>
              <Search size={20} color={colors.text} />
            </Pressable>
          )}
          <NotificationBell count={unreadNotifications} onPress={onOpenNotifications}/>
        </View>
      </View>

      <ScrollView refreshControl={onRefresh ? <RefreshControl refreshing={loading} onRefresh={onRefresh} /> : undefined} contentContainerStyle={{ paddingTop: 4, paddingBottom: 20, gap: 14 }}>
        <ClubAgendaSection games={games} loading={loading} error={error}
          onPrepare={onPrepareGame} onWatch={onOpenGame} onCreate={onCreateGame}
          onSeeAll={() => onChangeTab?.('games')} />
        <SocialFeedSections
          liveGames={followedLiveGames}
          feedPosts={feedPosts}
          onOpenGame={onOpenGame}
          onLikeHighlight={onLikeHighlight}
          isActive={isActive}
          tornaLogo={tornaLogo}
          emptyState={
            <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 32, gap: 6 }}>
              <Text style={{ fontSize: 13, color: colors.muted2, textAlign: 'center', lineHeight: 19 }}>
                Seguí jugadores y clubes para ver acá sus transmisiones y highlights.
              </Text>
            </View>
          }
        />
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="club"/>}
    </SafeAreaView>
  );
}

