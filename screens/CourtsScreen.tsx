import React from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { CourtCard, CourtData } from '../components/cards';
import { BottomTabBar, TabId } from '../components/BottomTabBar';

interface Props {
  courts: CourtData[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  onOpenSchedule?: (c: CourtData) => void;
  onOpenCourt?: (c: CourtData) => void;
  role?: 'player' | 'club';
}

export function CourtsScreen({ courts, loading = false, error, onRefresh, onChangeTab, activeTab = 'courts', onOpenCourt, onOpenSchedule, role = 'club' }: Props) {
  const { colors } = useTheme();
  const liveCount = courts.filter(c => c.live).length;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 14 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Canchas</Text>
        <Text style={{ color: colors.muted2, fontSize: 13 }}>{courts.length} canchas · {liveCount} en vivo ahora</Text>
      </View>

      <ScrollView refreshControl={onRefresh ? <RefreshControl refreshing={loading} onRefresh={onRefresh}/> : undefined} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {loading && <ActivityIndicator accessibilityLabel="Cargando canchas"/>}
        {!!error && <Text accessibilityRole="alert" style={{color: colors.text}}>{error}</Text>}
        {!loading && !error && !courts.length && <Text style={{color: colors.muted2}}>No hay canchas disponibles para mostrar.</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
          {courts.map(c => (
            <View key={c.id} style={{ width: '100%', paddingHorizontal: 5, paddingVertical: 5, gap: 8 }}>
              <CourtCard court={c} onPress={onOpenCourt}/>
              {role === 'club' && <View style={{flexDirection: 'row', gap: 16}}>
                <Pressable accessibilityRole="button" onPress={() => onOpenCourt?.(c)} style={{padding: 12}}><Text style={{color: colors.accentText}}>Cámaras y disponibilidad</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => onOpenSchedule?.(c)} style={{padding: 12}}><Text style={{color: colors.accentText}}>Horarios</Text></Pressable>
              </View>}
            </View>
          ))}
        </View>
      </ScrollView>

      {onChangeTab && <BottomTabBar role={role} active={activeTab} onChange={onChangeTab}/>}
    </SafeAreaView>
  );
}
