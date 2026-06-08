/**
 * PlayerOwnProfileScreen — vista pública del PROPIO perfil. Estilo
 * IG/TikTok con header de stats + tabs (Highlights / Partidos / Fotos)
 * + grid 3-col. Solo muestra items con isPublic = true.
 *
 *   Header: avatar + 3 stats (posts / seguidores / siguiendo) + bio
 *   Tabs:   ▶ HIGHLIGHTS  |  ◫ PARTIDOS  |  ▦ FOTOS
 *   Grid:   3 columnas con thumbnails (ContentThumb)
 *
 *   Botón 🔒 (Lock)     → MyLibraryScreen (biblioteca privada)
 *   Botón ⚙ (Settings) → PlayerSettingsScreen
 *
 * Entry point: tab "Perfil" del BottomTabBar cuando el rol es player.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Settings, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Avatar, Button } from '../components/ui';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { ContentThumb } from '../components/ContentThumb';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import type {
  ProfileOwner, LibraryItem, LibraryMatch, LibraryHighlight,
} from '../data/types';

type TabKey = 'highlights' | 'matches' | 'photos';

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
  // El perfil propio aún no recibe fotos como fuente de datos; el tab Fotos
  // muestra el empty state hasta que se cablee.
  const publicPhotos: LibraryItem[] = [];
  const totalPosts   = publicHl.length + publicMatch.length;

  const grid: LibraryItem[] =
    tab === 'highlights' ? publicHl : tab === 'matches' ? publicMatch : publicPhotos;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Top bar — @username + lock + settings */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{owner.username}</Text>
          <ChevronRight size={16} color={colors.muted2} style={{ transform: [{ rotate: '90deg' }] }}/>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <IconButton onPress={onOpenLibrary} colors={colors} dot>
            <Lock size={18} color={colors.text}/>
          </IconButton>
          <IconButton onPress={onOpenSettings} colors={colors}>
            <Settings size={18} color={colors.text}/>
          </IconButton>
        </View>
      </View>

      <ScrollView>
        {/* Avatar + stats row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Pressable onPress={() => owner.profilePicture && setViewer(true)}>
            <Avatar name={owner.name} size={80} imageUri={owner.profilePicture}/>
          </Pressable>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
            <StatBlock value={totalPosts} label="posts" colors={colors}/>
            <StatBlock value={owner.followers} label="seguidores" colors={colors} onPress={onOpenFollowers}/>
            <StatBlock value={owner.following} label="siguiendo" colors={colors} onPress={onOpenFollowing}/>
          </View>
        </View>

        {/* Bio */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>{owner.name}</Text>
          <Text style={{ fontSize: 12, color: colors.muted2 }}>{owner.club} · {owner.location}</Text>
        </View>

        {/* CTAs */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Button fullWidth size="sm" variant="soft" onPress={onOpenSettings}>Editar perfil</Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button fullWidth size="sm" variant="soft">Compartir</Button>
          </View>
        </View>

        {/* Tabs */}
        <TabStrip
          tabs={[
            { id: 'highlights', label: '▶ HIGHLIGHTS', count: publicHl.length },
            { id: 'matches',    label: '◫ PARTIDOS',   count: publicMatch.length },
            { id: 'photos',     label: '▦ FOTOS',      count: publicPhotos.length },
          ]}
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
        />

        {/* Grid */}
        {grid.length === 0 ? (
          <View style={{ paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Nada por ahora</Text>
            <Text style={{ fontSize: 12, color: colors.muted2, textAlign: 'center', lineHeight: 18 }}>
              Pasá a tu{' '}
              <Text onPress={onOpenLibrary} style={{ color: colors.accentText, fontWeight: '700' }}>
                biblioteca privada
              </Text>
              {' '}y marcá algo como público para que aparezca acá.
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

function IconButton({ children, onPress, colors, dot }: {
  children: React.ReactNode;
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  dot?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bg2,
      alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
    })}>
      {children}
      {dot ? (
        <View style={{
          position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3,
          backgroundColor: colors.accent,
        }}/>
      ) : null}
    </Pressable>
  );
}

function StatBlock({ value, label, colors, onPress }: {
  value: number; label: string; colors: ReturnType<typeof useTheme>['colors'];
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.muted2 }}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ alignItems: 'center', opacity: pressed ? 0.6 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return <View style={{ alignItems: 'center' }}>{content}</View>;
}

interface TabStripProps {
  tabs: { id: string; label: string; count: number }[];
  active: string;
  onChange: (id: string) => void;
}

function TabStrip({ tabs, active, onChange }: TabStripProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, marginTop: 4 }}>
      {tabs.map(tab => {
        const on = tab.id === active;
        return (
          <Pressable key={tab.id} onPress={() => onChange(tab.id)} style={{
            flex: 1, paddingVertical: 12, alignItems: 'center', gap: 4, position: 'relative',
          }}>
            <Text style={{
              fontSize: 11, fontWeight: '800', letterSpacing: 1.2,
              color: on ? colors.text : colors.muted2,
            }}>{tab.label}</Text>
            <Text style={{ fontSize: 10, color: colors.muted2 }}>{tab.count}</Text>
            {on ? (
              <View style={{
                position: 'absolute', bottom: -1, left: '20%', right: '20%',
                height: 2, borderRadius: 1, backgroundColor: colors.accent,
              }}/>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
