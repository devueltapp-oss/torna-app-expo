import React from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import Svg, { G, Ellipse, Path } from 'react-native-svg';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar } from '../components/ui';
import type { SearchablePlayer, SearchableUser } from '../data/types';

export interface GlobalSearchScreenProps {
  players: SearchablePlayer[];
  onBack: () => void;
  onOpenPlayerProfile: (id: string) => void;
  onOpenClubProfile: (id: string) => void;
  /**
   * Búsqueda real de jugadores y clubs contra la API (GET /user/search-all). Si se
   * provee, la pantalla la usa con debounce en vez de filtrar `players` localmente.
   */
  onSearchUsers?: (q: string) => Promise<SearchableUser[]>;
}

function CourtIcon({ size = 20, color = 'black' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <G transform="rotate(-38, 10, 10)">
        <Ellipse cx="10" cy="5.5" rx="3.5" ry="4" stroke={color} strokeWidth={1.8} fill="none" />
        <Path d="M9 9.5L9 16.5Q10 18 11 16.5L11 9.5" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </G>
      <G transform="rotate(38, 10, 10)">
        <Ellipse cx="10" cy="5.5" rx="3.5" ry="4" stroke={color} strokeWidth={1.8} fill="none" />
        <Path d="M9 9.5L9 16.5Q10 18 11 16.5L11 9.5" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

export function GlobalSearchScreen({
  players, onBack, onOpenPlayerProfile, onOpenClubProfile, onSearchUsers,
}: GlobalSearchScreenProps) {
  const { colors } = useTheme();
  const inputRef = React.useRef<TextInput>(null);
  const [query, setQuery] = React.useState('');
  const [apiUsers, setApiUsers] = React.useState<SearchableUser[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const q = query.trim().toLowerCase();

  // Búsqueda real contra la API con debounce (~300 ms).
  React.useEffect(() => {
    if (!onSearchUsers) return;
    const term = query.trim();
    if (term.length < 2) {
      setApiUsers([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(() => {
      onSearchUsers(term)
        .then((res) => { if (!cancelled) setApiUsers(res); })
        .catch(() => { if (!cancelled) setApiUsers([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, onSearchUsers]);

  const filteredUsers = React.useMemo<SearchableUser[]>(() => {
    // Si hay búsqueda real, los resultados ya vienen filtrados del backend.
    if (onSearchUsers) return apiUsers;
    // Fallback local: los `players` se tratan como jugadores (isClub=false).
    const base: SearchableUser[] = players.map(p => ({
      id: p.id, name: p.name, username: p.username, isClub: false,
    }));
    return q
      ? base.filter(u =>
          u.name.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q),
        )
      : base;
  }, [players, apiUsers, onSearchUsers, q]);

  const hasResults = filteredUsers.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header con input */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.surface,
        paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: colors.line,
      }}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>

        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: colors.bg2, borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 10,
          borderWidth: 1.5, borderColor: query ? colors.accent : colors.line,
        }}>
          <Search size={16} color={colors.muted2} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Jugadores o clubes…"
            placeholderTextColor={colors.muted}
            style={{ flex: 1, color: colors.text, fontSize: 14, padding: 0, fontFamily: fonts.regular }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <View style={{
                width: 18, height: 18, borderRadius: 9,
                backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: colors.surface, fontSize: 11, fontFamily: fonts.bold, lineHeight: 14 }}>✕</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 24 }}
        >
          {!hasResults && q.length > 0 && !searching && (
            <View style={{ alignItems: 'center', paddingTop: 48, gap: 10 }}>
              <Search size={36} color={colors.line} strokeWidth={1.5} />
              <Text style={{ color: colors.muted2, fontSize: 14, fontFamily: fonts.bold, textAlign: 'center' }}>
                Sin resultados para "{query}"
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 17 }}>
                Probá con el nombre o username{'\n'}del jugador o club.
              </Text>
            </View>
          )}

          {!q && (
            <View style={{ alignItems: 'center', paddingTop: 48, gap: 10 }}>
              <CourtIcon size={40} color={colors.line} />
              <Text style={{ color: colors.muted2, fontSize: 14, fontFamily: fonts.bold, textAlign: 'center' }}>
                Buscá jugadores o clubes
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 17 }}>
                Por nombre o username. Las canchas y horarios{'\n'}los ves al abrir el club y reservar.
              </Text>
            </View>
          )}

          {/* Sección resultados (jugadores + clubs) */}
          {filteredUsers.length > 0 && q.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{
                fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.8,
                textTransform: 'uppercase', color: colors.muted2,
              }}>
                Resultados · {filteredUsers.length}
              </Text>
              {filteredUsers.map(u => (
                <UserRow
                  key={u.id}
                  user={u}
                  colors={colors}
                  onPress={() => (u.isClub ? onOpenClubProfile(u.id) : onOpenPlayerProfile(u.id))}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Fila de usuario (jugador o club) ─── */

interface UserRowProps {
  user: SearchableUser;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}

function UserRow({ user, colors, onPress }: UserRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Avatar name={user.name} size={40} imageUri={user.profilePicture} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: colors.text }} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted2, marginTop: 1 }} numberOfLines={1}>
          {user.username}
        </Text>
      </View>
      <TypeChip isClub={user.isClub} colors={colors} />
      <ChevronRight size={16} color={colors.muted2} />
    </Pressable>
  );
}

/* ─── Etiqueta de tipo: Club / Jugador (chip outline brand-strict) ─── */

function TypeChip({ isClub, colors }: { isClub: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{
      borderWidth: 1, borderColor: colors.line, borderRadius: 999,
      paddingHorizontal: 8, paddingVertical: 3,
    }}>
      <Text style={{
        fontSize: 9, fontFamily: fonts.bold, letterSpacing: 0.6,
        textTransform: 'uppercase', color: colors.muted2,
      }}>
        {isClub ? 'Club' : 'Jugador'}
      </Text>
    </View>
  );
}
