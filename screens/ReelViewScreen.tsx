import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Eye, Heart, MessageCircle, Maximize2, X, Send } from 'lucide-react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useTheme } from '../theme';
import { fonts } from '../theme/tokens';
import { StatusBadge, AvatarStack } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';
import type { LiveGameData } from '../components/cards';
import type { UpcomingGameData } from './HomeScreen';
import type { FeedPost } from '../data/types';
import { fetchGameComments, addGameComment, type GameComment } from '../api/games';

export type ReelSection = 'live' | 'upcoming' | 'highlights';

export interface ReelViewScreenProps {
  section: ReelSection;
  liveGames: LiveGameData[];
  upcomingGames: UpcomingGameData[];
  feedPosts: FeedPost[];
  onBack: () => void;
  onOpenGame?: (id: string) => void;
  activeTab: TabId;
  onChangeTab: (id: TabId) => void;
  initialIndex?: number;
}

const SECTION_TITLES: Record<ReelSection, string> = {
  live: 'En vivo',
  upcoming: 'Próximos',
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

/** Fila de comentario ya mapeada para render. */
interface CommentRow { id: string; user: string; text: string; time: string; }

/** ISO → etiqueta corta relativa ("Ahora", "5m", "3h", "2d", o fecha). */
function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const min = Math.floor(Math.max(0, Date.now() - then) / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(then).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function mapGameComment(c: GameComment): CommentRow {
  return { id: c.id, user: c.name ?? c.username, text: c.comment, time: relTime(c.createdAt) };
}

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
  const [commentText, setCommentText] = React.useState('');
  const [comments, setComments] = React.useState<CommentRow[]>([]);
  const [sending, setSending] = React.useState(false);
  const lastTapRef = React.useRef<number>(0);

  // Comentarios reales del partido: se cargan al abrir el modal (GET /game/:id/comments).
  React.useEffect(() => {
    if (!showComments) return;
    let cancelled = false;
    fetchGameComments(game.id)
      .then((rows) => { if (!cancelled) setComments(rows.map(mapGameComment)); })
      .catch(() => { /* sin datos → lista vacía, sin mock */ });
    return () => { cancelled = true; };
  }, [showComments, game.id]);

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

  async function sendComment() {
    const text = commentText.trim();
    if (!text || sending) return;
    setSending(true);
    setCommentText('');
    try {
      const created = await addGameComment(game.id, text);
      setComments((prev) => [...prev, mapGameComment(created)]);
    } catch {
      setCommentText(text); // restaurar si falló, para no perderlo
    } finally {
      setSending(false);
    }
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Eye size={14} color={colors.muted2} />
            <Text style={{ color: colors.muted2, fontSize: 12, fontFamily: fonts.regular }}>
              {game.viewers} espectadores
            </Text>
          </View>
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
            Añadir comentario...
          </Text>
        </Pressable>
      </View>
    </View>

    {/* Comments modal */}
    <Modal
      visible={showComments}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={() => setShowComments(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: colors.line,
        }}>
          <Text style={{ flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 16, letterSpacing: -0.2 }}>
            Comentarios
          </Text>
          <Pressable onPress={() => setShowComments(false)} hitSlop={12}>
            <X size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Comment list */}
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, gap: 20 }}
          ListEmptyComponent={
            <Text style={{ color: colors.muted2, fontSize: 13, paddingTop: 16, textAlign: 'center' }}>
              Sé el primero en comentar.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: colors.ink,
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Text style={{ color: colors.accent, fontFamily: fonts.bold, fontSize: 13 }}>
                  {item.user.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 13 }}>
                    {item.user}
                  </Text>
                  <Text style={{ color: colors.muted2, fontSize: 11, fontFamily: fonts.regular }}>
                    {item.time}
                  </Text>
                </View>
                <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 }}>
                  {item.text}
                </Text>
              </View>
            </View>
          )}
        />

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingHorizontal: 16, paddingVertical: 12,
            borderTopWidth: 1, borderTopColor: colors.line,
          }}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Escribe un comentario..."
              placeholderTextColor={colors.muted2}
              returnKeyType="send"
              editable={!sending}
              onSubmitEditing={sendComment}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 10,
                color: colors.text,
                fontFamily: fonts.regular,
                fontSize: 14,
                borderWidth: 1, borderColor: colors.line,
              }}
            />
            <Pressable
              onPress={sendComment}
              disabled={!commentText.trim() || sending}
              style={{
                width: 42, height: 42, borderRadius: 12,
                backgroundColor: commentText.trim() && !sending ? colors.accent : colors.line,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Send size={18} color={commentText.trim() && !sending ? colors.ink : colors.muted2} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
    </>
  );
}

/* ─── Upcoming reel item (no video) ─── */

function UpcomingReelItem({
  game,
  height,
}: {
  game: UpcomingGameData;
  height: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ height, paddingHorizontal: 20, paddingVertical: 28, justifyContent: 'center', gap: 28 }}>
      <View style={{
        flex: 1, borderRadius: 18, backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.line,
        alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Text style={{ color: colors.muted2, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase' }}>
          PRÓXIMO PARTIDO
        </Text>
        <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 56, letterSpacing: -2 }}>
          {game.time}
        </Text>
        <Text style={{ color: colors.muted2, fontSize: 15, fontFamily: fonts.regular }}>
          {game.court} · {game.club}
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <StatusBadge status="SCHEDULED" />
          <Text style={{ color: colors.muted2, fontSize: 12, fontFamily: fonts.regular }}>
            {game.players.length} jugadores
          </Text>
        </View>

        <AvatarStack users={game.players} size={32} max={4} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
          <Text style={{ color: colors.accentText, fontSize: 12, fontFamily: fonts.bold, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Sigues a {game.following === 'player' ? game.byPlayer : game.club}
          </Text>
        </View>
      </View>
    </View>
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
  upcomingGames,
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

  const items: (LiveGameData | UpcomingGameData | FeedPost)[] =
    section === 'live'     ? liveGames :
    section === 'upcoming' ? upcomingGames :
    feedPosts;

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
              if (section === 'upcoming') {
                return (
                  <UpcomingReelItem
                    game={item as UpcomingGameData}
                    height={listHeight}
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
