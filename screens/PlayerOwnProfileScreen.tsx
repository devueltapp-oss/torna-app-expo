/**
 * PlayerOwnProfileScreen — vista pública del PROPIO perfil.
 *
 * Mismo lenguaje visual que `PlayerProfilePublicView` (el perfil de OTRO
 * jugador) a propósito — hero azul con motivo de cancha, avatar con anillo
 * blanco, nombre/username/nivel en la misma línea, pestañas + grid 3-col con
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
import { Lock, Settings } from 'lucide-react-native';
import { Svg, Rect, Line } from 'react-native-svg';
import { useTheme } from '../theme';
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
}

export function PlayerOwnProfileScreen({
  owner, matches, highlights,
  onOpenLibrary, onOpenSettings, onOpenItem,
  onOpenFollowers, onOpenFollowing,
  activeTab, onChangeTab,
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero — mismo tratamiento que el perfil ajeno (ver PlayerProfilePublicView) */}
        <View style={{ backgroundColor: colors.ink, padding: 16, paddingBottom: 18, overflow: 'hidden' }}>
          <Svg viewBox="0 0 390 220" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.14 }}>
            <Rect x={40} y={40} width={310} height={140} stroke={colors.accent} strokeWidth={2} fill="none"/>
            <Line x1={195} y1={40} x2={195} y2={180} stroke={colors.accent} strokeWidth={2}/>
          </Svg>

          {/* Acá no va "volver" (esto es un tab raíz, no una pantalla apilada):
              el lugar de los dos íconos de arriba lo ocupan las únicas acciones
              que existen solo sobre la cuenta propia. */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <HeroIconButton onPress={onOpenLibrary} dot>
              <Lock size={16} color="#FFFFFF"/>
            </HeroIconButton>
            <HeroIconButton onPress={onOpenSettings}>
              <Settings size={16} color="#FFFFFF"/>
            </HeroIconButton>
          </View>

          <View style={{ flexDirection: 'row', gap: 14, marginTop: 18, alignItems: 'flex-end' }}>
            <Pressable onPress={() => owner.profilePicture && setViewer(true)}>
              <View style={{ borderRadius: 36, overflow: 'hidden' }}>
                <Avatar name={owner.name} size={72} imageUri={owner.profilePicture} ringColor="#FFFFFF"/>
              </View>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 }} numberOfLines={1}>
                {owner.name}
              </Text>
              {/*
                ⛔ Bajo el nombre va **username + nivel**, nada más.

                Antes se pintaba `club · ciudad`, pero la ciudad venía de
                `User.region` — un dato viejo cargado a mano (a alguien de
                Ciudad Guayana le decía "caracas") que la app ya no edita: el
                único uso de la ubicación es el aviso de partidas cercanas,
                que es aproximado y no se muestra. `ProfileOwner.club` además
                llega siempre vacío en la app.
              */}
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }} numberOfLines={1}>
                {[owner.username, owner.category ? `CAT. ${owner.category}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>

          {/* Stats — posts/seguidores/siguiendo, mismo tratamiento blanco-sobre-azul
              que los conteos del perfil ajeno (ahí solo hay 2: nadie se sigue a
              sí mismo, así que no hay fila de "Seguir/Notificar/Mensaje" acá). */}
          <View style={{ flexDirection: 'row', gap: 22, marginTop: 16 }}>
            <HeroStat value={totalPosts} label="POSTS"/>
            <Pressable onPress={onOpenFollowers}>
              <HeroStat value={owner.followers} label="SEGUIDORES"/>
            </Pressable>
            <Pressable onPress={onOpenFollowing}>
              <HeroStat value={owner.following} label="SIGUIENDO"/>
            </Pressable>
          </View>
        </View>

        {/* Tabs — ⚠️ **sin número debajo** (2026-09-02). El contenido de cada
            pestaña ya está a un toque y el grid lo muestra entero: el contador
            solo repetía, en chiquito, algo que se ve. */}
        <TabStrip
          tabs={[
            { id: 'highlights', label: '▶ HIGHLIGHTS' },
            { id: 'matches',    label: '◫ PARTIDOS' },
          ]}
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
        />

        {/* Grid */}
        {grid.length === 0 ? (
          <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Nada por ahora</Text>
            <Text style={{ fontSize: 12, color: colors.muted2, textAlign: 'center', lineHeight: 18 }}>
              Pasa a tu{' '}
              <Text onPress={onOpenLibrary} style={{ color: colors.accentText, fontWeight: '700' }}>
                biblioteca privada
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
      </ScrollView>

      <BottomTabBar role="player" active={activeTab} onChange={onChangeTab}/>

      <ImageViewerModal
        visible={viewer}
        uri={owner.profilePicture}
        onClose={() => setViewer(false)}
      />
    </SafeAreaView>
  );
}

/* ───────────── Helpers ───────────── */

/** Mismo botón translúcido que "volver"/"···" en el hero del perfil ajeno. */
function HeroIconButton({ children, onPress, dot }: {
  children: React.ReactNode;
  onPress?: () => void;
  dot?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
    })}>
      {children}
      {dot ? (
        <View style={{
          position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3,
          backgroundColor: '#D6FF7E',
        }}/>
      ) : null}
    </Pressable>
  );
}

/** Mismo tratamiento que los conteos de seguidores/seguidos del perfil ajeno. */
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
