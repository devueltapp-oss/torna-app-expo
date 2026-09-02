import React from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft, CheckCheck, Bell, Radio, CalendarPlus, CalendarX, Video, Trophy, UserPlus,
} from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { AppHeader } from '../components/ui';
import type { AppNotification, AppNotificationType } from '../api/notifications';

export interface NotificationsScreenProps {
  items: AppNotification[];
  loading: boolean;
  hasMore?: boolean;
  unreadCount: number;
  onRefresh: () => void;
  onEndReached?: () => void;
  onPress: (item: AppNotification) => void;
  onMarkAllRead: () => void;
  onBack: () => void;
}

/** ISO → etiqueta relativa corta. Mismo criterio que el inbox de Chats. */
function whenLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Ayer';
  if (days < 7) return d.toLocaleDateString('es', { weekday: 'short' });
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

/** Un ícono por tipo: de un vistazo se distingue "está en vivo" de "te cancelaron". */
const ICONS: Record<AppNotificationType, typeof Bell> = {
  STREAMING_STARTED: Radio,
  GAME_SCHEDULED: CalendarPlus,
  GAME_PLAYER_ADDED: CalendarPlus,
  RECORDING_READY: Video,
  GAME_FINISHED: Trophy,
  GAME_CANCELLED: CalendarX,
  GAME_PLAYER_LEFT: CalendarX,
  GAME_PAIR_CANCELLED: CalendarX,
  GAME_APPLICATION_RECEIVED: UserPlus,
};

/**
 * Campanita: historial de notificaciones (partidas de gente que seguís, tus partidas,
 * grabaciones, postulaciones). **Los chats no están acá** — tienen su propia pestaña
 * con no leídos.
 *
 * Presentacional pura (no importa `api/*`): los datos y las acciones llegan por props
 * desde `NotificationsContainer` en `App.tsx`.
 */
export function NotificationsScreen({
  items, loading, hasMore = false, unreadCount,
  onRefresh, onEndReached, onPress, onMarkAllRead, onBack,
}: NotificationsScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader
        title="Notificaciones"
        left={
          <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Volver">
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
        }
        right={
          unreadCount > 0 ? (
            <Pressable onPress={onMarkAllRead} hitSlop={10} accessibilityLabel="Marcar todas como leídas">
              <CheckCheck size={22} color={colors.text} />
            </Pressable>
          ) : undefined
        }
      />

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: 12, gap: 6, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={loading && items.length > 0} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <NotificationRow item={item} onPress={() => onPress(item)} />
        )}
        ListFooterComponent={
          hasMore ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} /> : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 72, paddingHorizontal: 32, gap: 10 }}>
              <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={40} color={colors.ink} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 16, fontFamily: fonts.bold, color: colors.text }}>
                No tienes notificaciones
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted2, textAlign: 'center', lineHeight: 19 }}>
                Aquí vas a ver cuando alguien que sigues agende una partida o empiece a transmitir.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const { colors } = useTheme();
  const Icon = ICONS[item.type] ?? Bell;
  const unread = !item.readAt;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14,
        // No leída = un tono distinto de la MISMA paleta (azul/lima/blanco), sin colores nuevos.
        backgroundColor: pressed ? colors.bg2 : unread ? colors.bg2 : colors.surface,
        borderWidth: 1, borderColor: unread ? colors.lineStrong : colors.line,
      })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={colors.accent} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: fonts.bold, color: colors.text }} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted2 }}>{whenLabel(item.createdAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <Text style={{ flex: 1, fontSize: 13, color: colors.muted2 }} numberOfLines={2}>
            {item.body}
          </Text>
          {unread && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
          )}
        </View>
      </View>
    </Pressable>
  );
}
