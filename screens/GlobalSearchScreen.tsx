import React from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Search, Video } from 'lucide-react-native';
import Svg, { G, Ellipse, Path } from 'react-native-svg';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar, SurfaceChip } from '../components/ui';
import type { SearchableCourt, SearchablePlayer } from '../data/mocks';

export interface GlobalSearchScreenProps {
  players: SearchablePlayer[];
  courts: SearchableCourt[];
  onBack: () => void;
  onOpenPlayerProfile: (id: string) => void;
  onReserveCourt: (clubId: string, courtId: string) => void;
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
  players, courts, onBack, onOpenPlayerProfile, onReserveCourt,
}: GlobalSearchScreenProps) {
  const { colors } = useTheme();
  const inputRef = React.useRef<TextInput>(null);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const q = query.trim().toLowerCase();

  const filteredPlayers = React.useMemo(() =>
    q
      ? players.filter(p =>
          p.name.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q),
        )
      : players,
    [players, q],
  );

  const filteredCourts = React.useMemo(() =>
    q
      ? courts.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.club.toLowerCase().includes(q),
        )
      : courts,
    [courts, q],
  );

  const hasResults = filteredPlayers.length > 0 || filteredCourts.length > 0;

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
            placeholder="Jugadores, canchas, clubes…"
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
          {!hasResults && q.length > 0 && (
            <View style={{ alignItems: 'center', paddingTop: 48, gap: 10 }}>
              <Search size={36} color={colors.line} strokeWidth={1.5} />
              <Text style={{ color: colors.muted2, fontSize: 14, fontFamily: fonts.bold, textAlign: 'center' }}>
                Sin resultados para "{query}"
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 17 }}>
                Probá con el nombre del jugador{'\n'}o el nombre de la cancha o club.
              </Text>
            </View>
          )}

          {!q && (
            <View style={{ alignItems: 'center', paddingTop: 48, gap: 10 }}>
              <CourtIcon size={40} color={colors.line} />
              <Text style={{ color: colors.muted2, fontSize: 14, fontFamily: fonts.bold, textAlign: 'center' }}>
                Buscá jugadores o canchas
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 17 }}>
                Por nombre, username o nombre del club.
              </Text>
            </View>
          )}

          {/* Sección jugadores */}
          {filteredPlayers.length > 0 && q.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{
                fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.8,
                textTransform: 'uppercase', color: colors.muted2,
              }}>
                Jugadores · {filteredPlayers.length}
              </Text>
              {filteredPlayers.map(p => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  colors={colors}
                  query={q}
                  onPress={() => onOpenPlayerProfile(p.id)}
                />
              ))}
            </View>
          )}

          {/* Sección canchas */}
          {filteredCourts.length > 0 && q.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{
                fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.8,
                textTransform: 'uppercase', color: colors.muted2,
              }}>
                Canchas · {filteredCourts.length}
              </Text>
              {filteredCourts.map(c => (
                <CourtRow
                  key={c.id}
                  court={c}
                  colors={colors}
                  onPress={() => onReserveCourt(c.clubId, c.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Fila de jugador ─── */

interface PlayerRowProps {
  player: SearchablePlayer;
  colors: ReturnType<typeof useTheme>['colors'];
  query: string;
  onPress: () => void;
}

function PlayerRow({ player, colors, onPress }: PlayerRowProps) {
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
      <Avatar name={player.name} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: colors.text }} numberOfLines={1}>
          {player.name}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted2, marginTop: 1 }} numberOfLines={1}>
          {player.username}
          <Text style={{ color: colors.muted }}> · ★ {player.rating.toFixed(1)}</Text>
        </Text>
      </View>
      <ChevronRight size={16} color={colors.muted2} />
    </Pressable>
  );
}

/* ─── Fila de cancha ─── */

interface CourtRowProps {
  court: SearchableCourt;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}

function CourtRow({ court, colors, onPress }: CourtRowProps) {
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
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center',
      }}>
        <CourtIcon size={22} color={colors.muted2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: colors.text }} numberOfLines={1}>
          {court.name}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted2, marginTop: 1 }} numberOfLines={1}>
          {court.club}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {court.hasCameras && (
          <Video size={13} color={colors.muted2} />
        )}
        <SurfaceChip surface={court.surface} />
      </View>
    </Pressable>
  );
}
