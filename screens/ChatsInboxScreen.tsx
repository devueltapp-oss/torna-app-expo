import React from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PenSquare, Users, MessageCircle } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { AppHeader, Avatar } from '../components/ui';
import { BottomTabBar, TabId, Role } from '../components/BottomTabBar';
import type { InboxItem } from '../api/chat';

export interface ChatsInboxScreenProps {
  items: InboxItem[];
  loading: boolean;
  onOpenDm: (otherUserId: string, title: string) => void;
  onOpenGame: (gameId: string, title: string, readOnly: boolean) => void;
  onNewChat: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  activeTab?: TabId;
  onChangeTab?: (id: TabId) => void;
  role?: Role;
}

/** ISO → etiqueta relativa corta ("14:32", "Ayer", "12 mar"). */
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

/** Las dos bandejas: chats grupales de partidas y DMs 1-a-1. */
type InboxFilter = 'game' | 'dm';

/**
 * Inbox de Chats, separado en dos bandejas con un segmented control:
 * **Partidas** (chats grupales de `GameChatMessage`, cualquier estado) y **Amigos**
 * (DMs 1-a-1). Tap → abre el hilo correspondiente. "Nuevo chat" abre el buscador de
 * usuarios para iniciar un DM.
 */
export function ChatsInboxScreen({
  items, loading, onOpenDm, onOpenGame, onNewChat, onRefresh, refreshing,
  activeTab = 'chats', onChangeTab, role = 'player',
}: ChatsInboxScreenProps) {
  const { colors } = useTheme();
  const [filter, setFilter] = React.useState<InboxFilter>('game');

  const visible = React.useMemo(() => items.filter((it) => it.kind === filter), [items, filter]);
  // No leídos por bandeja (los grupos de partida hoy siempre traen 0 — no hay cursor
  // de lectura en el backend para el chat grupal).
  const unread = React.useMemo(() => {
    const sum = (k: InboxFilter) =>
      items.reduce((acc, it) => (it.kind === k ? acc + (it.unreadCount || 0) : acc), 0);
    return { game: sum('game'), dm: sum('dm') };
  }, [items]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader
        title="Chats"
        right={
          <Pressable onPress={onNewChat} hitSlop={10} accessibilityLabel="Nuevo chat">
            <PenSquare size={22} color={colors.text} />
          </Pressable>
        }
      />

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 }}>
        <FilterTab
          label="Partidas" icon={Users} on={filter === 'game'} badge={unread.game}
          onPress={() => setFilter('game')}
        />
        <FilterTab
          label="Amigos" icon={MessageCircle} on={filter === 'dm'} badge={unread.dm}
          onPress={() => setFilter('dm')}
        />
      </View>

      <FlatList
        data={visible}
        keyExtractor={(it) => `${it.kind}:${it.id}`}
        contentContainerStyle={{ padding: 12, gap: 6, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <ChatRow
            item={item}
            colors={colors}
            onPress={() =>
              item.kind === 'dm'
                ? item.otherUserId && onOpenDm(item.otherUserId, item.title)
                : onOpenGame(item.id, item.title, item.readOnly)
            }
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 72, paddingHorizontal: 32, gap: 10 }}>
              <View style={{ width: 88, height: 88, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                {filter === 'game'
                  ? <Users size={40} color={colors.ink} strokeWidth={2.2} />
                  : <MessageCircle size={40} color={colors.ink} strokeWidth={2.2} />}
              </View>
              <Text style={{ fontSize: 16, fontFamily: fonts.bold, color: colors.text }}>
                {filter === 'game' ? 'Sin chats de partidas' : 'Sin chats con amigos'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted2, textAlign: 'center', lineHeight: 19 }}>
                {filter === 'game'
                  ? 'Cuando entres a una partida vas a poder chatear acá con los jugadores.'
                  : 'Iniciá una conversación con "Nuevo chat" o desde el perfil de un jugador o club.'}
              </Text>
            </View>
          ) : null
        }
      />

      {onChangeTab && <BottomTabBar role={role} active={activeTab} onChange={onChangeTab} />}
    </SafeAreaView>
  );
}

/** Botón de bandeja (Partidas / Amigos): activo = lima, inactivo = contorno. */
function FilterTab({
  label, icon: Icon, on, badge, onPress,
}: {
  label: string;
  icon: typeof Users;
  on: boolean;
  badge: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: 12,
        backgroundColor: on ? colors.primary : colors.surface,
        borderWidth: on ? 0 : 1, borderColor: colors.line,
      }}
    >
      <Icon size={16} color={on ? colors.primaryFg : colors.muted2} />
      <Text style={{ fontSize: 13, fontFamily: fonts.bold, color: on ? colors.primaryFg : colors.text }}>
        {label}
      </Text>
      {badge > 0 && (
        <View style={{
          minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
          backgroundColor: on ? colors.primaryFg : colors.accent,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 10, fontFamily: fonts.bold, color: on ? colors.primary : colors.ink }}>
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function ChatRow({
  item, colors, onPress,
}: {
  item: InboxItem;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}) {
  const isGame = item.kind === 'game';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14,
        backgroundColor: pressed ? colors.bg2 : colors.surface,
        borderWidth: 1, borderColor: colors.line,
      })}
    >
      {isGame ? (
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Users size={20} color={colors.accent} />
        </View>
      ) : (
        <Avatar name={item.title} size={46} imageUri={item.avatar ?? undefined} />
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ flex: 1, fontSize: 15, fontFamily: fonts.bold, color: colors.text }} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 11, color: colors.muted2 }}>{whenLabel(item.lastMessageAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <Text
            style={{ flex: 1, fontSize: 13, color: item.unreadCount > 0 ? colors.text : colors.muted2 }}
            numberOfLines={1}
          >
            {item.lastMessage ?? (isGame ? 'Chat de la partida' : 'Sin mensajes')}
          </Text>
          {item.unreadCount > 0 && (
            <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.ink }}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
