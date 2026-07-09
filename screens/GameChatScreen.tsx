import React from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send, Lock } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { AppHeader, Avatar } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useGameChat } from '../hooks/useGameChat';
import type { GameChatMessage } from '../api/games';

export interface GameChatScreenProps {
  gameId: string;
  title?: string;
  /** True si la partida finalizó/canceló → chat de solo lectura (sin input). */
  readOnly?: boolean;
  onBack?: () => void;
}

/** ISO → etiqueta corta de hora ("14:32"). */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Chat grupal de una partida, restringido a sus participantes. Historial por REST
 * (`useGameChat`) + polling corto mientras la pantalla está enfocada. Burbujas
 * alineadas: propias a la derecha (lima), ajenas a la izquierda (con avatar+nombre).
 */
export function GameChatScreen({ gameId, title, readOnly = false, onBack }: GameChatScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const sender = React.useMemo(
    () => (user ? { id: user.id, username: user.username, name: user.name, profilePicture: user.profilePicture } : undefined),
    [user?.id, user?.username, user?.name, user?.profilePicture],
  );
  const { messages, loading, sending, send } = useGameChat(gameId, sender);
  const [text, setText] = React.useState('');
  const listRef = React.useRef<FlatList<GameChatMessage>>(null);

  // Auto-scroll al final con cada mensaje nuevo.
  React.useEffect(() => {
    if (messages.length === 0) return;
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  async function handleSend() {
    const value = text.trim();
    if (!value || sending) return;
    setText('');
    const ok = await send(value);
    if (!ok) setText(value); // restaurar si falló, para no perderlo
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader
        title={title || 'Chat de la partida'}
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text} /></Pressable>}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading && messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
                <Text style={{ color: colors.muted2, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                  Todavía no hay mensajes.{'\n'}Coordiná con tus compañeros de partido.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <MessageBubble message={item} isMine={item.senderId === user?.id} colors={colors} />
            )}
          />
        )}

        {readOnly ? (
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line,
            backgroundColor: colors.bg2,
          }}>
            <Lock size={14} color={colors.muted2} />
            <Text style={{ color: colors.muted2, fontSize: 12, fontFamily: fonts.bold }}>
              La partida finalizó · chat de solo lectura
            </Text>
          </View>
        ) : (
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end', gap: 8,
            paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12,
            borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg,
          }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribí un mensaje…"
              placeholderTextColor={colors.muted}
              multiline
              style={{
                flex: 1, maxHeight: 120, minHeight: 40,
                backgroundColor: colors.bg2, borderRadius: 20, borderWidth: 1, borderColor: colors.line,
                paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
                color: colors.text, fontSize: 14,
              }}
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                backgroundColor: text.trim() && !sending ? colors.accent : colors.line,
              }}
            >
              <Send size={18} color={text.trim() && !sending ? colors.ink : colors.muted2} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message, isMine, colors,
}: {
  message: GameChatMessage;
  isMine: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const displayName = message.name ?? message.username;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-end', gap: 8,
      justifyContent: isMine ? 'flex-end' : 'flex-start',
    }}>
      {!isMine && <Avatar name={displayName} size={28} imageUri={message.profilePicture ?? undefined} />}
      <View style={{
        maxWidth: '76%',
        backgroundColor: isMine ? colors.accent : colors.surface,
        borderWidth: isMine ? 0 : 1, borderColor: colors.line,
        borderRadius: 16,
        borderBottomRightRadius: isMine ? 4 : 16,
        borderBottomLeftRadius: isMine ? 16 : 4,
        paddingHorizontal: 12, paddingVertical: 8,
      }}>
        {!isMine && (
          <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.muted2, marginBottom: 2 }}>
            {displayName}
          </Text>
        )}
        <Text style={{ fontSize: 14, color: isMine ? colors.ink : colors.text, lineHeight: 19 }}>
          {message.content}
        </Text>
        <Text style={{
          fontSize: 10, marginTop: 3, alignSelf: 'flex-end',
          color: isMine ? 'rgba(45,76,117,0.6)' : colors.muted2,
        }}>
          {timeLabel(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}
