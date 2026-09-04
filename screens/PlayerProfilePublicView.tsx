import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, MessageCircle } from 'lucide-react-native';
import { Svg, Rect, Line } from 'react-native-svg';
import { InlineVideo } from '../components/InlineVideo';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { StatusBadge, Avatar, TabStrip } from '../components/ui';
import { ContentThumb } from '../components/ContentThumb';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import type { PlayerPublic, PlayerClip } from '../data/types';

interface Props {
  player: PlayerPublic;
  onBack?: () => void;
  onToggleFollow?: () => void;
  onToggleNotify?: () => void;
  /** Abre un chat directo 1-a-1 con este usuario. Oculto si no se provee. */
  onMessage?: () => void;
  onOpenLive?: (gameId: string) => void;
  onOpenClip?: (clip: PlayerClip) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}

/**
 * Perfil público de OTRO jugador. Mismo hero (avatar+nombre+nivel sobre fondo
 * azul con motivo de cancha) y mismo grid 3-col con `ContentThumb` que
 * `PlayerOwnProfileScreen` — antes esta vista usaba un carrusel horizontal de
 * tarjetas grandes mientras la propia usaba un grid con pestañas, así que ver
 * tu perfil y el de otro jugador se sentía como dos apps distintas para lo
 * mismo. Ver el comentario de `PlayerOwnProfileScreen` para el detalle de qué
 * NO se comparte (ahí solo van tus propias acciones: 🔒/⚙) y por qué acá hay
 * una sola pestaña en vez de dos (todavía no hay historial de partidos de
 * OTRO jugador conectado a esta pantalla).
 *
 * Si el jugador está transmitiendo en vivo, aparece una tarjeta EN VIVO
 * (con preview del stream) arriba del grid — no mezclada adentro: es un
 * evento urgente y transitorio, no un ítem más de la grilla.
 *
 * In production:
 *   GET /players/:id              → PlayerPublic
 *   POST/DELETE /players/:id/follow → { isFollowing }
 */
export function PlayerProfilePublicView({ player, onBack, onToggleFollow, onToggleNotify, onMessage, onOpenLive, onOpenClip, onChangeTab, activeTab = 'home', onOpenFollowers, onOpenFollowing }: Props) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const hasClips = player.clips.length > 0;
  const hasLive = player.isLiveNow && !!player.liveGame;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero — mismo tratamiento que el perfil propio (ver PlayerOwnProfileScreen) */}
        <View style={{ backgroundColor: colors.ink, padding: 16, paddingBottom: 18, overflow: 'hidden' }}>
          <Svg viewBox="0 0 390 220" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.14 }}>
            <Rect x={40} y={40} width={310} height={140} stroke={colors.accent} strokeWidth={2} fill="none"/>
            <Line x1={195} y1={40} x2={195} y2={180} stroke={colors.accent} strokeWidth={2}/>
          </Svg>

          {/* ⛔ Acá había un botón de "···" que no hacía NADA — se sacó junto
              con el resto de botones muertos de la app (mismo criterio que el
              chrome del visor). El hueco de la derecha se deja vacío: no hay
              ninguna acción propia de "ver el perfil de otro" que vaya ahí. */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={onBack} style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={18} color="#FFFFFF"/>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 14, marginTop: 18, alignItems: 'flex-end' }}>
            <View style={{ borderRadius: 36, overflow: 'hidden' }}>
              <Avatar name={player.name} size={72} ringColor="#FFFFFF"/>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 }} numberOfLines={1}>{player.name}</Text>
              {/* La categoría va como texto y no con CategoryBadge: acá el fondo
                  es el azul del hero en ambos temas, y el badge usa colors.text. */}
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }} numberOfLines={1}>
                {[player.username, player.club, player.category ? `CAT. ${player.category}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {player.isLiveNow && (
                <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: colors.live, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 }}>
                  <View style={{ width: 6, height: 6, backgroundColor: colors.ink, borderRadius: 3 }}/>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: colors.ink }}>JUGANDO AHORA</Text>
                </View>
              )}
            </View>
          </View>

          {/* Acciones: acá SÍ van (a diferencia del perfil propio) — seguir,
              notificar y mensajear son cosas que solo tienen sentido sobre
              OTRA cuenta. */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' }}>
            <Pressable onPress={onToggleFollow} style={{
              flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
              backgroundColor: player.isFollowing ? 'rgba(255,255,255,0.18)' : '#FFFFFF',
              alignItems: 'center',
            }}>
              <Text style={{ fontWeight: '800', fontSize: 13, color: player.isFollowing ? '#FFFFFF' : colors.ink }}>
                {player.isFollowing ? '✓ Siguiendo' : '+ Seguir'}
              </Text>
            </Pressable>
            {player.isFollowing && (
              <Pressable
                onPress={onToggleNotify}
                style={{
                  width: 42, height: 42, borderRadius: 10,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: player.notifyOnMatch ? '#FFFFFF' : 'rgba(255,255,255,0.18)',
                }}
              >
                <Bell
                  size={18}
                  color={player.notifyOnMatch ? colors.ink : '#FFFFFF'}
                  fill={player.notifyOnMatch ? colors.ink : 'none'}
                />
              </Pressable>
            )}
            {onMessage && (
              <Pressable
                onPress={onMessage}
                accessibilityLabel="Enviar mensaje"
                style={{
                  width: 42, height: 42, borderRadius: 10,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}
              >
                <MessageCircle size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          {/* Stats — mismo tratamiento blanco-sobre-azul que "posts/seguidores/
              siguiendo" del perfil propio. Acá solo 2: nadie se sigue a sí
              mismo, así que no hay un tercer stat de "posts". */}
          <View style={{ flexDirection: 'row', gap: 22, marginTop: 16 }}>
            <Pressable onPress={onOpenFollowers}>
              <HeroStat value={player.followers} label="SEGUIDORES"/>
            </Pressable>
            <Pressable onPress={onOpenFollowing}>
              <HeroStat value={player.followingCount} label="SIGUIENDO"/>
            </Pressable>
          </View>
        </View>

        {/* Una sola pestaña: no hay (todavía) historial de partidos de OTRO
            jugador conectado acá. Mismo `TabStrip` que el perfil propio —
            ver su comentario. */}
        <TabStrip tabs={[{ id: 'highlights', label: '▶ HIGHLIGHTS' }]} active="highlights" onChange={() => {}}/>

        {/* Tarjeta EN VIVO — arriba del grid, no mezclada adentro: un partido
            en curso es urgente y transitorio, no un ítem más de la galería. */}
        {hasLive && (
          <Pressable
            onPress={() => onOpenLive?.(player.liveGame!.id)}
            style={{
              margin: 12, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.ink,
              borderWidth: 2, borderColor: colors.live,
            }}
          >
            <View style={{ height: 160, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {player.liveGame!.streamUrl && isFocused ? (
                <InlineVideo
                  key={player.liveGame!.id}
                  uri={player.liveGame!.streamUrl}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <Svg viewBox="0 0 200 110" width="45%" style={{ opacity: 0.22 }}>
                  <Rect x={20} y={15} width={160} height={80} stroke={colors.accent} strokeWidth={1.5} fill="none"/>
                  <Line x1={100} y1={15} x2={100} y2={95} stroke={colors.accent} strokeWidth={1.5}/>
                </Svg>
              )}
              <View style={{ position: 'absolute', top: 8, left: 8 }}>
                <StatusBadge status="LIVE"/>
              </View>
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{player.liveGame!.court} · {player.liveGame!.club}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }}>Verlo en vivo →</Text>
            </View>
          </Pressable>
        )}

        {/* Grid — mismo componente y mismo layout que el perfil propio. */}
        {!hasClips && !hasLive ? (
          <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Nada por ahora</Text>
            <Text style={{ fontSize: 12, color: colors.muted2, textAlign: 'center', lineHeight: 18 }}>
              Este jugador todavía no tiene highlights ni partidos en vivo.
            </Text>
          </View>
        ) : hasClips ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 2 }}>
            {player.clips.map(c => (
              <Pressable
                key={c.id}
                onPress={() => onOpenClip?.(c)}
                style={{ width: '33.333%', padding: 1 }}>
                <ContentThumb
                  kind="highlight"
                  durationLabel={c.length}
                  aspect="square"
                  imageUri={c.thumbnailUrl}
                />
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}
    </SafeAreaView>
  );
}

/* ───────────── Helpers ───────────── */

/** Mismo tratamiento que los stats del hero del perfil propio. */
function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 }}>
        {label}
      </Text>
    </View>
  );
}
