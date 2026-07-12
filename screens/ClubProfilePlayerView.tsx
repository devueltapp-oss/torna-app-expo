import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Line } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { ChevronLeft, MoreHorizontal, MapPin, Eye, Play, Camera } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { SectionHeader, StatusBadge, Avatar, SurfaceChip } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import type { ClubPublic, ClipPreview } from '../data/types';

interface Props {
  club: ClubPublic;
  onBack?: () => void;
  onToggleFollow?: () => void;
  onReserveCourt?: (courtId: string) => void;
  onOpenLive?: (gameId: string) => void;
  onOpenClip?: (clip: ClipPreview) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}

/**
 * Perfil público de un CLUB, visto por un jugador. Reutiliza el MISMO lenguaje
 * visual que el perfil de usuario (`PlayerProfilePublicView`): header + highlights,
 * para no confundir. Diferencias de club: etiqueta "CLUB" + anillo verde en el
 * avatar, y una sección extra de "Canchas y horarios" para reservar.
 */
export function ClubProfilePlayerView({
  club, onBack, onToggleFollow, onReserveCourt, onOpenLive, onOpenClip,
  onChangeTab, activeTab = 'home', onOpenFollowers, onOpenFollowing,
}: Props) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  const hasHighlights = club.highlights.live.length > 0 || club.highlights.clips.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header — mismo layout que el perfil de usuario */}
        <View style={{ backgroundColor: colors.ink, padding: 16, paddingBottom: 18, overflow: 'hidden' }}>
          <Svg viewBox="0 0 390 220" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.14 }}>
            <Rect x={40} y={40} width={310} height={140} stroke={colors.accent} strokeWidth={2} fill="none"/>
            <Line x1={195} y1={40} x2={195} y2={180} stroke={colors.accent} strokeWidth={2}/>
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable onPress={onBack} style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={18} color="#FFFFFF"/>
            </Pressable>
            <Pressable style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <MoreHorizontal size={18} color="#FFFFFF"/>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 14, marginTop: 18, alignItems: 'flex-end' }}>
            {/* Diferencia de club: anillo VERDE alrededor del avatar */}
            <View style={{ borderRadius: 40, borderWidth: 3, borderColor: colors.accent, padding: 2 }}>
              <Avatar name={club.name} size={72} ringColor={colors.accent}/>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {/* Diferencia de club: etiqueta "CLUB" (en verde) */}
              <View style={{ alignSelf: 'flex-start', backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.ink, letterSpacing: 0.8 }}>CLUB</Text>
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4, marginTop: 4 }} numberOfLines={1}>{club.name}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }} numberOfLines={1}>
                {club.handle}{club.city ? ` · ${club.city}` : ''}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' }}>
            <Pressable onPress={onToggleFollow} style={{
              flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
              backgroundColor: club.isFollowing ? 'rgba(255,255,255,0.18)' : '#FFFFFF',
              alignItems: 'center',
            }}>
              <Text style={{ fontWeight: '800', fontSize: 13, color: club.isFollowing ? '#FFFFFF' : colors.ink }}>
                {club.isFollowing ? '✓ Siguiendo' : '+ Seguir'}
              </Text>
            </Pressable>
            <Pressable onPress={onOpenFollowers} style={{ alignItems: 'flex-end', minWidth: 60 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{club.followers.toLocaleString('es-AR')}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 }}>SEGUIDORES</Text>
            </Pressable>
            <Pressable onPress={onOpenFollowing} style={{ alignItems: 'flex-end', minWidth: 60 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{(club.followingCount ?? 0).toLocaleString('es-AR')}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 }}>SIGUIENDO</Text>
            </Pressable>
          </View>
        </View>

        {/* Highlights — mismo bloque que el perfil de usuario */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <SectionHeader title="Momentos destacados"/>
        </View>
        {!hasHighlights ? (
          <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 28, gap: 6 }}>
            <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: colors.text }}>Sin publicaciones</Text>
            <Text style={{ fontSize: 13, color: colors.muted2, textAlign: 'center', lineHeight: 18 }}>
              Este club todavía no tiene highlights ni partidos en vivo.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
            {/* Partidos en vivo primero */}
            {club.highlights.live.map(g => (
              <Pressable key={g.id} onPress={() => onOpenLive?.(g.id)}
                style={{ width: 200, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.live }}>
                <View style={{ height: 118, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {g.streamUrl && isFocused ? (
                    <Video key={g.id} source={{ uri: g.streamUrl }} style={StyleSheet.absoluteFill}
                      resizeMode={ResizeMode.COVER} shouldPlay isMuted isLooping={false}/>
                  ) : (
                    <Svg viewBox="0 0 200 110" width="55%" style={{ opacity: 0.22 }}>
                      <Rect x={20} y={15} width={160} height={80} stroke={colors.accent} strokeWidth={1.5} fill="none"/>
                      <Line x1={100} y1={15} x2={100} y2={95} stroke={colors.accent} strokeWidth={1.5}/>
                    </Svg>
                  )}
                  <View style={{ position: 'absolute', top: 8, left: 8 }}><StatusBadge status="LIVE"/></View>
                  <View style={{ position: 'absolute', bottom: 6, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Eye size={12} color={colors.accent}/>
                    <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>{g.viewers}</Text>
                  </View>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}>{g.court}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }} numberOfLines={1}>
                    {g.players.slice(0, 2).map(p => p.username).join(' · ')}
                  </Text>
                </View>
              </Pressable>
            ))}

            {/* Clips grabados */}
            {club.highlights.clips.map(c => (
              <Pressable key={c.id} onPress={() => onOpenClip?.(c)}
                style={({ pressed }) => ({ width: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.88 : 1 })}>
                <View style={{ height: 100, backgroundColor: colors.bg3, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={16} color={colors.ink}/>
                  </View>
                  <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(45,76,117,0.78)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700', fontFamily: fonts.mono }}>{c.length}</Text>
                  </View>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={2}>{c.title}</Text>
                  <Text style={{ fontSize: 10, color: colors.muted2, marginTop: 2 }}>{c.date}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Canchas y horarios — sección propia del club */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <SectionHeader title={`Canchas y horarios · ${club.courts.length}`}/>
          {club.courts.length === 0 && (
            <Text style={{ fontSize: 13, color: colors.muted2, paddingVertical: 10 }}>
              Este club todavía no tiene canchas cargadas.
            </Text>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {club.courts.map(c => (
              <View key={c.id} style={{
                width: '48.5%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
                borderRadius: 14, padding: 10, gap: 8,
              }}>
                <View style={{ position: 'relative', height: 64, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg viewBox="0 0 200 110" width="80%" style={{ opacity: 0.22 }}>
                    <Rect x={20} y={15} width={160} height={80} stroke={colors.accent} strokeWidth={1.5} fill="none"/>
                    <Line x1={100} y1={15} x2={100} y2={95} stroke={colors.accent} strokeWidth={1.5}/>
                  </Svg>
                  <View style={{ position: 'absolute', top: 6, left: 6 }}><SurfaceChip surface={c.surface}/></View>
                  <View style={{ position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Camera size={11} color={colors.accent}/>
                    <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800' }}>{c.cams}</Text>
                  </View>
                </View>
                <Text style={{ fontWeight: '800', fontSize: 14, color: colors.text }}>{c.name}</Text>
                <Pressable onPress={() => onReserveCourt?.(c.id)} style={{
                  backgroundColor: colors.accent, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
                }}>
                  <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 12 }}>Ver horarios y reservar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}
    </SafeAreaView>
  );
}
