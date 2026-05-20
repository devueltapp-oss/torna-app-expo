import React from 'react';
import { View, Text, ScrollView, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { useTheme } from '../theme';
import { PlayerListItem, PlayerData } from '../components/cards';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { EmptyState } from '../components/ui';

interface Props {
  players: PlayerData[];
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  role?: 'player' | 'club';
}

export function PlayersScreen({ players, onChangeTab, activeTab = 'players', role = 'club' }: Props) {
  const { colors } = useTheme();
  const [q, setQ] = React.useState('');
  const filtered = players.filter(p => !q || `${p.name} ${p.username} ${p.email || ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 14 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Jugadores</Text>
        <Text style={{ color: colors.muted2, fontSize: 13 }}>{players.length} jugadores siguen a tu club</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 }}>
          <Search size={18} color={colors.muted2} />
          <TextInput placeholder="Buscar por nombre, username o email…" placeholderTextColor={colors.muted}
            value={q} onChangeText={setQ}
            style={{ flex: 1, color: colors.text, fontSize: 14, padding: 0 }} />
        </View>
      </View>

      <FlatList
        data={filtered} keyExtractor={p => p.id}
        renderItem={({ item }) => <PlayerListItem player={item}/>}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <EmptyState title="Sin jugadores" message="Cuando alguien siga a tu club, aparecerá aquí." />
        }
      />

      {onChangeTab && <BottomTabBar role={role} active={activeTab} onChange={onChangeTab}/>}
    </SafeAreaView>
  );
}
