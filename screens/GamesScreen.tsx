import React from 'react';
import { View, Text, ScrollView, TextInput, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { useTheme } from '../theme';
import { GameListItem, GameListData } from '../components/cards';
import { EmptyState } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';

type Filter = 'TODAS' | 'LIVE' | 'SCHEDULED' | 'FINISHED';

interface Props {
  games: GameListData[];
  onOpenGame?: (id: string) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  emptyImage?: any;
  role?: 'player' | 'club';
}

const FILTER_LABEL: Record<Filter, string> = {
  TODAS: 'Todas', LIVE: 'En vivo', SCHEDULED: 'Programadas', FINISHED: 'Finalizadas',
};

export function GamesScreen({ games, onOpenGame, onChangeTab, activeTab = 'games', emptyImage, role = 'club' }: Props) {
  const { colors } = useTheme();
  const [filter, setFilter] = React.useState<Filter>('TODAS');
  const [q, setQ] = React.useState('');

  const filtered = games.filter(g => {
    if (filter !== 'TODAS') {
      if (filter === 'FINISHED' && !(g.status === 'FINISHED' || g.status === 'STOPPED')) return false;
      if (filter !== 'FINISHED' && g.status !== filter) return false;
    }
    if (q && !(`${g.id} ${g.court} ${g.cam}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 14 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Juegos</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 }}>
          <Search size={18} color={colors.muted2} />
          <TextInput placeholder="Buscar por ID, cancha o jugador…" placeholderTextColor={colors.muted}
            value={q} onChangeText={setQ}
            style={{ flex: 1, color: colors.text, fontSize: 14, padding: 0 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 12 }}>
          {(Object.keys(FILTER_LABEL) as Filter[]).map(f => {
            const on = filter === f;
            return (
              <Pressable key={f} onPress={() => setFilter(f)}
                style={{
                  backgroundColor: on ? colors.ink : colors.bg2,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
                }}>
                <Text style={{ color: on ? '#FFFFFF' : colors.text2, fontSize: 12, fontWeight: '700' }}>{FILTER_LABEL[f]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered} keyExtractor={g => g.id}
        renderItem={({ item }) => <GameListItem game={item} onPress={onOpenGame} />}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <EmptyState
            title="Sin partidos en este filtro"
            message="Cuando alguien programe o inicie un partido, aparecerá aquí."
            imageSource={emptyImage}
          />
        }
      />

      {onChangeTab && <BottomTabBar role={role} active={activeTab} onChange={onChangeTab}/>}
    </SafeAreaView>
  );
}
