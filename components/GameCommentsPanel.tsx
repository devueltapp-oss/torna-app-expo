/**
 * GameCommentsPanel — hilo de comentarios PÚBLICOS del stream de una partida.
 *
 * Presentacional puro: recibe los datos de `useGameComments` por props. Se usa en
 * dos contextos con la misma instancia de datos:
 *  - `variant="sheet"`   → dentro de un <Modal> en portrait (colores del tema).
 *  - `variant="overlay"` → superpuesto sobre el video en pantalla completa
 *                          landscape (fondo translúcido oscuro, texto blanco).
 *
 * ⚠️ Estos comentarios NO son los del highlight (`HighlightComment`, con threads)
 * ni el chat privado de la partida (`GameChatMessage`). Son `GameComment`: hilo
 * plano y público del stream.
 */
import React from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { X, Send, Minimize2 } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import type { GameComment } from '../api/games';

export interface GameCommentsPanelProps {
  comments: GameComment[];
  loading: boolean;
  sending: boolean;
  /** Devuelve true si se persistió; si es false el texto vuelve al input. */
  onSend: (text: string) => Promise<boolean>;
  onClose?: () => void;
  variant?: 'sheet' | 'overlay';
  title?: string;
  /**
   * Si se pasa, el panel **no deja escribir acá**: el campo se vuelve un botón que
   * llama a esto. Es lo que usa el overlay en landscape — en horizontal el teclado
   * ocupa toda la pantalla y tapa el partido y el hilo, así que comentar devuelve
   * la app a vertical (ver `onComposePress` en `GameDetailScreen`).
   */
  onComposePress?: () => void;
  /** Enfoca el input al montar/activarse (llega desde el compose en landscape). */
  autoFocus?: boolean;
  /** Se llama una vez aplicado el `autoFocus`, para que el padre baje la bandera. */
  onAutoFocusHandled?: () => void;
}

/** ISO → etiqueta corta relativa ("Ahora", "5m", "3h", "2d", o fecha). */
export function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const min = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(then).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function GameCommentsPanel({
  comments, loading, sending, onSend, onClose,
  variant = 'sheet',
  title = 'Comentarios',
  onComposePress,
  autoFocus = false,
  onAutoFocusHandled,
}: GameCommentsPanelProps) {
  const { colors } = useTheme();
  const [text, setText] = React.useState('');
  const listRef = React.useRef<FlatList<GameComment>>(null);
  const inputRef = React.useRef<TextInput>(null);
  const overlay = variant === 'overlay';

  // El foco llega desde landscape: el panel se monta mientras el device todavía
  // está rotando, y un focus() en ese momento se pierde. De ahí el respiro.
  React.useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
      onAutoFocusHandled?.();
    }, 350);
    return () => clearTimeout(t);
  }, [autoFocus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paleta: en overlay el panel flota sobre el video, así que va en oscuro fijo.
  const C = overlay
    ? {
        bg: 'rgba(15,30,71,0.92)',
        text: '#FFFFFF',
        muted: 'rgba(255,255,255,0.6)',
        line: 'rgba(255,255,255,0.14)',
        field: 'rgba(255,255,255,0.10)',
        avatarBg: 'rgba(255,255,255,0.14)',
        avatarFg: colors.accent,
      }
    : {
        bg: colors.bg,
        text: colors.text,
        muted: colors.muted2,
        line: colors.line,
        field: colors.surface,
        avatarBg: colors.ink,
        avatarFg: colors.accent,
      };

  // La lista va `inverted`: el más nuevo es el índice 0 y se dibuja abajo, así
  // que el hilo queda pegado al último comentario sin scrollear a mano. El hook
  // los entrega ascendentes → hay que darlos al revés.
  const ordered = React.useMemo(() => [...comments].reverse(), [comments]);

  async function submit() {
    const value = text.trim();
    if (!value || sending) return;
    setText('');
    // En una lista invertida "el final" (lo más nuevo) es el offset 0.
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    const ok = await onSend(value);
    if (!ok) setText(value); // restaurar si falló, para no perderlo
  }

  const canSend = !!text.trim() && !sending;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: overlay ? 10 : 14,
        borderBottomWidth: 1, borderBottomColor: C.line,
      }}>
        <Text style={{ flex: 1, color: C.text, fontFamily: fonts.bold, fontSize: overlay ? 14 : 16, letterSpacing: -0.2 }}>
          {title}{comments.length > 0 ? ` · ${comments.length}` : ''}
        </Text>
        {onClose && (
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={overlay ? 18 : 20} color={C.text} />
          </Pressable>
        )}
      </View>

      {/* Lista */}
      {loading && comments.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : comments.length === 0 ? (
        // Fuera de la lista: dentro de una `inverted` el vacío saldría dado
        // vuelta (el contenedor lleva un scaleY(-1)).
        <View style={{ flex: 1, paddingTop: 16, paddingHorizontal: 16 }}>
          <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', fontFamily: fonts.regular }}>
            Sé el primero en comentar.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={ordered}
          inverted
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, gap: overlay ? 12 : 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          // Android recicla celdas con transform y las deja en blanco.
          removeClippedSubviews={false}
          renderItem={({ item }) => {
            const who = item.name || item.username || 'Anónimo';
            const size = overlay ? 28 : 34;
            return (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{
                  width: size, height: size, borderRadius: size / 2,
                  backgroundColor: C.avatarBg,
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Text style={{ color: C.avatarFg, fontFamily: fonts.bold, fontSize: overlay ? 11 : 13 }}>
                    {who.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: C.text, fontFamily: fonts.bold, fontSize: overlay ? 12 : 13 }} numberOfLines={1}>
                      {who}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: overlay ? 10 : 11, fontFamily: fonts.regular }}>
                      {relTime(item.createdAt)}
                    </Text>
                  </View>
                  <Text style={{ color: C.text, fontFamily: fonts.regular, fontSize: overlay ? 13 : 14, lineHeight: overlay ? 18 : 20 }}>
                    {item.comment}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Input. En landscape no se escribe acá: el teclado tapa el partido y el
          hilo, así que el campo es un botón que devuelve la app a vertical. */}
      {onComposePress ? (
        <Pressable
          onPress={onComposePress}
          accessibilityRole="button"
          accessibilityLabel="Escribir un comentario en vertical"
          testID="compose-in-portrait"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingHorizontal: 16, paddingVertical: 8,
            borderTopWidth: 1, borderTopColor: C.line,
          }}
        >
          <View style={{
            flex: 1, backgroundColor: C.field, borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 8,
            borderWidth: 1, borderColor: C.line,
          }}>
            <Text style={{ color: C.muted, fontFamily: fonts.regular, fontSize: 13 }} numberOfLines={1}>
              Escribe un comentario...
            </Text>
          </View>
          <View style={{
            width: 36, height: 36, borderRadius: 12, backgroundColor: C.field,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: C.line,
          }}>
            <Minimize2 size={16} color={C.text} />
          </View>
        </Pressable>
      ) : (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 16, paddingVertical: overlay ? 8 : 12,
          borderTopWidth: 1, borderTopColor: C.line,
        }}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="Escribe un comentario..."
            placeholderTextColor={C.muted}
            returnKeyType="send"
            editable={!sending}
            maxLength={500}
            onSubmitEditing={submit}
            style={{
              flex: 1,
              backgroundColor: C.field,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: overlay ? 8 : 10,
              color: C.text,
              fontFamily: fonts.regular,
              fontSize: overlay ? 13 : 14,
              borderWidth: 1, borderColor: C.line,
            }}
          />
          <Pressable
            onPress={submit}
            disabled={!canSend}
            style={{
              width: overlay ? 36 : 42, height: overlay ? 36 : 42, borderRadius: 12,
              backgroundColor: canSend ? colors.accent : C.line,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Send size={overlay ? 16 : 18} color={canSend ? colors.ink : C.muted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      )}
    </View>
  );
}
