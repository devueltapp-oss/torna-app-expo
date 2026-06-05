/**
 * Game Detail — VIEWER mode.
 * The user is a spectator: pick a camera angle, watch the HLS stream,
 * see players, follow the club. NO stream control, NO BLE pairing.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, Image, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Rect, Line } from 'react-native-svg';
import { Video, ResizeMode } from 'expo-av';
import { ChevronLeft, MoreHorizontal, Eye, Play, ChevronRight, Scissors, Maximize2, Minimize2 } from 'lucide-react-native';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { Avatar, AvatarStack, Button, StatusBadge, SurfaceChip, SectionHeader } from '../components/ui';
import { MatchParticipant, CameraAngleData } from '../components/cards';

const tornaLogo = require('../assets/torna-icon.png');

export interface GameDetailData {
  id: string;
  court: string;
  floor: 'CLAY' | 'GRASS' | 'HARD' | 'CARPET';
  club: string;
  clubHandle: string;
  clubFollowers: number;
  time: string; date: string;
  viewers: number;
  isLive: boolean;
  players: MatchParticipant[];
  cameras: CameraAngleData[];
}

export function GameDetailScreen({ game, onBack, isFollowing = false, onToggleFollow, onCreateHighlight }: {
  game: GameDetailData; onBack?: () => void; isFollowing?: boolean; onToggleFollow?: () => void;
  onCreateHighlight?: () => void;
}) {
  const { colors, fonts, radii } = useTheme();
  const [camIdx, setCamIdx] = React.useState(
    Math.max(0, game.cameras.findIndex(c => c.state === 'available'))
  );
  const activeCam = game.cameras[camIdx];
  const [streamError, setStreamError] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => { setStreamError(false); }, [activeCam?.id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Dark header zone */}
      <View style={{ backgroundColor: colors.ink, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 }}>
          <Pressable onPress={onBack} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {game.isLive && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.live }} />}
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>
              {game.isLive ? 'EN VIVO' : ''} · {game.viewers} viewers
            </Text>
          </View>
          <Pressable style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <MoreHorizontal size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* HLS player */}
        <View style={{ marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', aspectRatio: 16/9, backgroundColor: colors.ink2, borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {activeCam?.streamUrl && !streamError ? (
            <Video
              key={activeCam.id}
              source={{ uri: activeCam.streamUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping={false}
              isMuted={false}
              onError={() => setStreamError(true)}
            />
          ) : (
            <>
              <Svg viewBox="0 0 360 200" width="58%" height="58%" style={{ opacity: 0.4 }}>
                <Rect x={40} y={22} width={280} height={156} stroke={colors.accent} strokeWidth={1.6} fill="none"/>
                <Line x1={180} y1={22} x2={180} y2={178} stroke={colors.accent} strokeWidth={1.6}/>
                <Line x1={40} y1={68} x2={320} y2={68} stroke={colors.accent} strokeWidth={1}/>
                <Line x1={40} y1={132} x2={320} y2={132} stroke={colors.accent} strokeWidth={1}/>
              </Svg>
              <View style={{ position: 'absolute', bottom: 14, alignItems: 'center' }}>
                <Text style={{ color: colors.muted2, fontSize: 12, fontWeight: '600' }}>
                  {streamError
                    ? 'Señal no disponible · reintentando...'
                    : 'Stream no disponible para esta cámara'}
                </Text>
                {streamError && (
                  <TouchableOpacity
                    onPress={() => setStreamError(false)}
                    style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8,
                             backgroundColor: colors.ink, borderRadius: radii.md }}>
                    <Text style={{ color: '#fff', fontFamily: fonts.bold, fontSize: 13 }}>Reintentar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
          {game.isLive && (
            <View style={{ position: 'absolute', top: 10, left: 10 }}>
              <StatusBadge status="LIVE" />
            </View>
          )}
          <Text style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, color: colors.accent, fontWeight: '600' }}>
            HLS · 1080p · {activeCam?.label}
          </Text>
          <View style={{ position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Eye size={14} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>{game.viewers}</Text>
          </View>
          {activeCam?.streamUrl && !streamError ? (
            <TouchableOpacity
              onPress={() => setIsFullscreen(true)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Maximize2 size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Camera angle tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
          {game.cameras.map((cam, i) => {
            const on = i === camIdx;
            const disabled = cam.state === 'inactive';
            return (
              <Pressable key={cam.id} disabled={disabled} onPress={() => setCamIdx(i)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 90,
                  backgroundColor: on ? colors.primary : 'rgba(255,255,255,0.08)',
                  borderWidth: on ? 0 : 1, borderColor: 'rgba(255,255,255,0.18)',
                  opacity: disabled ? 0.45 : 1,
                }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, letterSpacing: 0.8, fontWeight: '700' }}>CAM {cam.number}</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 2 }}>{cam.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Light info sheet */}
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg, marginTop: -14, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Heading */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20, letterSpacing: -0.2 }}>{game.court}</Text>
            <Text style={{ color: colors.muted2, fontSize: 13, marginTop: 2 }}>
              {game.time} · {game.date} · <Text style={{ fontFamily: fonts.mono }}>{game.id}</Text>
            </Text>
          </View>
          <SurfaceChip surface={game.floor}/>
        </View>

        {/* Club row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg2, padding: 12, borderRadius: 14 }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <Image source={tornaLogo} style={{ width: 30, height: 30 }}/>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{game.club}</Text>
            <Text style={{ color: colors.muted2, fontSize: 12 }}>{game.clubHandle} · {game.clubFollowers} seguidores</Text>
          </View>
          <Button size="sm" variant={isFollowing ? 'soft' : 'primary'} onPress={onToggleFollow}>
            {isFollowing ? 'Siguiendo' : 'Seguir'}
          </Button>
        </View>

        {/* Players */}
        <View>
          <SectionHeader title={`Jugadores · ${game.players.length}`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {game.players.map(p => (
              <View key={p.username} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, width: '50%' }}>
                <Avatar name={p.name || p.username} size={32}/>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>{p.name || p.username}</Text>
                  <Text style={{ color: colors.muted2, fontSize: 11 }}>{p.username}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Crear highlight — disponible cuando el partido NO está en vivo
            (i.e. ya hay grabación completa para recortar). */}
        {!game.isLive && onCreateHighlight ? (
          <View style={{ marginTop: 4 }}>
            <Button fullWidth size="lg" onPress={onCreateHighlight}
              icon={<Scissors size={16} color={colors.primaryFg}/>}>
              Crear highlight
            </Button>
            <Text style={{ fontSize: 11, color: colors.muted2, marginTop: 6, textAlign: 'center' }}>
              Recordá hasta 60s para tu perfil o el feed.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <Modal visible={isFullscreen} animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
          <Video
            source={{ uri: activeCam?.streamUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isMuted={false}
            isLooping={false}
          />
          <TouchableOpacity
            onPress={() => setIsFullscreen(false)}
            style={{
              position: 'absolute', top: 48, right: 16,
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.55)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Minimize2 size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
