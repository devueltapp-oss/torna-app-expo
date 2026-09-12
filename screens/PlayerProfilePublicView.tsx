import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ChevronLeft, Bell, MessageCircle, BadgeCheck } from 'lucide-react-native';
import { useTheme } from '../theme';
import { StatusBadge, TabStrip } from '../components/ui';
import { ProfileHeroAvatar } from '../components/ProfileHeroAvatar';
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
  const { colors, isDark } = useTheme();
  const [tab, setTab] = React.useState<TabKey>('highlights');

  const hasLive = player.isLiveNow && !!player.liveGame;

  const grid = tab === 'highlights' ? player.clips : matches;

  // Swipe lateral para cambiar de pestaña — ver el comentario equivalente en
  // PlayerOwnProfileScreen.tsx (2026-09-10).
  const swipeTabs = React.useMemo(() => Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 60) {
        setTab((t) => (t === 'highlights' ? 'matches' : 'highlights'));
      }
    }), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero — mismo tratamiento que el perfil propio (ver PlayerOwnProfileScreen).
            ⚠️ Fondo `colors.bg` (2026-09-09), NO `colors.ink` — ver el comentario
            equivalente en PlayerOwnProfileScreen.tsx para el motivo. */}
        <View style={{ backgroundColor: colors.bg, padding: 16, paddingBottom: 18, overflow: 'hidden' }}>
          {/* ⛔ Acá había un botón de "···" que no hacía NADA — se sacó junto
              con el resto de botones muertos de la app (mismo criterio que el
              chrome del visor).
              Username + nivel como título de la fila (2026-09-11): antes iba
              el nombre acá y username/club/nivel bajo el avatar — se invirtió
              (mismo cambio que `PlayerOwnProfileScreen.tsx`). `minHeight: 52`
              iguala la altura al resto de los headers de la app (`AppHeader`).
              El hueco de la derecha (mismo ancho que el botón de volver) es
              solo para centrar el título — no hace nada. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 }}>
            <Pressable onPress={onBack} style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.bg2, alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={18} color={colors.text}/>
            </Pressable>
            <Text
              style={{ flex: 1, textAlign: 'center', fontWeight: '800', fontSize: 17, letterSpacing: -0.2, color: colors.text }}
              numberOfLines={1}
            >
              {[player.username, player.club, `CAT. ${player.category ?? 7}`].filter(Boolean).join(' · ')}
            </Text>
            <View style={{ width: 34 }}/>
          </View>

          {/* Avatar + stats en la MISMA fila (2026-09-10, estilo Instagram) —
              antes las stats iban en su propia fila más abajo, y encima solo
              traían 2 (sin "posts": acá SÍ hay, son los highlights/partidos
              públicos de este jugador). Nombre/username pasan a su propia
              línea, debajo de esta fila. */}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 18, alignItems: 'center' }}>
            {/* Tap en la foto → abre el vivo si el perfil está en vivo.
                Mantener presionado → foto de perfil a pantalla completa. */}
            <ProfileHeroAvatar
              name={player.name}
              imageUri={player.profilePicture}
              live={hasLive}
              onPressLive={() => player.liveGame && onOpenLive?.(player.liveGame.id)}
            />
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
              <HeroStat value={player.clips.length + matches.length} label="POSTS"/>
              <Pressable onPress={onOpenFollowers}>
                <HeroStat value={player.followers} label="SEGUIDORES"/>
              </Pressable>
              <Pressable onPress={onOpenFollowing}>
                <HeroStat value={player.followingCount} label="SIGUIENDO"/>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            {/* Username/club/nivel ya se muestran arriba, como título de la
                fila (ver más arriba) — acá solo va el nombre (+ badge de club).
                ⚠️ Nivel con default 7 (2026-09-10) — ver el comentario
                equivalente en PlayerOwnProfileScreen.tsx. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.4, flexShrink: 1 }} numberOfLines={1}>
                {player.name}
              </Text>
              {/* En claro el lima es casi invisible sobre blanco (1.20:1,
                  ver brand.accentStrong en tokens.ts) — se pisa con el navy
                  de fondo del modo oscuro (#08203E) a pedido (2026-09-10).
                  En oscuro sigue siendo lima, que ahí sí se distingue. */}
              {player.isClub && (
                <BadgeCheck size={18} color={isDark ? colors.accent : '#08203E'} fill="none" accessibilityLabel="Cuenta de club"/>
              )}
            </View>
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

          {/* Acciones: acá SÍ van (a diferencia del perfil propio) — seguir,
              notificar y mensajear son cosas que solo tienen sentido sobre
              OTRA cuenta. */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' }}>
            {/* ⚠️ 2026-09-09: antes "Seguir" era blanco sólido y "Siguiendo" era
                blanco translúcido — contraste pensado para el hero navy fijo. Con
                el hero en `colors.bg`, "Seguir" pasa a ser la CTA lima estándar
                (mismo par que `<Button variant="accent"/>`: fondo lima + texto
                ink) y "Siguiendo" al soft gris-azulado (`bg2`/`text`) que ya usa
                el resto de la app para estados "ya hecho". */}
            <Pressable onPress={onToggleFollow} style={{
              flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
              backgroundColor: player.isFollowing ? colors.bg2 : colors.accent,
              alignItems: 'center',
            }}>
              <Text style={{ fontWeight: '800', fontSize: 13, color: player.isFollowing ? colors.text : colors.ink }}>
                {player.isFollowing ? '✓ Siguiendo' : '+ Seguir'}
              </Text>
            </Pressable>
            {player.isFollowing && (
              <Pressable
                onPress={onToggleNotify}
                style={{
                  width: 42, height: 42, borderRadius: 10,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: player.notifyOnMatch ? colors.accent : colors.bg2,
                }}
              >
                <Bell
                  size={18}
                  color={player.notifyOnMatch ? colors.ink : colors.text}
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
                  backgroundColor: colors.bg2,
                }}
              >
                <MessageCircle size={18} color={colors.text} />
              </Pressable>
            )}
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

        {/* Grid — mismo componente y layout que el perfil propio. Swipeable:
            deslizar acá togglea Highlights ↔ Partidos (2026-09-10). */}
        <GestureDetector gesture={swipeTabs}>
          <View>
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
          </View>
        </GestureDetector>
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}
    </SafeAreaView>
  );
}

/* ───────────── Helpers ───────────── */

/** Mismo tratamiento que los stats del hero del perfil propio. */
function HeroStat({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  return (
    <View>
      {/* ⚠️ 2026-09-10: `colors.accentText` (lima en oscuro, navy en claro) —
          ver el comentario equivalente en PlayerOwnProfileScreen.tsx. */}
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accentText }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8 }}>
        {label}
      </Text>
    </View>
  );
}
