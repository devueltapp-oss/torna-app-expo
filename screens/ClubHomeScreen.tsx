import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { SectionHeader, NotificationBell } from '../components/ui';
import { LiveGameTile, LiveGameData } from '../components/cards';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import type { ClubTodayReservation } from '../data/types';

const tornaLogo = require('../assets/torna-icon.png');

interface Props {
  clubName: string;
  liveGames: LiveGameData[];
  todayReservations: ClubTodayReservation[];
  onOpenGame?: (id: string) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  /** No leídos de la campanita (GET /notification/unread-count). */
  unreadNotifications?: number;
  onOpenNotifications?: () => void;
}

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
  onOpenGame,
  onChangeTab,
  activeTab = 'home',
  unreadNotifications = 0,
  onOpenNotifications,
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
        <NotificationBell count={unreadNotifications} onPress={onOpenNotifications}/>
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 20, gap: 14 }}>
        {/* Sin fila de KPI: los tres números (en vivo, viewers, a cobrar) salían de
            un DEFAULT_STATS inventado —2 / 65 / 3— porque la pantalla todavía no
            está cableada a ningún endpoint. Cuando lo esté, "En vivo" sale de
            liveGames.length y "A cobrar" de todayReservations; los espectadores no
            se miden en ningún lado (ver "Espectadores" en CLAUDE.md). */}

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

/* `StatCard` se borró junto con la fila de KPI: su único uso eran los tres números
   inventados. Si vuelven los KPI, van con datos reales o no van. */

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
