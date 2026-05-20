import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { CourtCard, CourtData } from '../components/cards';
import { BottomTabBar, TabId } from '../components/BottomTabBar';

interface Props {
  courts: CourtData[];
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  onOpenCourt?: (c: CourtData) => void;
  role?: 'player' | 'club';
}

export function CourtsScreen({ courts, onChangeTab, activeTab = 'courts', onOpenCourt, role = 'club' }: Props) {
  const { colors } = useTheme();
  const liveCount = courts.filter(c => c.live).length;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 14 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Canchas</Text>
        <Text style={{ color: colors.muted2, fontSize: 13 }}>{courts.length} canchas · {liveCount} en vivo ahora</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
          {courts.map(c => (
            <View key={c.id} style={{ width: '50%', paddingHorizontal: 5, paddingVertical: 5 }}>
              <CourtCard court={c} onPress={onOpenCourt}/>
            </View>
          ))}
        </View>
      </ScrollView>

      {onChangeTab && <BottomTabBar role={role} active={activeTab} onChange={onChangeTab}/>}
    </SafeAreaView>
  );
}
