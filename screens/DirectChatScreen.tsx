import React from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Send } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { AppHeader, Avatar, MessageLikeButton, JumpToLatestButton } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useDirectChat } from '../hooks/useDirectChat';
import type { DirectMessage } from '../api/chat';

export interface DirectChatScreenProps {
  /** Firebase UID del otro usuario. */
  userId: string;
  title?: string;
  onBack?: () => void;
}

/** ISO → etiqueta corta de hora ("14:32"). */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Chat directo 1-a-1 con otro usuario. Mismo layout que `GameChatScreen` pero con
 * `useDirectChat` y sin modo solo-lectura (los DMs siempre se pueden escribir).
 * La lista va **`inverted`** por el mismo motivo — ver la nota en `GameChatScreen`.
 */
export function DirectChatScreen({ userId, title, onBack }: DirectChatScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const sender = React.useMemo(
    () => (user ? { id: user.id, username: user.username, name: user.name, profilePicture: user.profilePicture } : undefined),
    [user?.id, user?.username, user?.name, user?.profilePicture],
  );
  const { messages, loading, sending, send, toggleLike } = useDirectChat(userId, sender);
  const [text, setText] = React.useState('');
  const listRef = React.useRef<FlatList<DirectMessage>>(null);
  const [scrolledUp, setScrolledUp] = React.useState(false);

  // La lista se dibuja `inverted`: el índice 0 es el mensaje MÁS NUEVO y queda
  // abajo. El hook los entrega ascendentes, así que hay que darlos al revés.
  const ordered = React.useMemo(() => [...messages].reverse(), [messages]);

  /** En una lista invertida, "el final" (lo más nuevo) es el offset 0. */
  const scrollToLatest = React.useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  async function handleSend() {
    const value = text.trim();
    if (!value || sending) return;
    setText('');
    scrollToLatest(); // si estabas leyendo hacia arriba, tu propio mensaje te baja
    const ok = await send(value);
    if (!ok) setText(value); // restaurar si falló, para no perderlo
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader
        title={title || 'Chat'}
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
        ) : messages.length === 0 ? (
          // Estado vacío aparte de la lista: dentro de una `inverted` saldría
          // dado vuelta (el contenedor lleva un scaleY(-1)).
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={{ color: colors.muted2, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
              Todavía no hay mensajes.{'\n'}Escribí para empezar la conversación.
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={listRef}
              data={ordered}
              inverted
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              keyboardShouldPersistTaps="handled"
              // Android recicla celdas con transform y las deja en blanco.
              removeClippedSubviews={false}
              scrollEventThrottle={32}
              onScroll={(e) => setScrolledUp(e.nativeEvent.contentOffset.y > 240)}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  isMine={item.senderId === user?.id}
                  colors={colors}
                  onToggleLike={toggleLike}
                />
              )}
            />
            {scrolledUp && <JumpToLatestButton onPress={scrollToLatest} />}
          </View>
        )}

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message, isMine, colors, onToggleLike,
}: {
  message: DirectMessage;
  isMine: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  onToggleLike: (messageId: string) => void;
}) {
  const displayName = message.name ?? message.username;
  return (
    <View style={{ gap: 2 }}>
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
      {/* Corazón fuera de la burbuja (adentro competiría con el fondo lima de
          los mensajes propios). En un DM el total es 0, 1 ó 2. */}
      <View style={{ paddingLeft: isMine ? 0 : 36, paddingRight: isMine ? 2 : 0 }}>
        <MessageLikeButton
          count={message.likesCount ?? 0}
          liked={message.likedByMe ?? false}
          align={isMine ? 'right' : 'left'}
          onPress={() => onToggleLike(message.id)}
        />
      </View>
    </View>
  );
}
