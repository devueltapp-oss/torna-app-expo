/**
 * ShareGameSheet — mandar un partido por chat a gente de la app.
 *
 * Lista tus conversaciones 1-a-1 (las mismas del inbox) y manda un DM con el
 * partido adjunto: el receptor ve una **tarjeta abrible**, no un texto suelto
 * (`DirectMessage.gameId`, ver `api/chat.ts`).
 *
 * Se pueden elegir **varias personas**: compartir un partido en vivo es algo que
 * se hace en el momento y a más de uno, y obligar a repetir el flujo por cada
 * persona sería absurdo.
 *
 * Mismo patrón visual que `FollowListSheet`/`ConfirmSheet`: Modal transparente,
 * velo azul de marca, hoja de abajo con drag handle.
 *
 * ⚠️ Fuera de la app (WhatsApp y compañía) **todavía no**: haría falta una URL
 * pública del partido, que hoy no existe. Mandar un link que no abre nada es peor
 * que no ofrecerlo. El botón se suma acá cuando exista esa URL.
 */
import React from 'react';
import { Modal, View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { Check, Send } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar } from './ui';
import type { InboxItem } from '../api/chat';

export interface ShareGameSheetProps {
  visible: boolean;
  /** Conversaciones del inbox; se usan solo los DMs (a un chat grupal no se comparte). */
  items: InboxItem[];
  loading?: boolean;
  onClose: () => void;
  /** Manda el partido a cada UID. Devuelve true si salió bien. */
  onSend: (userIds: string[]) => Promise<boolean>;
}

export function ShareGameSheet({ visible, items, loading = false, onClose, onSend }: ShareGameSheetProps) {
  const { colors, radii } = useTheme();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [sending, setSending] = React.useState(false);

  // Al cerrar se limpia: abrir de nuevo no debe arrastrar la selección anterior.
  React.useEffect(() => {
    if (!visible) { setSelected([]); setSending(false); }
  }, [visible]);

  const people = React.useMemo(
    () => items.filter((it) => it.kind === 'dm' && !!it.otherUserId),
    [items],
  );

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const submit = async () => {
    if (selected.length === 0 || sending) return;
    setSending(true);
    const ok = await onSend(selected);
    setSending(false);
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(45,76,117,0.45)' }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: colors.bg,
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28,
            maxHeight: '75%',
          }}
        >
          <View style={{
            alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
            backgroundColor: colors.line, marginBottom: 16,
          }} />

          <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.text, letterSpacing: -0.3 }}>
            Compartir partido
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted2, marginTop: 4, marginBottom: 14 }}>
            Se envía por chat, con el partido adjunto para que lo abran de una.
          </Text>

          {loading && people.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : people.length === 0 ? (
            <Text style={{ color: colors.muted2, fontSize: 13, textAlign: 'center', paddingVertical: 28, lineHeight: 19 }}>
              Todavía no tenés chats con nadie.{'\n'}Escribile a alguien desde su perfil y después vas a poder compartirle partidos.
            </Text>
          ) : (
            <FlatList
              data={people}
              keyExtractor={(it) => it.otherUserId!}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const id = item.otherUserId!;
                const on = selected.includes(id);
                return (
                  <Pressable
                    onPress={() => toggle(id)}
                    testID={`share-to-${id}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingVertical: 10, opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Avatar name={item.title} size={42} imageUri={item.avatar ?? undefined} />
                    <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={{
                      width: 24, height: 24, borderRadius: 12,
                      borderWidth: on ? 0 : 1.5, borderColor: colors.lineStrong,
                      backgroundColor: on ? colors.accent : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {on && <Check size={15} color={colors.ink} strokeWidth={3} />}
                    </View>
                  </Pressable>
                );
              }}
            />
          )}

          {people.length > 0 && (
            <Pressable
              onPress={submit}
              disabled={selected.length === 0 || sending}
              accessibilityRole="button"
              testID="share-send"
              style={({ pressed }) => ({
                marginTop: 12, height: 50, borderRadius: radii.xl,
                backgroundColor: selected.length === 0 ? colors.bg3 : colors.accent,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: pressed || sending ? 0.85 : 1,
              })}
            >
              {sending ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <>
                  <Send size={16} color={selected.length === 0 ? colors.muted : colors.ink} />
                  <Text style={{
                    fontFamily: fonts.bold, fontSize: 14,
                    color: selected.length === 0 ? colors.muted : colors.ink,
                  }}>
                    {selected.length > 1 ? `Enviar a ${selected.length}` : 'Enviar'}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
