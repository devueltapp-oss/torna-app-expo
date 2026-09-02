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
import { Modal, View, Text, Pressable, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { Check, Search, Send } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar } from './ui';
import type { InboxItem } from '../api/chat';

/** Alguien a quien se le puede mandar el partido. Sale del inbox o de la búsqueda. */
export interface SharePerson {
  id: string;
  name: string;
  avatar?: string;
}

export interface ShareGameSheetProps {
  visible: boolean;
  /** Conversaciones del inbox; se usan solo los DMs (a un chat grupal no se comparte). */
  items: InboxItem[];
  loading?: boolean;
  onClose: () => void;
  /** Manda el partido a cada UID. Devuelve true si salió bien. */
  onSend: (userIds: string[]) => Promise<boolean>;
  /**
   * Buscar usuarios por texto. **Opcional, pero es lo que hace usable la hoja
   * para una invitación**: el inbox solo tiene gente con la que YA chateaste, y
   * a quien invitás a una partida nueva es justamente a quien todavía no le
   * escribiste. Sin esto, un usuario recién llegado ve una lista vacía y no
   * puede invitar a nadie.
   */
  onSearch?: (query: string) => Promise<SharePerson[]>;
  title?: string;
  subtitle?: string;
  /** Texto del botón de envío. Default: "Enviar". */
  sendLabel?: string;
}

/** Mínimo de caracteres para buscar: con menos, la lista es ruido. */
const MIN_QUERY = 2;
const SEARCH_DEBOUNCE_MS = 350;

export function ShareGameSheet({
  visible, items, loading = false, onClose, onSend, onSearch,
  title = 'Compartir partido',
  subtitle = 'Se envía por chat, con el partido adjunto para que lo abran de una.',
  sendLabel,
}: ShareGameSheetProps) {
  const { colors, radii } = useTheme();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [sending, setSending] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SharePerson[]>([]);
  const [searching, setSearching] = React.useState(false);

  // Al cerrar se limpia: abrir de nuevo no debe arrastrar la selección anterior.
  React.useEffect(() => {
    if (!visible) {
      setSelected([]); setSending(false); setQuery(''); setResults([]);
    }
  }, [visible]);

  const fromInbox = React.useMemo<SharePerson[]>(
    () => items
      .filter((it) => it.kind === 'dm' && !!it.otherUserId)
      .map((it) => ({ id: it.otherUserId as string, name: it.title, avatar: it.avatar ?? undefined })),
    [items],
  );

  const searching_ = query.trim().length >= MIN_QUERY;

  React.useEffect(() => {
    if (!onSearch || !searching_) { setResults([]); return undefined; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await onSearch(query.trim()));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, onSearch, searching_]);

  /**
   * Con búsqueda activa manda el resultado; si no, la gente del inbox.
   *
   * Los seleccionados **no se pierden al buscar**: `selected` guarda ids, no
   * posiciones, así que se puede elegir a uno del inbox, buscar a otro y mandar
   * a los dos. Por eso el contador del botón sale de `selected` y no de la lista
   * que se está viendo.
   */
  const people = searching_ ? results : fromInbox;

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
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted2, marginTop: 4, marginBottom: 12 }}>
            {subtitle}
          </Text>

          {onSearch && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
              borderRadius: 12, paddingHorizontal: 12,
            }}>
              <Search size={16} color={colors.muted2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar a alguien por nombre o usuario"
                placeholderTextColor={colors.muted2}
                autoCapitalize="none"
                testID="share-search"
                style={{ flex: 1, paddingVertical: 10, color: colors.text, fontSize: 14 }}
              />
              {searching && <ActivityIndicator size="small" color={colors.accent} />}
            </View>
          )}

          {(loading || searching) && people.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : people.length === 0 ? (
            <Text style={{ color: colors.muted2, fontSize: 13, textAlign: 'center', paddingVertical: 28, lineHeight: 19 }}>
              {searching_
                ? 'No encontramos a nadie con ese nombre.'
                : onSearch
                  ? 'Busca por nombre o usuario a quién quieres invitar.'
                  : 'Todavía no tienes chats con nadie.\nEscríbele a alguien desde su perfil y después vas a poder compartirle partidos.'}
            </Text>
          ) : (
            <FlatList
              data={people}
              keyExtractor={(it) => it.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const id = item.id;
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
                    <Avatar name={item.name} size={42} imageUri={item.avatar} />
                    <Text style={{ flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text }} numberOfLines={1}>
                      {item.name}
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

          {/* Con búsqueda, el botón va SIEMPRE: si solo se mostrara cuando la
              lista visible tiene gente, elegir a alguien y después escribir una
              búsqueda sin resultados escondería el botón con la selección hecha. */}
          {(people.length > 0 || selected.length > 0) && (
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
                    {selected.length > 1
                      ? `${sendLabel ?? 'Enviar'} a ${selected.length}`
                      : (sendLabel ?? 'Enviar')}
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
