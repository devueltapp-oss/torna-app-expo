import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import { useTheme } from '../theme';
import { SectionHeader } from '../components/ui';
import { LiveGameTile, LiveGameData } from '../components/cards';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import type { ClubTodayReservation } from '../data/types';

const tornaLogo = require('../assets/torna-icon.png');

interface Props {
  clubName: string;
  liveGames: LiveGameData[];
  todayReservations: ClubTodayReservation[];
  stats?: {
    liveCount: number;
    courtsTotal: number;
    viewers: number;
    viewersDelta: number;
    pendingPayments: number;
  };
  onOpenGame?: (id: string) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
}

const DEFAULT_STATS: NonNullable<Props['stats']> = {
  liveCount: 2, courtsTotal: 8, viewers: 65, viewersDelta: 18, pendingPayments: 3,
};

/**
 * Club admin home. Surfaces live activity on this club's courts, today's
 * reservations with payment status, and quick KPIs. No CRUD — court/camera
 * management lives in the external admin panel.
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
  stats = DEFAULT_STATS,
  onOpenGame,
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
        <Pressable style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={20} color={colors.text}/>
          <View style={{ position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live, borderWidth: 2, borderColor: colors.surface }}/>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 20, gap: 14 }}>
        {/* Stat cards */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
          <StatCard label="En vivo" value={stats.liveCount} sub={`de ${stats.courtsTotal} canchas`} accent/>
          <StatCard label="Viewers" value={stats.viewers} sub={`+${stats.viewersDelta} vs ayer`}/>
          <StatCard label="A cobrar" value={stats.pendingPayments} sub="reservas hoy" warn/>
        </View>

        {/* Live now — horizontal carousel of tiles */}
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="En vivo en tu club"
            action={<Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentText }}>Ver todos</Text>}/>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {liveGames.map(g => (
            <LiveGameTile key={g.id} game={g} onPress={onOpenGame} tornaLogo={tornaLogo}/>
          ))}
        </ScrollView>

        {/* Today's reservations */}
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Próximas reservas · hoy"
            action={<Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentText }}>Ver todas</Text>}/>
        </View>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {todayReservations.map(r => <ReservationRow key={r.id} r={r}/>)}
        </View>
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="club"/>}
    </SafeAreaView>
  );
}

function StatCard({ label, value, sub, accent, warn }: { label: string; value: number; sub: string; accent?: boolean; warn?: boolean }) {
  const { colors } = useTheme();
  const valueColor = accent ? colors.accentText : warn ? colors.warnFg : colors.text;
  return (
    <View style={{
      flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    }}>
      <Text style={{ color: colors.muted2, fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ color: valueColor, fontSize: 22, fontWeight: '800', marginTop: 4, lineHeight: 22 }}>{value}</Text>
      <Text style={{ color: colors.muted2, fontSize: 11, marginTop: 4 }}>{sub}</Text>
    </View>
  );
}

function ReservationRow({ r }: { r: ClubTodayReservation }) {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10,
    }}>
      <View style={{
        width: 48, height: 48, borderRadius: 12, backgroundColor: colors.bg2,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, lineHeight: 14 }}>{r.time}</Text>
        <Text style={{ fontSize: 9, color: colors.muted2, marginTop: 3, fontWeight: '700', letterSpacing: 0.6 }}>HOY</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontWeight: '800', fontSize: 14, color: colors.text }}>{r.court}</Text>
        <Text style={{ fontSize: 12, color: colors.muted2, marginTop: 1 }} numberOfLines={1}>
          {r.bookedBy} · {r.partner}
          {r.mode === 'search-opponents' && (
            <Text style={{ color: colors.accentText }}> · buscando rivales</Text>
          )}
        </Text>
      </View>
      <View style={{
        backgroundColor: r.paymentPending ? colors.warnBg : colors.okBg,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
      }}>
        <Text style={{ color: r.paymentPending ? colors.warnFg : colors.okFg, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>
          {r.paymentPending ? 'A COBRAR' : 'PAGADA'}
        </Text>
      </View>
    </View>
  );
}
