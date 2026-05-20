import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Bell } from 'lucide-react-native';
import { useTheme } from '../theme';
import { SectionHeader, StatusBadge, AvatarStack } from '../components/ui';
import { LiveGameTile, FeedPost, LiveGameData } from '../components/cards';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { fonts } from '../theme/tokens';
import type { FeedPost as FeedPostData } from '../data/mocks';

const tornaLogo = require('../assets/torna-icon.png');

export interface UpcomingGameData {
  id: string;
  time: string;
  court: string;
  club: string;
  players: { username: string; name?: string }[];
  /** What relationship surfaces this game in the feed. */
  following: 'club' | 'player';
  byPlayer?: string;
}

interface Props {
  greeting?: string;
  liveGames: LiveGameData[];
  upcomingGames?: UpcomingGameData[];
  feedPosts?: FeedPostData[];
  onOpenGame?: (id: string) => void;
  onOpenSearch?: () => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
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
}: Props) {
  const { colors } = useTheme();
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

      <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 20, gap: 14 }}>
        {/* En vivo · de quienes seguís */}
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="En vivo · de quienes seguís"
            action={<Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentText }}>Ver todos</Text>}/>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {liveGames.map(g => (
            <LiveGameTile key={g.id} game={g} onPress={onOpenGame} tornaLogo={tornaLogo}/>
          ))}
        </ScrollView>

        {/* Próximos · de tus seguidos */}
        {upcomingGames.length > 0 && (
          <>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHeader title="Próximos · de tus seguidos"
                action={<Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentText }}>Ver todos</Text>}/>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {upcomingGames.map(g => (
                <View key={g.id} style={{
                  width: 220, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
                  borderRadius: 14, padding: 12, gap: 8,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <StatusBadge status="SCHEDULED"/>
                    <Text style={{ fontSize: 11, color: colors.muted2, fontFamily: fonts.mono }}>{g.id}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, letterSpacing: -0.3 }}>{g.time} · {g.court}</Text>
                  <AvatarStack users={g.players} size={26} max={4}/>
                  <Text style={{ color: colors.muted2, fontSize: 12 }}>{g.club}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent }}/>
                    <Text style={{ color: colors.accentText, fontSize: 10, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                      Sigues a {g.following === 'player' ? g.byPlayer : g.club}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Highlights · de tus seguidos */}
        {feedPosts.length > 0 && (
          <>
            <View style={{ paddingHorizontal: 16 }}>
              <SectionHeader title="Highlights · de tus seguidos"
                action={<Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentText }}>Ver todos</Text>}/>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {feedPosts.map(p => <FeedPost key={p.id} post={p}/>)}
            </ScrollView>
          </>
        )}
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}
    </SafeAreaView>
  );
}
