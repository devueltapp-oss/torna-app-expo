import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path, Rect, Line } from 'react-native-svg';
import {
  ChevronLeft, Filter, MapPin, Camera, Radio,
} from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import {
  Button, AppHeader, Avatar, SurfaceChip,
} from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { JoinMatchScreen } from './JoinMatchScreen';
import type { NearbyCourt, NearbyPlayer, InvitablePlayer } from '../data/mocks';

interface Props {
  /** Nearby results returned by /search/nearby. */
  courts: NearbyCourt[];
  players: NearbyPlayer[];
  /** Player directory used by the JoinMatch's PlayerSearchOverlay. */
  invitablePlayers: InvitablePlayer[];
  /** Initial radius slider value, in km. */
  initialRadius?: number;
  onBack?: () => void;
  onReserveCourt?: (courtId: string) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
}

/**
 * Discovery flow. Two-state screen:
 *
 *   1. Permission gate — explains why we need GPS, prompts activation.
 *      "Solo usamos tu ubicación cuando esta vista está abierta."
 *   2. Results — mini-map, radius pill, Canchas/Jugadores tabs.
 *      Canchas: distance, surface, free-slot chips, Reservar button.
 *      Jugadores: rating, distance, what they're looking for, Unirme button.
 *
 * Tapping "Unirme" opens JoinMatchScreen as a full-screen overlay.
 *
 * In production:
 *   GET /search/nearby?lat=&lng=&radius= → { courts, players }
 *   POST /reservations/:id/join          → { mode, partnerUserId? }
 */
export function SearchPlayScreen({
  courts, players, invitablePlayers, initialRadius = 5,
  onBack, onReserveCourt, onChangeTab, activeTab = 'search',
}: Props) {
  const { colors } = useTheme();
  const [granted, setGranted] = React.useState(false);
  const [tab, setTab] = React.useState<'courts' | 'players'>('courts');
  const [joining, setJoining] = React.useState<NearbyPlayer | null>(null);

  if (!granted) {
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
            <Text style={{ fontWeight: '800', fontSize: 22, color: colors.text, letterSpacing: -0.4 }}>Encontrá partidos cerca tuyo</Text>
            <Text style={{ color: colors.muted2, fontSize: 14, marginTop: 8, lineHeight: 20, textAlign: 'center' }}>
              Activá la ubicación para ver las canchas disponibles y jugadores que están buscando rivales cerca tuyo.
            </Text>
          </View>
          <View style={{ backgroundColor: colors.bg2, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
            <BulletRow icon={<MapPin size={18} color={colors.accentText}/>}    text="Canchas con horarios libres y cámaras"/>
            <BulletRow icon={<Radio size={18}  color={colors.accentText}/>}    text="Jugadores buscando compañero o rivales"/>
            <BulletRow icon={<Filter size={18} color={colors.accentText}/>}    text="Solo usamos tu ubicación cuando esta vista está abierta"/>
          </View>
          <Button fullWidth size="lg" onPress={() => setGranted(true)}>Activar ubicación</Button>
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
      <AppHeader title="Buscar partido"
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
        right={<Pressable><Filter size={20} color={colors.text}/></Pressable>}
      />

      {/* Mini map placeholder + radius pill — replace with react-native-maps */}
      <View style={{
        marginHorizontal: 16, marginTop: 12, height: 132, borderRadius: 14, overflow: 'hidden',
        backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.line, position: 'relative',
      }}>
        <Svg viewBox="0 0 320 132" width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.5 }}>
          <Path d="M0 90 Q 80 70, 160 80 T 320 60" stroke={colors.muted} strokeWidth={1.6} fill="none"/>
          <Path d="M30 0 L 50 132" stroke={colors.muted} strokeWidth={1.2} fill="none"/>
          <Path d="M200 0 L 220 132" stroke={colors.muted} strokeWidth={1.2} fill="none"/>
          <Path d="M0 110 L 320 105" stroke={colors.muted} strokeWidth={1} fill="none" strokeDasharray="3 5"/>
        </Svg>
        {/* User dot */}
        <View style={{
          position: 'absolute', top: '50%', left: '50%', marginLeft: -7, marginTop: -7,
          width: 14, height: 14, borderRadius: 7, backgroundColor: colors.live,
        }}/>
        {/* Radius pill */}
        <View style={{
          position: 'absolute', bottom: 10, left: 10,
          backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999,
          flexDirection: 'row', alignItems: 'center', gap: 6,
        }}>
          <MapPin size={12} color={colors.accentText}/>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>Radio · {initialRadius} km</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{
        marginHorizontal: 16, marginTop: 12, marginBottom: 6,
        flexDirection: 'row', backgroundColor: colors.bg2, borderRadius: 12, padding: 4,
      }}>
        {([
          { id: 'courts',  label: 'Canchas',   count: courts.length },
          { id: 'players', label: 'Jugadores', count: players.length },
        ] as const).map(opt => {
          const on = tab === opt.id;
          return (
            <Pressable key={opt.id} onPress={() => setTab(opt.id)}
              style={{
                flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center',
                flexDirection: 'row', justifyContent: 'center', gap: 6,
                backgroundColor: on ? colors.surface : 'transparent',
              }}>
              <Text style={{ fontWeight: '800', fontSize: 13, color: on ? colors.text : colors.muted2 }}>{opt.label}</Text>
              <View style={{
                backgroundColor: on ? colors.accent : colors.bg3,
                paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9999,
              }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: on ? colors.ink : colors.muted2 }}>{opt.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Result list */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, gap: 10 }}>
        {tab === 'courts'
          ? courts.map(c => <NearbyCourtRow key={c.id} court={c} onReserve={onReserveCourt}/>)
          : players.map(p => <NearbyPlayerRow key={p.id} player={p} onJoin={setJoining}/>)
        }
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}

      {/* JoinMatch overlay */}
      {joining && (
        <JoinMatchScreen host={joining} invitablePlayers={invitablePlayers} onClose={() => setJoining(null)}/>
      )}
    </SafeAreaView>
  );
}

function BulletRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {icon}
      <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>{text}</Text>
    </View>
  );
}

function NearbyCourtRow({ court, onReserve }: { court: NearbyCourt; onReserve?: (id: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: 14, padding: 12, gap: 10,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{
          width: 44, height: 44, borderRadius: 11, backgroundColor: colors.ink,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Svg viewBox="0 0 200 110" width="78%" style={{ opacity: 0.3 }}>
            <Rect x={20} y={15} width={160} height={80} stroke={colors.accent} strokeWidth={1.5} fill="none"/>
            <Line x1={100} y1={15} x2={100} y2={95} stroke={colors.accent} strokeWidth={1.5}/>
          </Svg>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: colors.text }}>{court.name}</Text>
            <SurfaceChip surface={court.surface}/>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Text style={{ fontSize: 12, color: colors.muted2 }}>
              {court.club} · <Text style={{ color: colors.text, fontWeight: '700' }}>{court.distanceKm} km</Text>
            </Text>
            {court.hasCameras && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 12, color: colors.muted2 }}> · </Text>
                <Camera size={11} color={colors.accentText}/>
                <Text style={{ fontSize: 11, color: colors.accentText, fontWeight: '700' }}>con cámara</Text>
              </View>
            )}
          </View>
        </View>
        <Pressable onPress={() => onReserve?.(court.id)} style={{
          backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
        }}>
          <Text style={{ color: colors.primaryFg, fontWeight: '800', fontSize: 12 }}>Reservar</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {court.freeSlots.map(s => (
          <View key={s} style={{
            backgroundColor: colors.bg2, borderWidth: 1, borderColor: colors.line,
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999,
          }}>
            <Text style={{ color: colors.text2, fontSize: 11, fontWeight: '800', fontFamily: fonts.mono }}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function NearbyPlayerRow({ player, onJoin }: { player: NearbyPlayer; onJoin: (p: NearbyPlayer) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: 14, padding: 12,
    }}>
      <Avatar name={player.name} size={42}/>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontWeight: '800', fontSize: 14, color: colors.text }}>{player.name}</Text>
        <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 1 }}>
          {player.username} · ★ {player.rating} · <Text style={{ color: colors.text, fontWeight: '700' }}>{player.distanceKm} km</Text>
        </Text>
        <Text style={{ fontSize: 11, color: colors.accentText, fontWeight: '700', marginTop: 4 }}>
          Busca {player.lookingFor} · {player.availability}
        </Text>
      </View>
      <Pressable onPress={() => onJoin(player)} style={{
        backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
      }}>
        <Text style={{ color: colors.primaryFg, fontWeight: '800', fontSize: 12 }}>Unirme</Text>
      </Pressable>
    </View>
  );
}
