import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Heart, MessageCircle, Maximize2 } from 'lucide-react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { StatusBadge, AvatarStack } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import { GameCommentsPanel } from '../components/GameCommentsPanel';
import { useGameComments } from '../hooks/useGameComments';
import { useAuth } from '../contexts/AuthContext';
import type { LiveGameData } from '../components/cards';
import type { FeedPost } from '../data/types';

/**
 * ⚠️ **Ya no existe el modo `upcoming`** (2026-09-02). Eran tarjetas de TEXTO a
 * pantalla completa —hora, cancha, club— y hacer swipe vertical para leer cuatro
 * datos es peor que verlos en una lista. Esas partidas viven ahora en el strip
 * compacto del tope del Inicio (`UpcomingStrip`) y en Juegos → "Mis partidas".
 *
 * El reel tiene sentido donde hay **video**: eso es `live` y `highlights`.
 */
export type ReelSection = 'live' | 'highlights';

export interface ReelViewScreenProps {
  section: ReelSection;
  liveGames: LiveGameData[];
  feedPosts: FeedPost[];
  onBack: () => void;
  onOpenGame?: (id: string) => void;
  activeTab: TabId;
  onChangeTab: (id: TabId) => void;
  initialIndex?: number;
}

const SECTION_TITLES: Record<ReelSection, string> = {
  live: 'En vivo',
  highlights: 'Highlights',
};

const TONE_BG: Record<string, string> = {
  lime:  '#D6FF7E',
  blue:  '#2d4c75',
  white: '#FFFFFF',
};
const TONE_FG: Record<string, string> = {
  lime:  '#2d4c75',
  blue:  '#FFFFFF',
  white: '#2d4c75',
};

/* ─── Live reel item ─── */

function LiveReelItem({
  game,
  height,
  isActive,
}: {
  game: LiveGameData;
  height: number;
  isActive: boolean;
}) {
  const { colors } = useTheme();
  const videoRef = React.useRef<Video>(null);
  const [isBuffering, setIsBuffering] = React.useState(true);
  const [showComments, setShowComments] = React.useState(false);
  const lastTapRef = React.useRef<number>(0);

  // Comentarios públicos del stream, en vivo (poll 3 s). Solo el reel visible
  // poll-ea: `enabled: isActive` evita N pollers simultáneos en la lista.
  const { user } = useAuth();
  const author = React.useMemo(
    () => (user ? { id: user.id, username: user.username, name: user.name, profilePicture: user.profilePicture } : undefined),
    [user?.id, user?.username, user?.name, user?.profilePicture],
  );
  const { comments, loading: loadingComments, sending, send } = useGameComments(game.id, {
    enabled: isActive,
    author,
  });

  React.useEffect(() => {
    if (!isActive) {
      videoRef.current?.pauseAsync().catch(() => {});
    } else {
      videoRef.current?.playAsync().catch(() => {});
    }
  }, [isActive]);

  function handlePlaybackStatus(status: AVPlaybackStatus) {
    if (status.isLoaded) {
      setIsBuffering(status.isBuffering ?? false);
    }
  }

  function handleVideoPress() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      videoRef.current?.presentFullscreenPlayer().catch(() => {});
    }
    lastTapRef.current = now;
  }

  return (
    <>
    <View style={{ height, paddingHorizontal: 20, paddingVertical: 28, gap: 20, justifyContent: 'center' }}>
      {/* Video area — double-tap para fullscreen */}
      <Pressable
        onPress={handleVideoPress}
        style={{
          flex: 1, borderRadius: 18, backgroundColor: '#000',
          overflow: 'hidden', borderWidth: 1, borderColor: colors.line,
        }}
      >
        {game.streamUrl ? (
          <Video
            ref={videoRef}
            key={game.id}
            source={{ uri: game.streamUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive}
            isLooping
            isMuted={false}
            onPlaybackStatusUpdate={handlePlaybackStatus}
          />
        ) : null}

        {isBuffering && (
          <ActivityIndicator
            size="large"
            color="#D6FF7E"
            style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
          />
        )}

        <Pressable
          onPress={() => videoRef.current?.presentFullscreenPlayer().catch(() => {})}
          hitSlop={8}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 2,
            backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: 7,
          }}>
          <Maximize2 size={16} color="#FFFFFF" />
        </Pressable>
      </Pressable>

      {/* Info */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <StatusBadge status="LIVE" />
        </View>

        <View style={{ gap: 3 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 22, letterSpacing: -0.4 }}>
            {game.court}
          </Text>
          <Text style={{ color: colors.muted2, fontSize: 14, fontFamily: fonts.regular }}>
            {game.club}
          </Text>
        </View>

        <AvatarStack users={game.players} size={30} max={4} />

        {/* Comment CTA */}
        <Pressable
          onPress={() => setShowComments(true)}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            backgroundColor: colors.surface,
            borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
            borderWidth: 1, borderColor: colors.line,
          }}
        >
          <MessageCircle size={16} color={colors.muted2} />
          <Text style={{ flex: 1, color: colors.muted2, fontFamily: fonts.regular, fontSize: 14 }}>
            {comments.length > 0 ? `Comentarios · ${comments.length}` : 'Añadir comentario...'}
          </Text>
        </Pressable>
      </View>
    </View>

    {/* Comments modal — mismo panel compartido con GameDetailScreen */}
    <Modal
      visible={showComments}
      animationType="slide"
      onRequestClose={() => setShowComments(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <GameCommentsPanel
          comments={comments}
          loading={loadingComments}
          sending={sending}
          onSend={send}
          onClose={() => setShowComments(false)}
        />
      </SafeAreaView>
    </Modal>
    </>
  );
}

/* ─── Highlight reel item ─── */

function HighlightReelItem({
  post,
  height,
  isActive,
}: {
  post: FeedPost;
  height: number;
  isActive: boolean;
}) {
  const { colors } = useTheme();
  const videoRef = React.useRef<Video>(null);
  const [isBuffering, setIsBuffering] = React.useState(false);
  const hasVideo = post.type === 'highlight' && !!post.videoUrl;
  const tone = post.tone ?? 'blue';
  const mediaBg = hasVideo ? '#000' : (TONE_BG[tone] ?? colors.surface);
  const mediaFg = TONE_FG[tone] ?? colors.text;

  React.useEffect(() => {
    if (!hasVideo) return;
    if (!isActive) {
      videoRef.current?.pauseAsync().catch(() => {});
    } else {
      videoRef.current?.playAsync().catch(() => {});
    }
  }, [isActive, hasVideo]);

  function handlePlaybackStatus(status: AVPlaybackStatus) {
    if (status.isLoaded) {
      setIsBuffering(status.isBuffering ?? false);
    }
  }

  function openFullscreen() {
    videoRef.current?.presentFullscreenPlayer();
  }

  return (
    <View style={{ height, paddingHorizontal: 20, paddingVertical: 28, gap: 16 }}>
      {/* Media area */}
      <Pressable
        onPress={hasVideo ? openFullscreen : undefined}
        disabled={!hasVideo}
        style={{
          flex: 1, borderRadius: 18, backgroundColor: mediaBg,
          overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {hasVideo ? (
          <>
            <Video
              ref={videoRef}
              key={post.id}
              source={{ uri: post.videoUrl! }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isActive}
              isLooping
              isMuted={false}
              onPlaybackStatusUpdate={handlePlaybackStatus}
            />
            {isBuffering && (
              <ActivityIndicator
                size="large"
                color="#D6FF7E"
                style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
              />
            )}
            {/* Fullscreen / landscape button */}
            <View style={{
              position: 'absolute', top: 12, right: 12, zIndex: 2,
              backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: 7,
            }}>
              <Maximize2 size={16} color="#FFFFFF" />
            </View>
          </>
        ) : (
          <Text style={{ color: mediaFg, fontFamily: fonts.bold, fontSize: 13, opacity: 0.5, letterSpacing: 0.5 }}>
            FOTO
          </Text>
        )}

        {post.contextLine && (
          <View style={{ position: 'absolute', bottom: 14, left: 14, right: 14, zIndex: 2 }}>
            <Text style={{ color: hasVideo ? '#FFFFFF' : mediaFg, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.85 }}>
              {post.contextLine}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Author + caption + engagement */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 13 }}>
              {post.author.name.charAt(0)}
            </Text>
          </View>
          <View>
            <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 14 }}>
              {post.author.name}
            </Text>
            <Text style={{ color: colors.muted2, fontSize: 11, fontFamily: fonts.regular }}>
              {post.author.username} · {post.postedAt}
            </Text>
          </View>
        </View>

        {post.caption && (
          <Text style={{ color: colors.text, fontSize: 14, fontFamily: fonts.regular, lineHeight: 20 }} numberOfLines={3}>
            {post.caption}
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Heart size={16} color={colors.muted2} />
            <Text style={{ color: colors.muted2, fontSize: 13, fontFamily: fonts.regular }}>{post.likes}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MessageCircle size={16} color={colors.muted2} />
            <Text style={{ color: colors.muted2, fontSize: 13, fontFamily: fonts.regular }}>{post.comments}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ─── Main screen ─── */

export function ReelViewScreen({
  section,
  liveGames,
  feedPosts,
  onBack,
  onOpenGame,
  activeTab,
  onChangeTab,
  initialIndex = 0,
}: ReelViewScreenProps) {
  const { colors } = useTheme();
  const [listHeight, setListHeight] = React.useState(0);
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  const items: (LiveGameData | FeedPost)[] =
    section === 'live' ? liveGames : feedPosts;

  const total = items.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 8, paddingVertical: 10,
        backgroundColor: colors.surface,
        borderBottomWidth: 1, borderBottomColor: colors.line,
      }}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>

        <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.2 }}>
          {SECTION_TITLES[section]}
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* FlatList container */}
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
      >
        {listHeight > 0 && (
          <FlatList
            data={items}
            keyExtractor={(item) => (item as any).id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            extraData={currentIndex}
            initialScrollIndex={initialIndex}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.y / listHeight);
              setCurrentIndex(idx);
            }}
            getItemLayout={(_, index) => ({
              length: listHeight,
              offset: listHeight * index,
              index,
            })}
            renderItem={({ item, index }) => {
              const isActive = index === currentIndex;

              if (section === 'live') {
                return (
                  <LiveReelItem
                    game={item as LiveGameData}
                    height={listHeight}
                    isActive={isActive}
                  />
                );
              }
              return (
                <HighlightReelItem
                  post={item as FeedPost}
                  height={listHeight}
                  isActive={isActive}
                />
              );
            }}
          />
        )}
      </View>

      <BottomTabBar active={activeTab} onChange={onChangeTab} role="player" />
    </SafeAreaView>
  );
}
