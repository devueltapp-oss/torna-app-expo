/**
 * Higher-level cards: LiveGameCard, LiveGameTile, GameListItem, CourtCard,
 * CameraAngleCard, PlayerListItem, FeedPost.
 *
 * Brand-strict: solid fills only (no gradients), 3-color palette.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform } from 'react-native';
import { Svg, Rect, Line } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { Eye, Camera, Heart, MessageCircle, Play, WifiOff } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar, AvatarStack, StatusBadge, SurfaceChip, ClubPill, GameStatus } from './ui';
import type { FeedPost as FeedPostData, UpcomingGameData } from '../data/types';

export interface MatchParticipant { username: string; name?: string; profilePicture?: string; }

export interface LiveGameData {
  id: string;
  viewers?: number;
  players: MatchParticipant[];
  club: string;
  court: string;
  streamUrl?: string;
}

/* ─────────────────  Court motif (SVG)  ───────────────── */

function CourtMotif({ accent, opacity = 0.18, width = '62%' }: { accent: string; opacity?: number; width?: string | number }) {
  return (
    <Svg viewBox="0 0 390 180" width={width as any} height="62%" style={{ opacity }}>
      <Rect x={40} y={22} width={310} height={136} stroke={accent} strokeWidth={2} fill="none"/>
      <Line x1={195} y1={22} x2={195} y2={158} stroke={accent} strokeWidth={2}/>
      <Line x1={40} y1={62} x2={350} y2={62} stroke={accent} strokeWidth={1}/>
      <Line x1={40} y1={118} x2={350} y2={118} stroke={accent} strokeWidth={1}/>
    </Svg>
  );
}

/* ─────────────────  LiveGameCard (vertical, full-width)  ─────────────── */

export function LiveGameCard({ game, onPress, tornaLogo, isActive }: {
  game: LiveGameData; onPress?: (id: string) => void; tornaLogo: any; isActive?: boolean;
}) {
  const { colors, radii } = useTheme();
  const [streamError, setStreamError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => { setStreamError(false); }, [game.streamUrl]);

  return (
    <Pressable onPress={() => onPress?.(game.id)}
      style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      <View style={{
        backgroundColor: colors.surface, borderRadius: radii['3xl'], overflow: 'hidden',
        borderWidth: 1, borderColor: colors.line,
      }}>
        {/* Hero — solid brand blue (no gradient per manual) */}
        <View style={{ height: 118, position: 'relative', backgroundColor: colors.ink }}>
          {game.streamUrl && !streamError && isActive !== false ? (
            <>
              <Video
                key={game.id}
                source={{ uri: game.streamUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.COVER}
                shouldPlay isMuted isLooping={false}
                onError={() => setStreamError(true)}
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded) setIsPlaying(status.isPlaying);
                }}
              />
              {!isPlaying && (
                <View style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <View style={{
                    width: 48, height: 48,
                    borderRadius: 24,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Play size={22} color="#FFFFFF" fill="#FFFFFF" />
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <CourtMotif accent={colors.accent} width="48%"/>
              {streamError && (
                <View style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  backgroundColor: 'rgba(45,76,117,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(45,76,117,0.30)',
                  borderRadius: 100,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}>
                  <WifiOff size={10} color={colors.ink} />
                  <Text style={{ fontSize: 9, fontFamily: fonts.bold, color: colors.text }}>Sin señal</Text>
                </View>
              )}
            </View>
          )}
          {(!game.streamUrl || streamError) && (
            <View style={{
              position: 'absolute', top: '50%', left: '50%',
              marginLeft: -20, marginTop: -20,
              width: 40, height: 40, borderRadius: 11, backgroundColor: '#FFFFFF',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Image source={tornaLogo} style={{ width: 26, height: 26 }} />
            </View>
          )}
          <View style={{ position: 'absolute', top: 10, left: 10 }}>
            <StatusBadge status="LIVE" />
          </View>
          {typeof game.viewers === 'number' && (
            <View style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(45,76,117,0.55)',
              paddingHorizontal: 12, paddingVertical: 6,
              flexDirection: 'row', alignItems: 'center', gap: 5,
            }}>
              <Eye size={13} color={colors.accent} />
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>{game.viewers} espectadores</Text>
            </View>
          )}
        </View>
        {/* Footer */}
        <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AvatarStack users={game.players} size={24} max={4}/>
            <Text style={{ flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
              {game.players.slice(0, 2).map(p => p.username).join(', ')}
              {game.players.length > 2 ? ` y otros ${game.players.length - 2}` : ''}
            </Text>
          </View>
          <ClubPill>{game.club} · {game.court}</ClubPill>
        </View>
      </View>
    </Pressable>
  );
}

/* ─────────────────  LiveGameTile (compact, story-style)  ─────────────── */

/**
 * Compact horizontal tile used by both player and club home carousels.
 * Width 180px; hero 100px; footer with court + club only.
 */
export function LiveGameTile({ game, onPress, onDoubleTap, tornaLogo, isActive }: {
  game: LiveGameData; onPress?: (id: string) => void; onDoubleTap?: () => void; tornaLogo: any; isActive?: boolean;
}) {
  const { colors } = useTheme();
  const [streamError, setStreamError] = useState(false);
  const videoRef = React.useRef<Video>(null);
  const lastTap = React.useRef(0);
  const tapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setStreamError(false); }, [game.streamUrl]);

  React.useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
      onDoubleTap?.();
    } else {
      tapTimer.current = setTimeout(() => onPress?.(game.id), 300);
    }
    lastTap.current = now;
  };

  return (
    <Pressable onPress={handlePress}
      style={({ pressed }) => [{ width: 180, opacity: pressed ? 0.94 : 1 }]}>
      <View style={{
        backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.line,
      }}>
        <View style={{ position: 'relative', height: 100, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
          {game.streamUrl && !streamError && isActive !== false ? (
            <Video
              ref={videoRef}
              key={game.id}
              source={{ uri: game.streamUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay isMuted isLooping={false}
              onError={() => setStreamError(true)}
            />
          ) : (
            <>
              <CourtMotif accent={colors.accent} width="68%" opacity={0.22}/>
              <View style={{
                position: 'absolute', width: 30, height: 30, borderRadius: 9,
                backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
              }}>
                <Image source={tornaLogo} style={{ width: 20, height: 20 }}/>
              </View>
              {streamError && (
                <View style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  backgroundColor: 'rgba(45,76,117,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(45,76,117,0.30)',
                  borderRadius: 100,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}>
                  <WifiOff size={10} color={colors.ink} />
                  <Text style={{ fontSize: 9, fontFamily: fonts.bold, color: colors.text }}>Sin señal</Text>
                </View>
              )}
            </>
          )}
          <View style={{ position: 'absolute', top: 6, left: 6 }}>
            <StatusBadge status="LIVE"/>
          </View>
          {typeof game.viewers === 'number' && (
            <View style={{ position: 'absolute', bottom: 6, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Eye size={11} color={colors.accent}/>
              <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>{game.viewers}</Text>
            </View>
          )}
          <View style={{
            position: 'absolute',
            bottom: 6, left: 6,
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: 10,
            padding: 4,
          }}>
            <Play size={10} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>{game.court}</Text>
          <Text style={{ fontSize: 10, color: colors.muted2, marginTop: 2 }} numberOfLines={1}>{game.club}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ─────────────────  GameListItem  ───────────────── */

export interface GameListData {
  id: string; court: string; cam: string;
  players: number; time: string; date: string; status: GameStatus;
}

export function GameListItem({ game, onPress }: { game: GameListData; onPress?: (id: string) => void }) {
  const { colors, radii } = useTheme();
  return (
    <Pressable onPress={() => onPress?.(game.id)}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
        borderRadius: radii.xl, padding: 12, opacity: pressed ? 0.88 : 1,
      }]}>
      <Text style={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: '600', color: colors.text2, backgroundColor: colors.bg3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>{game.id}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
          {game.court} · {game.cam} · {game.players} jug.
        </Text>
        <Text style={{ color: colors.muted2, fontSize: 12 }}>{game.time} · {game.date}</Text>
      </View>
      <StatusBadge status={game.status} />
    </Pressable>
  );
}

/* ─────────────────  CourtCard (read-only)  ───────────────── */

export interface CourtData {
  id: string; name: string;
  surface: 'CLAY' | 'GRASS' | 'HARD' | 'CARPET';
  description?: string | null;
  cams?: number;
  live?: { gameId: string; viewers: number } | null;
  next?: string | null;
}

export function CourtCard({ court, onPress }: { court: CourtData; onPress?: (c: CourtData) => void }) {
  const { colors, radii } = useTheme();
  return (
    <Pressable onPress={() => onPress?.(court)}
      style={({ pressed }) => [{
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
        borderRadius: radii['2xl'] + 2, padding: 14, gap: 8, opacity: pressed ? 0.92 : 1,
      }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SurfaceChip surface={court.surface}/>
        <Text style={{ color: colors.muted2, fontSize: 11, fontFamily: fonts.mono }}>#{court.id}</Text>
      </View>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18, letterSpacing: -0.2 }}>{court.name}</Text>
      {court.description ? (
        <Text style={{ color: colors.text2, fontSize: 12, lineHeight: 17 }} numberOfLines={2}>{court.description}</Text>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 11, fontStyle: 'italic' }}>Sin descripción</Text>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        {court.live ? (
          <>
            <StatusBadge status="LIVE" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Eye size={13} color={colors.muted2} />
              <Text style={{ color: colors.muted2, fontSize: 11 }}>{court.live.viewers}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={{ backgroundColor: colors.bg3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 }}>
              <Text style={{ color: colors.text2, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>SIN PARTIDO</Text>
            </View>
            {court.next && <Text style={{ color: colors.muted2, fontSize: 11 }}>Próx. {court.next}</Text>}
          </>
        )}
      </View>
      {typeof court.cams === 'number' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Camera size={13} color={colors.muted2} />
          <Text style={{ color: colors.muted2, fontSize: 11 }}>{court.cams} {court.cams === 1 ? 'cámara' : 'cámaras'}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ─────────────────  CameraAngleCard  ─────────────────
 * Cameras have ONLY two visible states for the viewer:
 *   - 'available'  — transmitting; user can watch this angle
 *   - 'inactive'   — no signal
 */
export type CameraAngleState = 'available' | 'inactive';

export interface CameraAngleData {
  id: string; number: string; label: string; state: CameraAngleState;
  streamUrl?: string;
}

export function CameraAngleCard({ cam, tornaLogo, onPress }: {
  cam: CameraAngleData; tornaLogo: any; onPress?: (id: string) => void;
}) {
  const { colors, radii } = useTheme();
  const isOn = cam.state === 'available';
  return (
    <Pressable onPress={() => onPress?.(cam.id)} style={{ flex: 1, minWidth: 0 }}>
      <View style={{
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
        borderRadius: radii['2xl'], overflow: 'hidden',
      }}>
        {/* Thumb */}
        <View style={{ aspectRatio: 16 / 9, backgroundColor: colors.ink, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <CourtMotif accent={colors.accent} opacity={isOn ? 0.5 : 0.18}/>
          {isOn ? (
            <View style={{ position: 'absolute', top: 8, left: 8 }}>
              <StatusBadge status="LIVE"/>
            </View>
          ) : (
            <View style={{
              width: 46, height: 46, borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Image source={tornaLogo} style={{ width: 30, height: 30, opacity: 0.9 }} />
            </View>
          )}
        </View>
        <View style={{ padding: 12, gap: 6 }}>
          <Text style={{ color: colors.muted2, fontSize: 11, fontFamily: fonts.mono }}>CAM {cam.number}</Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{cam.label}</Text>
          <View style={{
            alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: isOn ? colors.live : colors.bg3,
            paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999,
          }}>
            {isOn && <View style={{ width: 5, height: 5, backgroundColor: colors.ink, borderRadius: 2.5 }} />}
            <Text style={{ color: isOn ? colors.ink : colors.text2, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>
              {isOn ? 'DISPONIBLE' : 'INACTIVO'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* ─────────────────  PlayerListItem  ───────────────── */

export interface PlayerData {
  id: string; name: string; username: string; email?: string;
}

export function PlayerListItem({ player, onPress }: { player: PlayerData; onPress?: () => void }) {
  const { colors, radii } = useTheme();
  return (
    <Pressable onPress={onPress} style={{
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
      borderRadius: radii.xl, padding: 12,
    }}>
      <Avatar name={player.name} size={44}/>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{player.name}</Text>
        <Text style={{ color: colors.muted2, fontSize: 12 }} numberOfLines={1}>
          {player.username}{player.email ? ` · ${player.email}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

/* ─────────────────  UpcomingGameTile (double-tap → sheet)  ─────────────── */

export function UpcomingGameTile({ game, onDoubleTap }: {
  game: UpcomingGameData;
  onDoubleTap?: () => void;
}) {
  const { colors } = useTheme();
  const lastTap = React.useRef(0);
  const tapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
      onDoubleTap?.();
    } else {
      tapTimer.current = setTimeout(() => {}, 300);
    }
    lastTap.current = now;
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      <View style={{
        width: 220, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
        borderRadius: 14, padding: 12, gap: 8,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <StatusBadge status="SCHEDULED"/>
          <Text style={{ fontSize: 11, color: colors.muted2, fontFamily: fonts.mono }}>{game.id}</Text>
        </View>
        <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.3 }}>
          {game.time} · {game.court}
        </Text>
        <AvatarStack users={game.players} size={26} max={4}/>
        <Text style={{ color: colors.muted2, fontSize: 12 }}>{game.club}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent }}/>
          <Text style={{ color: colors.accentText, fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Sigues a {game.following === 'player' ? game.byPlayer : game.club}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ─────────────────  FeedPost (compact horizontal tile)  ───────────────
 * Same horizontal-scroll language as LiveGameTile / UpcomingTile so the
 * home feed stays one consistent rhythm of tiles.
 *   - 200px wide, 1:1 media (square), tight footer with author + caption + counts
 */

export function FeedPost({ post, onDoubleTap }: { post: FeedPostData; onDoubleTap?: () => void }) {
  const { colors } = useTheme();
  const isHighlight = post.type === 'highlight';
  const mediaBg = post.tone === 'lime' ? colors.accent
                : post.tone === 'white' ? colors.bg2
                : colors.ink;
  const motifStroke = post.tone === 'lime' ? colors.ink : colors.accent;

  const lastTap = React.useRef(0);
  const tapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  const handlePress = () => {
    if (!onDoubleTap || !isHighlight) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
      onDoubleTap();
    }
    lastTap.current = now;
  };

  return (
    <Pressable onPress={handlePress} style={{ width: 200 }}>
    <View style={{
      borderRadius: 14, overflow: 'hidden',
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
    }}>
      {/* Media — square thumbnail */}
      <View style={{ position: 'relative', aspectRatio: 1, backgroundColor: mediaBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {post.tone !== 'white' && (
          <Svg viewBox="0 0 200 110" width="62%" style={{ opacity: post.tone === 'lime' ? 0.20 : 0.22 }}>
            <Rect x={20} y={15} width={160} height={80} stroke={motifStroke} strokeWidth={1.5} fill="none"/>
            <Line x1={100} y1={15} x2={100} y2={95} stroke={motifStroke} strokeWidth={1.5}/>
          </Svg>
        )}
        {isHighlight ? (
          <View style={{
            position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Play size={16} color={colors.ink}/>
          </View>
        ) : (
          <Text style={{
            fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.4, fontWeight: '700',
            color: post.tone === 'white' ? colors.muted2 : 'rgba(255,255,255,0.6)',
          }}>FOTO</Text>
        )}
        {/* Role badge — only shown for club authors */}
        {post.author.role === 'club' && (
          <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
            <Text style={{ color: colors.ink, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 }}>CLUB</Text>
          </View>
        )}
        {/* Duration for highlights */}
        {isHighlight && post.duration && (
          <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(45,76,117,0.78)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700', fontFamily: fonts.mono }}>{post.duration}</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Avatar name={post.author.name} size={22}/>
          <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: colors.text }} numberOfLines={1}>
            {post.author.username}
          </Text>
          <Text style={{ fontSize: 10, color: colors.muted2 }}>{post.postedAt}</Text>
        </View>
        {post.caption ? (
          <Text style={{ fontSize: 11, lineHeight: 15, color: colors.text2 }} numberOfLines={2}>
            {post.caption}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Heart size={12} color={colors.muted2}/>
            <Text style={{ color: colors.muted2, fontSize: 11, fontWeight: '700' }}>{post.likes}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <MessageCircle size={12} color={colors.muted2}/>
            <Text style={{ color: colors.muted2, fontSize: 11, fontWeight: '700' }}>{post.comments}</Text>
          </View>
        </View>
      </View>
    </View>
    </Pressable>
  );
}
