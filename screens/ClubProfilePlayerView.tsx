import React from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Line } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import {
  ChevronLeft, MoreHorizontal, MapPin, Phone, Clock, Eye, Play, Camera,
} from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { SectionHeader, StatusBadge, Avatar, SurfaceChip } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { MapsButton } from '../components/MapsButton';
import type { ClubPublic } from '../data/types';

const tornaLogo = require('../assets/torna-icon.png');

interface Props {
  club: ClubPublic;
  onBack?: () => void;
  onToggleFollow?: () => void;
  onReserveCourt?: (courtId: string) => void;
  onOpenLive?: (gameId: string) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
}

/**
 * Club public profile from a player's POV.
 *
 *   - Header: hero (solid brand blue) + logo + name + city + follow button
 *   - Highlights: live games + pre-recorded clips
 *   - Courts: 2×2 grid with Reservar CTA per court
 *   - Upcoming public matches
 *   - Members directory
 *   - Photo gallery
 *   - Hours + contact + mini-map placeholder
 *
 * In production:
 *   GET /clubs/:id            → ClubPublic + courts
 *   GET /clubs/:id/highlights → { live, clips }
 *   GET /clubs/:id/upcoming   → UpcomingPublicGame[]
 *   GET /clubs/:id/members    → DirectoryPlayer[]
 *   POST/DELETE /clubs/:id/follow
 */
export function ClubProfilePlayerView({
  club, onBack, onToggleFollow, onReserveCourt, onOpenLive, onChangeTab, activeTab = 'home',
}: Props) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
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
            <View style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={tornaLogo} style={{ width: 48, height: 48 }}/>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 0.8 }}>CLUB</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 }} numberOfLines={1}>{club.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <MapPin size={12} color="rgba(255,255,255,0.8)"/>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{club.city}</Text>
              </View>
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
            <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{club.followers.toLocaleString('es-AR')}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 }}>SEGUIDORES</Text>
            </View>
          </View>
        </View>

        {/* Highlights — live now */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <SectionHeader title="Highlights · en vivo ahora"
            action={<Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentText }}>Ver todos</Text>}/>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
          {club.highlights.live.map(g => (
            <Pressable key={g.id} onPress={() => onOpenLive?.(g.id)}
              style={{ width: 230, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.ink }}>
              <View style={{ height: 110, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {g.streamUrl && isFocused ? (
                  <Video
                    key={g.id}
                    source={{ uri: g.streamUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay isMuted isLooping={false}
                  />
                ) : (
                  <>
                    <Svg viewBox="0 0 200 110" width="55%" style={{ opacity: 0.22 }}>
                      <Rect x={20} y={15} width={160} height={80} stroke={colors.accent} strokeWidth={1.5} fill="none"/>
                      <Line x1={100} y1={15} x2={100} y2={95} stroke={colors.accent} strokeWidth={1.5}/>
                    </Svg>
                    <View style={{ position: 'absolute', width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                      <Image source={tornaLogo} style={{ width: 24, height: 24 }}/>
                    </View>
                  </>
                )}
                <View style={{ position: 'absolute', top: 8, left: 8 }}>
                  <StatusBadge status="LIVE"/>
                </View>
                <View style={{ position: 'absolute', bottom: 6, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Eye size={12} color={colors.accent}/>
                  <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>{g.viewers}</Text>
                </View>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}>{g.court}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }}>
                  {g.players.slice(0, 2).map(p => p.username).join(' · ')}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Highlights — clips */}
        <View style={{ paddingHorizontal: 16 }}>
          <SectionHeader title="Mejores momentos"/>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
          {club.highlights.clips.map(c => (
            <View key={c.id} style={{ width: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
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
            </View>
          ))}
        </ScrollView>

        {/* Courts — 2×2 grid */}
        <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
          <SectionHeader title={`Canchas · ${club.courts.length}`}
            action={<Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentText }}>Ver todas</Text>}/>
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
                  <View style={{ position: 'absolute', top: 6, left: 6 }}>
                    <SurfaceChip surface={c.surface}/>
                  </View>
                  <View style={{ position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Camera size={11} color={colors.accent}/>
                    <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800' }}>{c.cams}</Text>
                  </View>
                </View>
                <View>
                  <Text style={{ fontWeight: '800', fontSize: 14, color: colors.text }}>{c.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 2 }}>
                    {c.indoor ? 'Cubierta' : 'Exterior'} · próx. {c.nextSlot}
                  </Text>
                </View>
                <Pressable onPress={() => onReserveCourt?.(c.id)} style={{
                  backgroundColor: colors.accent, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
                }}>
                  <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 12 }}>Reservar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming public matches */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <SectionHeader title="Próximos partidos públicos"/>
          <View style={{ gap: 8 }}>
            {club.upcoming.map(g => (
              <View key={g.id} style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
                borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
              }}>
                <View style={{
                  width: 42, height: 42, borderRadius: 11, backgroundColor: colors.bg2,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, lineHeight: 14 }}>{g.time}</Text>
                  <Text style={{ fontSize: 9, color: colors.muted2, marginTop: 2, fontWeight: '700', letterSpacing: 0.6 }}>{g.date.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>{g.court} · {g.players} jug.</Text>
                  <Text style={{ fontSize: 11, color: colors.muted2, fontFamily: fonts.mono }}>{g.id}</Text>
                </View>
                <StatusBadge status="SCHEDULED"/>
              </View>
            ))}
          </View>
        </View>

        {/* Members */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <SectionHeader title={`Jugadores del club · ${club.members.length}`}
            action={<Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentText }}>Ver todos</Text>}/>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: 8 }}>
          {club.members.map(p => (
            <View key={p.id} style={{ width: 64, alignItems: 'center', gap: 6 }}>
              <Avatar name={p.name} size={48}/>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={1}>
                {p.username}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Photo gallery */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          <SectionHeader title="Fotos del club"/>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {club.photos.map((i, idx) => {
              const isLime = idx % 2 === 0;
              return (
                <View key={i} style={{
                  width: '23.5%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden',
                  backgroundColor: isLime ? colors.accent : colors.ink,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{
                    fontFamily: fonts.mono, fontSize: 10, fontWeight: '700',
                    color: isLime ? 'rgba(45,76,117,0.7)' : 'rgba(255,255,255,0.6)',
                  }}>foto {i}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Info + mini map */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <SectionHeader title="Información"/>
          <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, overflow: 'hidden' }}>
            <InfoRow icon={<Clock size={16} color={colors.muted2}/>}  label="HORARIO"   value={club.hours}/>
            <InfoRow icon={<Phone size={16} color={colors.muted2}/>}  label="TELÉFONO"  value={club.phone}/>
            <InfoRow icon={<MapPin size={16} color={colors.muted2}/>} label="DIRECCIÓN" value={club.address}/>
            {/* Referencia a Google Maps (sin mapa embebido) */}
            <View style={{ padding: 12 }}>
              <MapsButton latitude={club.latitude} longitude={club.longitude} query={club.address} />
            </View>
          </View>
        </View>
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: colors.muted2, fontWeight: '700', letterSpacing: 0.6 }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}
