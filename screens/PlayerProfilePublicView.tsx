import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MoreHorizontal, MapPin, Eye, Play, Bell } from 'lucide-react-native';
import { Svg, Rect, Line } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { SectionHeader, StatusBadge, Avatar, Button } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import type { PlayerPublic, PlayerClip } from '../data/types';

interface Props {
  player: PlayerPublic;
  onBack?: () => void;
  onToggleFollow?: () => void;
  onToggleNotify?: () => void;
  onOpenLive?: (gameId: string) => void;
  onOpenClip?: (clip: PlayerClip) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}

/**
 * Player public profile, viewed by another player. Same visual language as
 * ClubProfilePlayerView, but without the courts section. If the player is
 * currently playing, a LIVE card appears as the FIRST tile in the highlights
 * carousel and a "JUGANDO AHORA" badge shows in the header.
 *
 * In production:
 *   GET /players/:id              → PlayerPublic
 *   POST/DELETE /players/:id/follow → { isFollowing }
 */
export function PlayerProfilePublicView({ player, onBack, onToggleFollow, onToggleNotify, onOpenLive, onOpenClip, onChangeTab, activeTab = 'players', onOpenFollowers, onOpenFollowing }: Props) {
  const { colors } = useTheme();
  const isFocused = useIsFocused();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View style={{ backgroundColor: colors.ink, padding: 16, paddingBottom: 18, overflow: 'hidden' }}>
          {/* Decorative court motif */}
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
            <View style={{ borderRadius: 36, overflow: 'hidden' }}>
              <Avatar name={player.name} size={72} ringColor="#FFFFFF"/>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 0.8 }}>PLAYER</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 }} numberOfLines={1}>{player.name}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }} numberOfLines={1}>
                {player.username} · {player.club}
              </Text>
              {player.isLiveNow && (
                <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: colors.live, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 }}>
                  <View style={{ width: 6, height: 6, backgroundColor: colors.ink, borderRadius: 3 }}/>
                  <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: colors.ink }}>JUGANDO AHORA</Text>
                </View>
              )}
            </View>
          </View>

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
            <Pressable onPress={onOpenFollowers} style={{ alignItems: 'flex-end', minWidth: 60 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{player.followers}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 }}>SEGUIDORES</Text>
            </Pressable>
            <Pressable onPress={onOpenFollowing} style={{ alignItems: 'flex-end', minWidth: 60 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{player.followingCount}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.8 }}>SIGUIENDO</Text>
            </Pressable>
          </View>
        </View>

        {/* Highlights */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <SectionHeader title="Momentos destacados"
            action={<Text style={{ fontSize: 11, fontWeight: '700', color: colors.accentText }}>Ver todos</Text>}/>
        </View>
        {player.clips.length === 0 && !(player.isLiveNow && player.liveGame) ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
            <Text style={{ fontSize: 13, color: colors.muted2 }}>Sin highlights disponibles</Text>
          </View>
        ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
          {/* LIVE preview — first tile when player is currently playing */}
          {player.isLiveNow && player.liveGame && (
            <Pressable onPress={() => onOpenLive?.(player.liveGame!.id)}
              style={{
                width: 200, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.ink,
                borderWidth: 2, borderColor: colors.live,
              }}>
              <View style={{ height: 118, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {player.liveGame.streamUrl && isFocused ? (
                  <Video
                    key={player.liveGame.id}
                    source={{ uri: player.liveGame.streamUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay isMuted isLooping={false}
                  />
                ) : (
                  <Svg viewBox="0 0 200 110" width="55%" style={{ opacity: 0.22 }}>
                    <Rect x={20} y={15} width={160} height={80} stroke={colors.accent} strokeWidth={1.5} fill="none"/>
                    <Line x1={100} y1={15} x2={100} y2={95} stroke={colors.accent} strokeWidth={1.5}/>
                  </Svg>
                )}
                <View style={{ position: 'absolute', top: 8, left: 8 }}>
                  <StatusBadge status="LIVE"/>
                </View>
                <View style={{ position: 'absolute', bottom: 6, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Eye size={12} color={colors.accent}/>
                  <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>{player.liveGame.viewers}</Text>
                </View>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}>{player.liveGame.court} · {player.liveGame.club}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }}>Verlo en vivo →</Text>
              </View>
            </Pressable>
          )}

          {/* Pre-recorded clips */}
          {player.clips.map(c => (
            <Pressable
              key={c.id}
              onPress={() => onOpenClip?.(c)}
              style={({ pressed }) => ({ width: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.88 : 1 })}
            >
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
      </ScrollView>

      {onChangeTab && <BottomTabBar active={activeTab} onChange={onChangeTab} role="player"/>}
    </SafeAreaView>
  );
}
