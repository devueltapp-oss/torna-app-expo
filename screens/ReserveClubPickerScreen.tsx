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
import { ChevronLeft, Search, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme';
import { AppHeader, Avatar } from '../components/ui';
import type { FollowItem } from '../data/types';

interface Props {
  onBack?: () => void;
  /** Clubs que seguís (vacío si no seguís ninguno → se muestra un mensaje). */
  suggestedClubs?: FollowItem[];
  loadingSuggested?: boolean;
  /** Búsqueda de CLUBS por nombre (solo clubs, no canchas). */
  onSearchClubs?: (q: string) => Promise<FollowItem[]>;
  /** Elegir un club → arranca el flujo de reserva (canchas → horarios). */
  onPickClub?: (clubId: string) => void;
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
  onSearchClubs,
  onPickClub,
}: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<FollowItem[]>([]);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !onSearchClubs) {
      setResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    // En RN el fetch a veces se cuelga sin resolver: sin timeout el spinner
    // quedaría cargando PARA SIEMPRE. `withTimeout` garantiza que la búsqueda
    // SIEMPRE cierre (cae a [] → "No se encontraron clubs" si tarda demasiado).
    const withTimeout = <T,>(p: Promise<T>, ms: number, fb: T): Promise<T> =>
      Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fb), ms))]);
    const t = setTimeout(async () => {
      const rows = await withTimeout(
        onSearchClubs(q).catch(() => [] as FollowItem[]), 6000, [],
      );
      if (active) {
        setResults(rows);
        setSearching(false);
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

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
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
              placeholder="Nombre del club"
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
                  No se encontraron clubs con ese nombre.
                </Text>
              ) : (
                results.map((club) => (
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
                ))
              )}
            </View>
          )}
        </View>

        {/* Clubs que seguís */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
            Clubs que sigues
          </Text>
          {loadingSuggested ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
          ) : suggestedClubs.length === 0 ? (
            <Text style={{ fontSize: 13, color: colors.muted2, paddingVertical: 8, lineHeight: 19 }}>
              Todavía no sigues ningún club. Busca uno por nombre arriba para reservar.
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
