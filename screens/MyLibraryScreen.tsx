/**
 * MyLibraryScreen — sección PRIVADA del player. Solo el dueño la ve.
 *
 *   Header con badge PRIVADO + nota de privacidad.
 *   2 secciones STACKED y COLAPSABLES (tap en el chevron del header):
 *     1. Mis partidos completos   — cada uno con chip Privado/Público + "Crear highlight →"
 *     2. Mis highlights           — clips recortados con chip
 *
 * Toggle de visibilidad por item: tap en el chip flippea isPublic.
 * En producción cada flip es un PATCH /me/library/:id { isPublic }.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, Lock, Scissors, Play, Trophy } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, AppHeader, SurfaceChip } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { ContentThumb } from '../components/ContentThumb';
import { VisibilityPill } from '../components/VisibilityPill';
import type {
  LibraryItem, LibraryMatch, LibraryHighlight,
} from '../data/types';

type SectionKey = 'matches' | 'highlights';

export interface MyLibraryScreenProps {
  matches: LibraryMatch[];
  highlights: LibraryHighlight[];
  onBack: () => void;
  /** Tap "Crear highlight" en un match → abre VideoEditor con esa grabación. */
  onCreateHighlight: (match: LibraryMatch) => void;
  /** Registrar resultado (gané/perdí) de un partido finalizado. */
  onRegisterResult?: (match: LibraryMatch) => void;
  /** Flip privado/público de un item. */
  onToggleVisibility: (item: LibraryItem) => void;
  /** Tap reproducir cualquier item. */
  onOpenItem?: (item: LibraryItem) => void;
  activeTab?: TabId;
  onChangeTab?: (id: TabId) => void;
}

export function MyLibraryScreen({
  matches, highlights,
  onBack, onCreateHighlight, onRegisterResult, onToggleVisibility, onOpenItem,
  activeTab, onChangeTab,
}: MyLibraryScreenProps) {
  const { colors } = useTheme();
  const [open, setOpen] = React.useState<Record<SectionKey, boolean>>({
    matches: true, highlights: true,
  });
  const toggle = (k: SectionKey) => setOpen(o => ({ ...o, [k]: !o[k] }));

  const totalPublic = [
    ...matches, ...highlights,
  ].filter(i => i.isPublic).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <AppHeader
        title="Mi biblioteca"
        left={<Pressable onPress={onBack}><ChevronLeft size={22} color={colors.text}/></Pressable>}
        right={<PrivateBadge colors={colors}/>}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: onChangeTab ? 160 : 96 }}>
        {/* Privacy note */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          backgroundColor: colors.bg2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
          marginBottom: 12,
        }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10, backgroundColor: colors.ink,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={18} color={colors.accent}/>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
              Solo vos ves esta sección
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted2, lineHeight: 15 }}>
              Tocá el chip de visibilidad para hacer público un item. {totalPublic} público{totalPublic === 1 ? '' : 's'} ahora.
            </Text>
          </View>
        </View>

        {/* MIS PARTIDOS */}
        <SectionHeader
          title="Mis partidos completos" count={matches.length}
          collapsed={!open.matches} onToggle={() => toggle('matches')}
        />
        {open.matches ? (
          <View style={{ gap: 8 }}>
            {matches.map(m => (
              <MatchRow
                key={m.id} match={m}
                onCreateHighlight={() => onCreateHighlight(m)}
                onRegisterResult={onRegisterResult ? () => onRegisterResult(m) : undefined}
                onToggleVisibility={() => onToggleVisibility(m)}
                onOpen={() => onOpenItem?.(m)}
              />
            ))}
          </View>
        ) : null}

        {/* MIS HIGHLIGHTS */}
        <SectionHeader
          title="Mis highlights" count={highlights.length}
          collapsed={!open.highlights} onToggle={() => toggle('highlights')}
        />
        {open.highlights ? (
          <View style={{ gap: 8 }}>
            {highlights.map(h => (
              <ItemRow
                key={h.id} item={h}
                onToggleVisibility={() => onToggleVisibility(h)}
                onOpen={() => onOpenItem?.(h)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      {onChangeTab && <BottomTabBar role="player" active={activeTab ?? 'profile'} onChange={onChangeTab}/>}
    </SafeAreaView>
  );
}

/* ───────────── Sub-components ───────────── */

function PrivateBadge({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{
      backgroundColor: colors.bg2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    }}>
      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.muted2, letterSpacing: 0.6 }}>
        PRIVADO
      </Text>
    </View>
  );
}

function SectionHeader({ title, count, collapsed, onToggle }: {
  title: string; count: number; collapsed: boolean; onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onToggle} style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 4, paddingTop: 14, paddingBottom: 6,
    }}>
      <View style={{
        width: 14, height: 14, alignItems: 'center', justifyContent: 'center',
        transform: [{ rotate: collapsed ? '-90deg' : '0deg' }],
      }}>
        <ChevronDown size={14} color={colors.muted2}/>
      </View>
      <Text style={{
        fontSize: 11, fontWeight: '800', color: colors.muted2, letterSpacing: 1.4,
      }}>
        {title.toUpperCase()}{' '}
        <Text style={{ color: colors.text, marginLeft: 4 }}>· {count}</Text>
      </Text>
    </Pressable>
  );
}

function MatchRow({ match, onCreateHighlight, onRegisterResult, onToggleVisibility, onOpen }: {
  match: LibraryMatch;
  onCreateHighlight: () => void;
  onRegisterResult?: () => void;
  onToggleVisibility: () => void;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', gap: 12, padding: 10, borderRadius: 14,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    }}>
      <View style={{ width: 96 }}>
        <ContentThumb kind="match" durationLabel={match.durationLabel} aspect="wide"/>
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <VisibilityPill isPublic={match.isPublic} onPress={onToggleVisibility}/>
          <SurfaceChip surface={match.surface}/>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, lineHeight: 17 }}>
          {match.title}
        </Text>
        {match.subtitle ? (
          <Text style={{ fontSize: 11, color: colors.muted2, lineHeight: 15 }}>{match.subtitle}</Text>
        ) : null}
        {match.highlightsCount > 0 ? (
          <Text style={{ fontSize: 10, color: colors.accentText, fontWeight: '800', marginTop: 2, letterSpacing: 0.6 }}>
            {match.highlightsCount} HIGHLIGHT{match.highlightsCount === 1 ? '' : 'S'} CREADO{match.highlightsCount === 1 ? '' : 'S'}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <Pressable onPress={onCreateHighlight} style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
          }}>
            <Scissors size={12} color={colors.ink}/>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 11 }}>Crear highlight</Text>
          </Pressable>
          <Pressable onPress={onOpen} style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
          }}>
            <Play size={11} color={colors.text2}/>
            <Text style={{ color: colors.text2, fontWeight: '700', fontSize: 11 }}>Reproducir</Text>
          </Pressable>
          {match.resultRegistered ? (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: colors.bg2,
            }}>
              <Trophy size={11} color={colors.muted2}/>
              <Text style={{ color: colors.muted2, fontWeight: '700', fontSize: 11 }}>Resultado cargado</Text>
            </View>
          ) : onRegisterResult ? (
            <Pressable onPress={onRegisterResult} style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
            }}>
              <Trophy size={11} color={colors.text2}/>
              <Text style={{ color: colors.text2, fontWeight: '700', fontSize: 11 }}>Registrar resultado</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ItemRow({ item, onToggleVisibility, onOpen }: {
  item: LibraryHighlight;
  onToggleVisibility: () => void;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  const isHighlight = item.kind === 'highlight';
  return (
    <View style={{
      flexDirection: 'row', gap: 12, padding: 10, borderRadius: 14,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    }}>
      <View style={{ width: 96 }}>
        <ContentThumb kind={item.kind} durationLabel={item.durationLabel} aspect="wide"/>
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <VisibilityPill isPublic={item.isPublic} onPress={onToggleVisibility}/>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, lineHeight: 17 }}>{item.title}</Text>
        {isHighlight && item.fromMatch ? (
          <Text style={{ fontSize: 11, color: colors.muted2 }}>
            del partido <Text style={{ fontFamily: 'Menlo', color: colors.text2, fontWeight: '700' }}>{item.fromMatch}</Text> · {item.date}
          </Text>
        ) : item.date ? (
          <Text style={{ fontSize: 11, color: colors.muted2 }}>{item.date}</Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          <Pressable onPress={onOpen} style={{
            flexDirection: 'row', alignItems: 'center', gap: 4,
            borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
          }}>
            <Play size={11} color={colors.text2}/>
            <Text style={{ color: colors.text2, fontWeight: '700', fontSize: 11 }}>Reproducir</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
