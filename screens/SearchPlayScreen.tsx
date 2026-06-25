import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, ChevronRight, Users } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { AppHeader, Avatar } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { MapsButton } from '../components/MapsButton';
import { UpcomingMatchSheet } from '../components/UpcomingMatchSheet';
import { useOpenGames } from '../hooks/useOpenGames';
import type { InvitablePlayer, UpcomingGameData } from '../data/types';

interface Props {
  onBack?: () => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  /** Abrir el perfil público de un jugador desde la hoja de detalle. */
  onOpenPlayerProfile?: (playerId: string) => void;
  /** Compañeros invitables para el flujo "voy con compañero" al postularse. */
  invitablePlayers?: InvitablePlayer[];
}

/**
 * Buscar partido: lista los partidos ABIERTOS a los que el usuario puede sumarse
 * (GET /game/open vía useOpenGames). Sin GPS ni permiso de ubicación: cada partido
 * trae un botón "Buscar en Maps" que abre Google Maps fuera de la app (MapsButton),
 * y "Ver detalle" abre la hoja con la opción de postularse/unirse.
 */
export function SearchPlayScreen({
  onBack, onChangeTab, activeTab = 'search', onOpenPlayerProfile, invitablePlayers = [],
}: Props) {
  const { colors } = useTheme();
  const { openGames, loading, refresh } = useOpenGames();
  const [selected, setSelected] = React.useState<UpcomingGameData | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader title="Buscar partido"
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
      />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
      >
        {loading && openGames.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
            <ActivityIndicator size="large" color={colors.primary}/>
          </View>
        ) : openGames.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 64, gap: 10 }}>
            <View style={{
              width: 96, height: 96, borderRadius: 28, backgroundColor: colors.accent,
              alignItems: 'center', justifyContent: 'center', marginBottom: 4,
            }}>
              <Users size={44} color={colors.ink} strokeWidth={2.2}/>
            </View>
            <Text style={{ fontSize: 16, fontFamily: fonts.bold, color: colors.text }}>No hay partidos abiertos</Text>
            <Text style={{ fontSize: 13, color: colors.muted2, textAlign: 'center', lineHeight: 19 }}>
              Cuando haya partidos buscando jugadores, aparecerán acá para que te sumes.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
            {openGames.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                colors={colors}
                onOpenDetail={() => setSelected(game)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}

      <UpcomingMatchSheet
        visible={selected !== null}
        game={selected}
        invitablePlayers={invitablePlayers}
        onClose={() => setSelected(null)}
        onOpenPlayerProfile={onOpenPlayerProfile}
      />
    </SafeAreaView>
  );
}

interface GameCardProps {
  game: UpcomingGameData;
  colors: ReturnType<typeof useTheme>['colors'];
  onOpenDetail: () => void;
}

function GameCard({ game, colors, onOpenDetail }: GameCardProps) {
  const filled = game.players.length;
  const total = game.maxPlayers ?? 4;
  // Ubicación en Maps: si el club tiene coords, abre el pin exacto; si no, cae al
  // nombre (club + cancha) como búsqueda de texto. MapsButton prioriza las coords.
  const mapsQuery = [game.club, game.court].filter(Boolean).join(' ');

  return (
    <View style={{
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: 16, padding: 14, gap: 12,
    }}>
      {/* Info principal — pressable = ver detalle */}
      <Pressable
        onPress={onOpenDetail}
        style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.85 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.3 }} numberOfLines={1}>
            {game.time} · {game.court}
          </Text>
          <View style={{
            backgroundColor: colors.accentSoft, borderRadius: 8,
            paddingHorizontal: 8, paddingVertical: 3,
          }}>
            <Text style={{ color: colors.accentText, fontSize: 11, fontFamily: fonts.bold }}>{filled}/{total}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MapPin size={12} color={colors.muted2}/>
          <Text style={{ color: colors.muted2, fontSize: 13 }} numberOfLines={1}>
            {[game.date, game.club].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {/* Jugadores confirmados */}
        {game.players.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ flexDirection: 'row' }}>
              {game.players.slice(0, 3).map((p, i) => (
                <View key={p.id ?? p.username} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  {p.profilePicture ? (
                    <Image source={{ uri: p.profilePicture }} style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.surface }} />
                  ) : (
                    <Avatar name={p.name ?? p.username} size={26} />
                  )}
                </View>
              ))}
            </View>
            <Text style={{ color: colors.muted2, fontSize: 12 }} numberOfLines={1}>
              {game.players.map((p) => p.name ?? p.username).slice(0, 2).join(', ')}
              {game.players.length > 2 ? ` +${game.players.length - 2}` : ''}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Acciones: ver detalle + ubicación en Maps (siempre disponible) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={onOpenDetail}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: colors.bg2, borderRadius: 12, paddingVertical: 11,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bold }}>Ver detalle</Text>
          <ChevronRight size={16} color={colors.muted2}/>
        </Pressable>
        <MapsButton compact latitude={game.clubLat} longitude={game.clubLng} query={mapsQuery} />
      </View>
    </View>
  );
}
