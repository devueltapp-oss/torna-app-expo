/**
 * PlayerOwnProfileScreen — vista pública del PROPIO perfil.
 *
 * Mismo lenguaje visual que `PlayerProfilePublicView` (el perfil de OTRO
 * jugador) a propósito — hero con motivo de cancha (⚠️ fondo `colors.bg`
 * desde 2026-09-09, antes `colors.ink`: ver esa fecha más abajo), avatar con
 * anillo, nombre/username/nivel en la misma línea, pestañas + grid 3-col con
 * `ContentThumb`. Antes eran dos pantallas con estilos distintos (una barra
 * plana acá, un hero con foto de fondo allá) que hacían sentir la app como
 * dos apps distintas para la misma cosa (ver un perfil).
 *
 * Lo que NO se comparte, a propósito — son acciones que solo tienen sentido
 * sobre tu propia cuenta y nadie más puede tocar:
 *   - Botón 🔒 → MyLibraryScreen (biblioteca privada)
 *   - Botón ⚙ → PlayerSettingsScreen
 * En el perfil ajeno esos dos huecos (arriba-izq/arriba-der del hero) los
 * ocupan, en cambio, "volver" y nada (se sacó un botón de "···" que no hacía
 * nada — ver `PlayerProfilePublicView`).
 *
 * Diferencias que SÍ quedan, porque los datos son distintos por naturaleza:
 *   - Acá hay 3 stats (posts/seguidores/siguiendo); en el ajeno, 2 (no te
 *     seguís a vos mismo). Nadie sigue/notifica/mensajea su propio perfil,
 *     así que esa fila de acciones no existe acá.
 *   - Acá hay pestañas "Highlights"/"Partidos" con datos reales tuyos. El
 *     ajeno usa el mismo `TabStrip`, pero con una sola pestaña ("Highlights"):
 *     esta pantalla no trae el historial de partidos de OTRO jugador todavía
 *     (`usePlayerMatches` solo se usa para la biblioteca propia hoy). Agregar
 *     esa pestaña es una tarea aparte, con su propio wiring de datos.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Play, Settings } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar, TabStrip } from '../components/ui';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { ContentThumb } from '../components/ContentThumb';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import type {
  ProfileOwner, LibraryItem, LibraryMatch, LibraryHighlight,
} from '../data/types';

type TabKey = 'highlights' | 'matches';

export interface PlayerOwnProfileScreenProps {
  owner: ProfileOwner;
  matches: LibraryMatch[];
  highlights: LibraryHighlight[];
  /** Para sumar más posts al contador (highlight pub + match pub). */
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
  onOpenItem?: (item: LibraryItem) => void;
  /** Abre la lista de seguidores / seguidos al tocar el conteo. */
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
  activeTab: TabId;
  onChangeTab: (id: TabId) => void;
  /** `MainPlayer` renderiza una sola tab bar externa y fija: no dupliques la suya. */
  hideBottomTabBar?: boolean;
}

export function PlayerOwnProfileScreen({
  owner, matches, highlights,
  onOpenLibrary, onOpenSettings, onOpenItem,
  onOpenFollowers, onOpenFollowing,
  activeTab, onChangeTab, hideBottomTabBar,
}: PlayerOwnProfileScreenProps) {
  const { colors } = useTheme();
  const [tab, setTab] = React.useState<TabKey>('highlights');
  const [viewer, setViewer] = React.useState(false);

  const publicHl     = highlights.filter(h => h.isPublic);
  const publicMatch  = matches.filter(m => m.isPublic);
  const totalPosts   = publicHl.length + publicMatch.length;

  // Contenido del perfil = highlights + partidos. No hay subidas sueltas de
  // fotos (la única imagen subible es el avatar).
  const grid: LibraryItem[] = tab === 'highlights' ? publicHl : publicMatch;

  /**
   * Swipe lateral para cambiar de pestaña sin tocar el `TabStrip` (2026-09-10).
   * Con solo 2 pestañas, cualquier swipe decisivo alcanza — no hace falta
   * distinguir dirección. `activeOffsetX` + `failOffsetY` para no pelear con
   * el scroll vertical del `ScrollView` que envuelve toda la pantalla: el
   * gesto solo se activa si el movimiento es sobre todo horizontal; si es
   * vertical, cede al scroll.
   */
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
        {/* Hero — mismo tratamiento que el perfil ajeno (ver PlayerProfilePublicView).
            ⚠️ Fondo `colors.bg` (2026-09-09), NO `colors.ink`: el hero navy fijo
            desentonaba contra la sección de highlights/partidos de abajo, que
            siempre usó `colors.bg` — en modo claro quedaba un bloque azul oscuro
            arriba de una página blanca. Unificado con la superficie de la
            pantalla; todo lo que abajo asumía "texto blanco sobre navy" pasa a
            los tokens de texto normales. */}
        <View style={{ backgroundColor: colors.bg, padding: 16, paddingBottom: 18, overflow: 'hidden' }}>
          {/* Acá no va "volver" (esto es un tab raíz, no una pantalla apilada):
              el lugar de los dos íconos de arriba lo ocupan las únicas acciones
              que existen solo sobre la cuenta propia.
              Username + nivel como título de la fila (2026-09-11): antes iba
              el nombre acá y username/nivel bajo el avatar — se invirtió.
              `minHeight: 52` iguala la altura al resto de los headers de la
              app (`AppHeader`), para que Inicio/Juegos/Chats/Perfil no salten
              de alto al cambiar de pestaña.

              Antes, junto al username, se pintaba `club · ciudad`, pero la
              ciudad venía de `User.region` — un dato viejo cargado a mano (a
              alguien de Ciudad Guayana le decía "caracas") que la app ya no
              edita: el único uso de la ubicación es el aviso de partidas
              cercanas, que es aproximado y no se muestra. `ProfileOwner.club`
              además llega siempre vacío en la app.

              ⚠️ Nivel con default 7 (2026-09-10): `category` es nullable
              (nadie lo declaró todavía) y antes, sin nivel, el "· CAT. N"
              directamente desaparecía — mostrar SIEMPRE algo, 7 = iniciación
              (el mismo default que usa el manual de pádel para "sin declarar"). */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 }}>
            <Text
              style={{ flex: 1, fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2, color: colors.text }}
              numberOfLines={1}
            >
              {owner.username} · CAT. {owner.category ?? 7}
            </Text>
            <HeroIconButton onPress={onOpenLibrary} dot>
              <Play size={16} color={colors.text}/>
            </HeroIconButton>
            <HeroIconButton onPress={onOpenSettings}>
              <Settings size={16} color={colors.text}/>
            </HeroIconButton>
          </View>

          {/* Avatar + stats en la MISMA fila (2026-09-10, estilo Instagram):
              antes las stats iban en una fila propia debajo de avatar+nombre.
              Nombre/username pasan a su propia línea, debajo de esta fila. */}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 18, alignItems: 'center' }}>
            <Pressable onPress={() => owner.profilePicture && setViewer(true)}>
              <View style={{ borderRadius: 36, overflow: 'hidden' }}>
                <Avatar name={owner.name} size={72} imageUri={owner.profilePicture} ringColor={colors.bg}/>
              </View>
            </Pressable>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
              <HeroStat value={totalPosts} label="POSTS"/>
              <Pressable onPress={onOpenFollowers}>
                <HeroStat value={owner.followers} label="SEGUIDORES"/>
              </Pressable>
              <Pressable onPress={onOpenFollowing}>
                <HeroStat value={owner.following} label="SIGUIENDO"/>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            {/*
              ⛔ Bajo el avatar va el **nombre**, nada más (2026-09-11) —
              username + nivel ya se muestran arriba, como título de la fila.
            */}
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.4 }} numberOfLines={1}>
              {owner.name}
            </Text>
          </View>
        </View>

        {/* Tabs — ⚠️ **sin número debajo** (2026-09-02). El contenido de cada
            pestaña ya está a un toque y el grid lo muestra entero: el contador
            solo repetía, en chiquito, algo que se ve. */}
        <TabStrip
          tabs={[
            { id: 'highlights', label: 'HIGHLIGHTS' },
            { id: 'matches',    label: 'PARTIDOS' },
          ]}
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
        />

        {/* Grid — swipeable: deslizar acá togglea Highlights ↔ Partidos. */}
        <GestureDetector gesture={swipeTabs}>
          <View>
            {grid.length === 0 ? (
              <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Nada por ahora</Text>
                <Text style={{ fontSize: 12, color: colors.muted2, textAlign: 'center', lineHeight: 18 }}>
                  Pasa a tus{' '}
                  <Text onPress={onOpenLibrary} style={{ color: colors.accentText, fontWeight: '700' }}>
                    videos
                  </Text>
                  {' '}y marca algo como público para que aparezca aquí.
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 2 }}>
                {grid.map(item => (
                  <Pressable
                    key={item.id}
                    onPress={() => onOpenItem?.(item)}
                    style={{ width: '33.333%', padding: 1 }}>
                    <ContentThumb
                      kind={item.kind}
                      durationLabel={item.durationLabel}
                      aspect="square"
                      imageUri={item.kind === 'highlight' ? item.thumbnailUrl : undefined}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </GestureDetector>
      </ScrollView>

      {!hideBottomTabBar && <BottomTabBar role="player" active={activeTab} onChange={onChangeTab}/>}

      <ImageViewerModal
        visible={viewer}
        uri={owner.profilePicture}
        onClose={() => setViewer(false)}
      />
    </SafeAreaView>
  );
}

/* ───────────── Helpers ───────────── */

/** Mismo botón que "volver"/"···" en el hero del perfil ajeno — fondo `bg2`,
 * ícono `text`, igual que cualquier botón secundario sobre `colors.bg` en el
 * resto de la app (p. ej. el buscador de HomeScreen). */
function HeroIconButton({ children, onPress, dot }: {
  children: React.ReactNode;
  onPress?: () => void;
  dot?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      width: 34, height: 34, borderRadius: 11, backgroundColor: colors.bg2,
      alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
    })}>
      {children}
      {dot ? (
        <View style={{
          position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3,
          backgroundColor: '#BFFE3D',
        }}/>
      ) : null}
    </Pressable>
  );
}

/** Mismo tratamiento que los conteos de seguidores/seguidos del perfil ajeno. */
function HeroStat({ value, label }: { value: number; label: string }) {
  const { colors } = useTheme();
  return (
    <View>
      {/* ⚠️ 2026-09-10: el número va en `colors.accentText` (lima en oscuro,
          el mismo #BFFE3D de siempre; navy en claro) — NO `colors.accent` a
          secas, que sobre blanco da 1.20:1 de contraste y queda invisible
          (ver la nota de `brand.accentStrong` en tokens.ts). */}
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accentText }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.muted2, letterSpacing: 0.8 }}>
        {label}
      </Text>
    </View>
  );
}
