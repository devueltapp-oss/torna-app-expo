import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, AppHeader, Avatar } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { useLocation } from '../hooks/useLocation';
import { fetchNearbyClubs } from '../api/clubs';
import { NearbyClubsMap } from '../components/NearbyClubsMap';
import type { NearbyClub } from '../data/types';

interface Props {
  /** Abrir el flujo de reserva para un club (→ ReserveCourt). */
  onOpenClub: (clubId: string) => void;
  onBack?: () => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  /** Radio de búsqueda en km. */
  radiusKm?: number;
}

/**
 * Discovery por GPS: pide ubicación on-demand y lista clubes cercanos
 * (GET /club/nearby). Tocar un club inicia la reserva de una de sus canchas.
 */
export function SearchPlayScreen({
  onOpenClub, onBack, onChangeTab, activeTab = 'search', radiusKm = 25,
}: Props) {
  const { colors } = useTheme();
  const { coords, status, request } = useLocation();
  const [clubs, setClubs] = React.useState<NearbyClub[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Cuando hay coords (auto-chequeo de permiso o botón), buscar clubes cercanos.
  React.useEffect(() => {
    if (status !== 'granted' || !coords) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetchNearbyClubs(coords.lat, coords.lng, radiusKm)
      .then((res) => { if (active) setClubs(res); })
      .catch(() => { if (active) setError('No se pudieron cargar los clubes cercanos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, coords, radiusKm]);

  // Botón del gate: solo dispara el permiso; el effect hace el fetch al llegar las coords.
  const activate = React.useCallback(async () => {
    setError(null);
    const c = await request();
    if (!c) setError('Necesitamos tu ubicación para buscar clubes cerca tuyo.');
  }, [request]);

  // Chequeo silencioso del permiso ya otorgado — evita el flash del gate.
  if (status === 'checking') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <AppHeader title="Buscar partido"
          left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary}/>
        </View>
        {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}
      </SafeAreaView>
    );
  }

  // Gate de permiso (estado inicial / denegado).
  if (status === 'idle' || status === 'denied' || status === 'requesting') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        <AppHeader title="Buscar partido"
          left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
        />
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, justifyContent: 'center', gap: 20 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{
              width: 120, height: 120, borderRadius: 36, backgroundColor: colors.accent,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin size={56} color={colors.ink} strokeWidth={2.2}/>
            </View>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', fontSize: 22, color: colors.text, letterSpacing: -0.4 }}>Encontrá clubes cerca tuyo</Text>
            <Text style={{ color: colors.muted2, fontSize: 14, marginTop: 8, lineHeight: 20, textAlign: 'center' }}>
              Activá la ubicación para ver los clubes disponibles cerca tuyo y reservar una cancha.
            </Text>
          </View>
          {status === 'denied' && (
            <Text style={{ color: colors.muted2, fontSize: 13, textAlign: 'center' }}>
              Permiso de ubicación denegado. Activalo desde los ajustes del sistema.
            </Text>
          )}
          {error && (
            <Text style={{ color: colors.muted2, fontSize: 13, textAlign: 'center' }}>{error}</Text>
          )}
          <Button fullWidth size="lg" onPress={activate}>
            {status === 'requesting' ? 'Buscando…' : 'Activar ubicación'}
          </Button>
          <Text onPress={onBack} style={{ alignSelf: 'center', color: colors.muted2, fontSize: 13, fontWeight: '700' }}>
            Ahora no
          </Text>
        </ScrollView>
        {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader title="Clubes cerca tuyo"
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary}/>
        </View>
      ) : clubs.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>No hay clubes cerca</Text>
          <Text style={{ fontSize: 13, color: colors.muted2, textAlign: 'center', lineHeight: 19 }}>
            No encontramos clubes en un radio de {radiusKm} km. Probá más tarde.
          </Text>
          {error && <Text style={{ fontSize: 12, color: colors.muted2 }}>{error}</Text>}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          {coords && (
            <NearbyClubsMap
              userLat={coords.lat}
              userLng={coords.lng}
              clubs={clubs}
              onSelectClub={onOpenClub}
              height={260}
            />
          )}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 10 }}>
          {clubs.map(club => (
            <Pressable key={club.id} onPress={() => onOpenClub(club.id)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
                borderRadius: 14, padding: 12, opacity: pressed ? 0.85 : 1,
              })}>
              <Avatar name={club.name} size={44}/>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontWeight: '800', fontSize: 14, color: colors.text }} numberOfLines={1}>{club.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MapPin size={11} color={colors.muted2}/>
                  <Text style={{ fontSize: 12, color: colors.muted2 }} numberOfLines={1}>
                    {club.region ? `${club.region} · ` : ''}
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{club.distanceKm.toFixed(1)} km</Text>
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.muted2}/>
            </Pressable>
          ))}
          </View>
        </ScrollView>
      )}

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}
    </SafeAreaView>
  );
}
