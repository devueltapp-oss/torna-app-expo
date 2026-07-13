import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, ChevronRight, MapPin } from 'lucide-react-native';
import { useTheme } from '../theme';
import { AppHeader, Avatar } from '../components/ui';
import type { FollowItem, SearchableCourt } from '../data/types';

interface Props {
  onBack?: () => void;
  /** Clubs sugeridos (los que seguís, o clubs al azar si no seguís ninguno). */
  suggestedClubs?: FollowItem[];
  loadingSuggested?: boolean;
  /** True si `suggestedClubs` son clubs al azar (no seguidos) → cambia el título. */
  suggestionsAreFallback?: boolean;
  /** Búsqueda real de canchas/clubs por nombre (GET /padel-court/search). */
  onSearchClubs?: (q: string) => Promise<SearchableCourt[]>;
  /** Elegir un club (y opcionalmente una cancha) → arranca el flujo de reserva. */
  onPickClub?: (clubId: string, courtId?: string) => void;
}

/**
 * Selector de club para iniciar una reserva. Sugiere los clubs que seguís y
 * permite buscar cualquier club por nombre. Al elegir → `ReserveCourt` (flujo
 * de reserva real: canchas → slots del horario del club → jugadores → confirmar).
 */
export function ReserveClubPickerScreen({
  onBack,
  suggestedClubs = [],
  loadingSuggested = false,
  suggestionsAreFallback = false,
  onSearchClubs,
  onPickClub,
}: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchableCourt[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !onSearchClubs) {
      setResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const rows = await onSearchClubs(q);
        if (active) setResults(rows);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, onSearchClubs]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader
        title="Reservar"
        left={
          <Pressable onPress={onBack}>
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Buscador */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
            Buscar club
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.line,
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 46,
            }}>
            <Search size={18} color={colors.muted2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Nombre del club o cancha"
              placeholderTextColor={colors.muted2}
              style={{ flex: 1, color: colors.text, fontSize: 14 }}
              autoCorrect={false}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {query.trim().length >= 2 && (
            <View style={{ marginTop: 10, gap: 8 }}>
              {results.length === 0 && !searching ? (
                <Text style={{ fontSize: 13, color: colors.muted2, paddingVertical: 8 }}>
                  Sin resultados.
                </Text>
              ) : (
                results.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => onPickClub?.(c.clubId, c.id)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.line,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}>
                    <MapPin size={18} color={colors.primary} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                        {c.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted2 }}>{c.club}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.muted2} />
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>

        {/* Clubs que seguís — o clubs sugeridos al azar si no seguís ninguno */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
            {suggestionsAreFallback ? 'Clubs sugeridos' : 'Clubs que seguís'}
          </Text>
          {suggestionsAreFallback && (
            <Text style={{ fontSize: 12, color: colors.muted2, marginBottom: 8 }}>
              Todavía no seguís clubs — te mostramos algunos para reservar.
            </Text>
          )}
          {loadingSuggested ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
          ) : suggestedClubs.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.muted2, paddingVertical: 8 }}>
              No hay clubs disponibles por ahora. Buscalos por nombre arriba.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {suggestedClubs.map((club) => (
                <Pressable
                  key={club.id}
                  onPress={() => onPickClub?.(club.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.line,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}>
                  <Avatar name={club.name} imageUri={club.profilePicture} size={36} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                      {club.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted2 }}>{club.username}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.muted2} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
