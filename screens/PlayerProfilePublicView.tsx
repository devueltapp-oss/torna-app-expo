import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, MessageCircle, BadgeCheck } from 'lucide-react-native';
import { Svg, Rect, Line } from 'react-native-svg';
import { useTheme } from '../theme';
import { StatusBadge, Avatar, TabStrip } from '../components/ui';
import { ContentThumb } from '../components/ContentThumb';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import type { PlayerPublic, PlayerClip, LibraryMatch } from '../data/types';

type TabKey = 'highlights' | 'matches';

interface Props {
  player: PlayerPublic;
  /** Partidos completos (FINISHED + recordingUrl) de este jugador — GET /game/player/:id/history. */
  matches?: LibraryMatch[];
  onBack?: () => void;
  onToggleFollow?: () => void;
  onToggleNotify?: () => void;
  /** Abre un chat directo 1-a-1 con este usuario. Oculto si no se provee. */
  onMessage?: () => void;
  onOpenLive?: (gameId: string) => void;
  onOpenClip?: (clip: PlayerClip) => void;
  /** Abre la grabación de un partido completo. */
  onOpenMatch?: (match: LibraryMatch) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}

/**
 * Perfil público de OTRO usuario (jugador o club). Es la MISMA pantalla que el
 * perfil propio (`PlayerOwnProfileScreen`): hero azul con motivo de cancha,
 * avatar con anillo, nombre/username/nivel, `TabStrip` de dos pestañas
 * (Highlights / Partidos) y grid 3-col con `ContentThumb`. Lo único que cambia:
 *
 *   - NO están los botones propios (⚙ ajustes, 🔒 biblioteca privada): acá el
 *     hueco superior lo ocupa "volver".
 *   - SÍ está la fila de acciones sobre otra cuenta (seguir / notificar /
 *     mensaje) y sus 2 stats (nadie se sigue a sí mismo → no hay "posts").
 *   - Los "partidos" que se ven acá son SOLO los completos/públicos (todos los
 *     FINISHED con grabación); no hay privados de otro usuario.
 *
 * En vivo: el avatar se rodea de un aro **verde** y aparez un badge "EN VIVO"
 * tocable que abre el visor — antes había una tarjeta gigante con preview del
 * stream dentro de la galería, que tapaba el contenido real del perfil.
 *
 * Club: si `player.isClub`, un check verde junto al nombre lo identifica (antes
 * era un aro verde en el avatar, que ahora significa "en vivo").
 */
export function PlayerProfilePublicView({
  player, matches = [], onBack, onToggleFollow, onToggleNotify, onMessage,
  onOpenLive, onOpenClip, onOpenMatch, onChangeTab, activeTab = 'home',
  onOpenFollowers, onOpenFollowing,
}: Props) {
  const { colors } = useTheme();
  const [tab, setTab] = React.useState<TabKey>('highlights');

  const hasLive = player.isLiveNow && !!player.liveGame;

  const grid = tab === 'highlights' ? player.clips : matches;

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
              chrome del visor). El hueco de la derecha se deja vacío. */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={onBack} style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={18} color="#FFFFFF"/>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 14, marginTop: 18, alignItems: 'flex-end' }}>
            {/* En vivo → aro verde alrededor del avatar (antes ese aro marcaba
                "club"; ahora el club se marca con el check junto al nombre). */}
            <View style={hasLive
              ? { borderRadius: 40, borderWidth: 3, borderColor: colors.live, padding: 2 }
              : { borderRadius: 36, overflow: 'hidden' }}>
              <Avatar name={player.name} size={72} imageUri={player.profilePicture} ringColor="#FFFFFF"/>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4, flexShrink: 1 }} numberOfLines={1}>{player.name}</Text>
                {player.isClub && (
                  <BadgeCheck size={18} color={colors.accent} fill="none" accessibilityLabel="Cuenta de club"/>
                )}
              </View>
              {/* La categoría va como texto y no con CategoryBadge: acá el fondo
                  es el azul del hero en ambos temas, y el badge usa colors.text. */}
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }} numberOfLines={1}>
                {[player.username, player.club, player.category ? `CAT. ${player.category}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {hasLive && (
                <Pressable
                  onPress={() => onOpenLive?.(player.liveGame!.id)}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                  accessibilityLabel="Ver en vivo"
                >
                  <StatusBadge status="LIVE"/>
                </Pressable>
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

        {/* Dos pestañas, igual que el perfil propio — sin número debajo. */}
        <TabStrip
          tabs={[
            { id: 'highlights', label: '▶ HIGHLIGHTS' },
            { id: 'matches',    label: '◫ PARTIDOS' },
          ]}
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
        />

        {/* Grid — mismo componente y layout que el perfil propio. */}
        {grid.length === 0 ? (
          <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Nada por ahora</Text>
            <Text style={{ fontSize: 12, color: colors.muted2, textAlign: 'center', lineHeight: 18 }}>
              {tab === 'highlights'
                ? 'Este usuario todavía no tiene highlights públicos.'
                : 'Este usuario todavía no tiene partidos completos.'}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 2 }}>
            {tab === 'highlights'
              ? player.clips.map((c) => (
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
                ))
              : matches.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => onOpenMatch?.(m)}
                    style={{ width: '33.333%', padding: 1 }}>
                    <ContentThumb
                      kind="match"
                      durationLabel={m.durationLabel}
                      aspect="square"
                    />
                  </Pressable>
                ))}
          </View>
        )}
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
