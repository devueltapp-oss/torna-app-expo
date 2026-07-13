import React from 'react';
import { View, Text, ScrollView, TextInput, Pressable, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronRight, Users, CalendarPlus, MapPin } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { GameListItem, GameListData } from '../components/cards';
import { EmptyState, StatusBadge, Avatar, SectionHeader } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { MapsButton } from '../components/MapsButton';
import type { UpcomingGameData } from '../data/types';

type Filter = 'TODAS' | 'LIVE' | 'SCHEDULED' | 'FINISHED';

interface Props {
  games: GameListData[];
  onOpenGame?: (id: string) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  emptyImage?: any;
  role?: 'player' | 'club';
  /** (Player) Mis partidas activas — abre el sheet de gestión al tocar. */
  myGames?: UpcomingGameData[];
  /** (Player) Partidas abiertas (isOpenForPlayers) para sumarme. */
  openGames?: UpcomingGameData[];
  /** (Player) Abre el sheet de una partida (gestión si participo, postularme si es abierta). */
  onOpenMyGame?: (game: UpcomingGameData) => void;
  /** (Player) Inicia el flujo de reserva (crear un juego). */
  onReserve?: () => void;
}

const FILTER_LABEL: Record<Filter, string> = {
  TODAS: 'Todas', LIVE: 'En vivo', SCHEDULED: 'Programadas', FINISHED: 'Finalizadas',
};

export function GamesScreen({
  games, onOpenGame, onChangeTab, activeTab = 'games', emptyImage, role = 'club',
  myGames = [], openGames = [], onOpenMyGame, onReserve,
}: Props) {
  const { colors } = useTheme();
  const [filter, setFilter] = React.useState<Filter>('TODAS');
  const [q, setQ] = React.useState('');

  // Vista del player: hub de partidos = Mis partidas + Abiertos para sumarme + Reservar.
  if (role === 'player') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        {/* Header: título + acción Reservar (crear un juego). */}
        <View style={{
          backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 14,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Juegos</Text>
            <Text style={{ color: colors.muted2, fontSize: 13, marginTop: 2 }}>
              Tus partidas y partidos abiertos para sumarte
            </Text>
          </View>
          <Pressable
            onPress={onReserve}
            accessibilityLabel="Reservar cancha"
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colors.accent, paddingHorizontal: 12, paddingVertical: 9,
              borderRadius: 10, opacity: pressed ? 0.85 : 1,
            })}
          >
            <CalendarPlus size={16} color={colors.ink} />
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 13 }}>Reservar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 8 }}>
          {/* Mis partidas */}
          <SectionHeader title="Mis partidas" />
          {myGames.length === 0 ? (
            <Text style={{ color: colors.muted2, fontSize: 13, lineHeight: 19, paddingBottom: 8 }}>
              No tenés partidas activas. Reservá una cancha o sumate a un partido abierto.
            </Text>
          ) : (
            <View style={{ gap: 10, paddingBottom: 8 }}>
              {myGames.map(g => (
                <MyGameCard key={g.id} game={g} colors={colors} onPress={() => onOpenMyGame?.(g)} />
              ))}
            </View>
          )}

          {/* Abiertos para sumarme */}
          <View style={{ marginTop: 8 }}>
            <SectionHeader title="Abiertos para sumarme" />
          </View>
          {openGames.length === 0 ? (
            <Text style={{ color: colors.muted2, fontSize: 13, lineHeight: 19 }}>
              Cuando haya partidos buscando jugadores, aparecerán acá para que te sumes.
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {openGames.map(g => (
                <OpenGameCard key={g.id} game={g} colors={colors} onOpenDetail={() => onOpenMyGame?.(g)} />
              ))}
            </View>
          )}
        </ScrollView>

        {onChangeTab && <BottomTabBar role="player" active={activeTab} onChange={onChangeTab}/>}
      </SafeAreaView>
    );
  }

  const filtered = games.filter(g => {
    if (filter !== 'TODAS') {
      if (filter === 'FINISHED' && !(g.status === 'FINISHED' || g.status === 'STOPPED')) return false;
      if (filter !== 'FINISHED' && g.status !== filter) return false;
    }
    if (q && !(`${g.id} ${g.court} ${g.cam}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 14 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>Juegos</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 }}>
          <Search size={18} color={colors.muted2} />
          <TextInput placeholder="Buscar por ID, cancha o jugador…" placeholderTextColor={colors.muted}
            value={q} onChangeText={setQ}
            style={{ flex: 1, color: colors.text, fontSize: 14, padding: 0 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 12 }}>
          {(Object.keys(FILTER_LABEL) as Filter[]).map(f => {
            const on = filter === f;
            return (
              <Pressable key={f} onPress={() => setFilter(f)}
                style={{
                  backgroundColor: on ? colors.ink : colors.bg2,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
                }}>
                <Text style={{ color: on ? '#FFFFFF' : colors.text2, fontSize: 12, fontWeight: '700' }}>{FILTER_LABEL[f]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered} keyExtractor={g => g.id}
        renderItem={({ item }) => <GameListItem game={item} onPress={onOpenGame} />}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <EmptyState
            title="Sin partidos en este filtro"
            message="Cuando alguien programe o inicie un partido, aparecerá aquí."
            imageSource={emptyImage}
          />
        }
      />

      {onChangeTab && <BottomTabBar role={role} active={activeTab} onChange={onChangeTab}/>}
    </SafeAreaView>
  );
}

/** Card de una partida propia en "Mis partidas". */
function MyGameCard({
  game, colors, onPress,
}: { game: UpcomingGameData; colors: ReturnType<typeof useTheme>['colors']; onPress: () => void }) {
  const count = game.players.length;
  const max = game.maxPlayers ?? 4;
  const subtitle = game.isOpenForPlayers && count < max
    ? `${count}/${max} · busca jugadores`
    : `${count}/${max} jugadores`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
        borderRadius: 14, padding: 14, opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }} numberOfLines={1}>
            {game.time} · {game.court}
          </Text>
          {game.isCreator && (
            <View style={{ backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, fontWeight: '800', color: colors.accentText, letterSpacing: 0.4 }}>ORGANIZÁS</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
          <Users size={12} color={colors.muted2} />
          <Text style={{ color: colors.muted2, fontSize: 12 }} numberOfLines={1}>
            {[game.date, subtitle].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <StatusBadge status={game.status === 'LIVE' ? 'LIVE' : 'SCHEDULED'} />
      <ChevronRight size={18} color={colors.muted2} />
    </Pressable>
  );
}

/** Card de un partido ABIERTO para sumarse (migrado de SearchPlayScreen). */
function OpenGameCard({
  game, colors, onOpenDetail,
}: { game: UpcomingGameData; colors: ReturnType<typeof useTheme>['colors']; onOpenDetail: () => void }) {
  const filled = game.players.length;
  const total = game.maxPlayers ?? 4;
  // Ubicación en Maps: coords del club si están, si no el nombre (club + cancha).
  const mapsQuery = [game.club, game.court].filter(Boolean).join(' ');

  return (
    <View style={{
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: 16, padding: 14, gap: 12,
    }}>
      <Pressable onPress={onOpenDetail} style={({ pressed }) => ({ gap: 10, opacity: pressed ? 0.85 : 1 })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.3 }} numberOfLines={1}>
            {game.time} · {game.court}
          </Text>
          <View style={{ backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: colors.accentText, fontSize: 11, fontFamily: fonts.bold }}>{filled}/{total}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MapPin size={12} color={colors.muted2}/>
          <Text style={{ color: colors.muted2, fontSize: 13 }} numberOfLines={1}>
            {[game.date, game.club].filter(Boolean).join(' · ')}
          </Text>
        </View>

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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={onOpenDetail}
          style={({ pressed }) => ({
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            backgroundColor: colors.bg2, borderRadius: 12, paddingVertical: 11, opacity: pressed ? 0.85 : 1,
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
