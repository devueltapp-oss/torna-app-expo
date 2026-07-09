import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Search as SearchIcon, X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { AppHeader, Avatar } from '../components/ui';
import type { InvitablePlayer } from '../data/types';

interface Props {
  /** Title shown in the header — depends on which slot is being filled. */
  slotLabel: string;
  /** Lista local de candidatos (fallback si no se provee `onSearch`). */
  players?: InvitablePlayer[];
  /** Búsqueda real contra la API (GET /user/search). Si se provee, se usa con
   *  debounce en vez de filtrar `players` localmente. */
  onSearch?: (q: string) => Promise<InvitablePlayer[]>;
  onSelect: (p: InvitablePlayer) => void;
  onClose: () => void;
}

/**
 * Full-screen overlay used by reservation step 3 and ApplyMatchSheet to pick a
 * different partner / opponent from the club's player directory.
 *
 * Input is autofocused; matches by name OR username (case-insensitive).
 *
 * In production:
 *   GET /players?q=&clubId=  → InvitablePlayer[]
 */
export function PlayerSearchOverlay({ slotLabel, players = [], onSearch, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const inputRef = React.useRef<TextInput>(null);
  const [value, setValue] = React.useState('');
  const [apiResults, setApiResults] = React.useState<InvitablePlayer[]>([]);

  React.useEffect(() => {
    // Autofocus on mount.
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  // Búsqueda real contra la API con debounce (~300 ms).
  React.useEffect(() => {
    if (!onSearch) return;
    const term = value.trim();
    if (term.length < 2) { setApiResults([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      onSearch(term)
        .then((res) => { if (!cancelled) setApiResults(res); })
        .catch(() => { if (!cancelled) setApiResults([]); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value, onSearch]);

  const filtered = React.useMemo(() => {
    if (onSearch) {
      // Con búsqueda por API: mientras no haya término (o sea muy corto) mostramos
      // las sugerencias locales (p. ej. gente que seguís / te sigue). Al tipear ≥2
      // caracteres, los resultados rankeados que devuelve `onSearch`.
      if (value.trim().length < 2) return players;
      return apiResults;
    }
    const q = value.trim().toLowerCase();
    if (!q) return players;
    return players.filter(p =>
      p.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q)
    );
  }, [players, apiResults, onSearch, value]);

  return (
    <SafeAreaView style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: colors.bg, zIndex: 20,
    }} edges={['top']}>
      <AppHeader title={slotLabel}
        left={<Pressable onPress={onClose}><ChevronLeft size={22} color={colors.text}/></Pressable>}
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
          borderWidth: 1.5, borderColor: colors.line,
        }}>
          <SearchIcon size={18} color={colors.muted2}/>
          <TextInput ref={inputRef}
            value={value} onChangeText={setValue}
            placeholder="@usuario o nombre del jugador…"
            placeholderTextColor={colors.muted}
            style={{ flex: 1, color: colors.text, fontSize: 14, padding: 0 }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {value !== '' && (
            <Pressable onPress={() => setValue('')}>
              <X size={16} color={colors.muted2}/>
            </Pressable>
          )}
        </View>
        <Text style={{ fontSize: 10, color: colors.muted2, fontWeight: '700', letterSpacing: 0.8, marginTop: 10, paddingHorizontal: 4 }}>
          {value
            ? `${filtered.length} RESULTADO${filtered.length === 1 ? '' : 'S'}`
            : onSearch
              ? (players.length ? 'PERSONAS QUE SEGUÍS O TE SIGUEN' : 'BUSCÁ POR NOMBRE O @USUARIO')
              : 'JUGADORES DEL CLUB'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 8 }}>
        {filtered.length === 0 ? (
          <View style={{ paddingHorizontal: 12, paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.muted2, fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
              {value.trim().length < 2 && onSearch
                ? 'Escribí el nombre o @usuario de tu compañero para buscarlo.'
                : 'No encontramos jugadores que coincidan.\nPedile a esa persona que cree su cuenta en Torna.'}
            </Text>
          </View>
        ) : filtered.map(p => (
          <Pressable key={p.id} onPress={() => onSelect(p)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
              borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
            }}>
            <Avatar name={p.name} size={36}/>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{p.name}</Text>
              <Text style={{ fontSize: 11, color: colors.muted2 }}>
                {p.username}{p.rating != null ? ` · ★ ${p.rating}` : ''}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.muted2}/>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
