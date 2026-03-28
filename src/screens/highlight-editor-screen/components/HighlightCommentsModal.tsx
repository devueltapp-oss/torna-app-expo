import React, {useState, useEffect, useCallback} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from 'react-native';
import {useAuth} from '@/contexts/authContext';
import {
  getHighlightCommentsApi,
  addHighlightCommentApi,
  likeHighlightApi,
  HighlightComment,
} from '@/api/highlights';
import {colors} from '@/config/theme';
import {timeAgo} from '@/utils';

interface HighlightCommentsModalProps {
  visible: boolean;
  highlightId: string | null;
  highlightTitle?: string | null;
  initialLikesCount?: number;
  initialIsLikedByMe?: boolean;
  onClose: () => void;
  onLikeToggled?: (liked: boolean, likesCount: number) => void;
  /** When false, the like button is hidden (e.g. viewing own highlight where toggle is shown instead) */
  showLikeButton?: boolean;
}

export const HighlightCommentsModal: React.FC<HighlightCommentsModalProps> = ({
  visible,
  highlightId,
  highlightTitle,
  initialLikesCount = 0,
  initialIsLikedByMe = false,
  onClose,
  onLikeToggled,
  showLikeButton = true,
}) => {
  const {getAccessToken} = useAuth();
  const [comments, setComments] = useState<HighlightComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(initialIsLikedByMe);
  const [isLiking, setIsLiking] = useState(false);

  const loadComments = useCallback(async () => {
    if (!highlightId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const data = await getHighlightCommentsApi(token, highlightId);
      setComments(data);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar comentarios');
    } finally {
      setIsLoading(false);
    }
  }, [highlightId, getAccessToken]);

  useEffect(() => {
    if (visible && highlightId) {
      loadComments();
    }
  }, [visible, highlightId, loadComments]);

  // Sync like state when props change (e.g. parent re-renders after API fetch)
  useEffect(() => {
    setLikesCount(initialLikesCount);
    setIsLiked(initialIsLikedByMe);
  }, [initialLikesCount, initialIsLikedByMe, visible]);

  const handleLike = useCallback(async () => {
    if (!highlightId || isLiking) {
      return;
    }
    setIsLiking(true);
    try {
      const token = await getAccessToken();
      const result = await likeHighlightApi(token, highlightId);
      setIsLiked(result.liked);
      setLikesCount(result.likesCount);
      onLikeToggled?.(result.liked, result.likesCount);
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el like');
    } finally {
      setIsLiking(false);
    }
  }, [highlightId, isLiking, getAccessToken, onLikeToggled]);

  const handleSend = async () => {
    const text = newComment.trim();
    if (!text || !highlightId || isSending) {
      return;
    }
    setIsSending(true);
    try {
      const token = await getAccessToken();
      const comment = await addHighlightCommentApi(token, highlightId, text);
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar el comentario');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setComments([]);
    setNewComment('');
    setError(null);
    onClose();
  };

  const likeButtonColor = isLiked
    ? (colors.danger || '#F44336')
    : (colors.neutral400 || '#94A3B8');

  const renderComment = ({item}: {item: HighlightComment}) => (
    <View style={styles.commentItem}>
      <View style={styles.avatarContainer}>
        {item.user?.profilePicture ? (
          <Image
            source={{uri: item.user.profilePicture}}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {(item.user?.username?.[0] || '?').toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>
            {item.user?.username || 'Usuario'}
          </Text>
          <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  if (!highlightId) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Comentarios</Text>
            {highlightTitle ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {highlightTitle}
              </Text>
            ) : null}
          </View>
          {showLikeButton && (
            <TouchableOpacity
              onPress={handleLike}
              disabled={isLiking}
              style={styles.likeButton}
              activeOpacity={0.7}>
              {isLiking ? (
                <ActivityIndicator size="small" color={likeButtonColor} />
              ) : (
                <>
                  <Text style={[styles.likeIcon, {color: likeButtonColor}]}>
                    {isLiked ? '♥' : '♡'}
                  </Text>
                  <Text style={[styles.likeCount, {color: likeButtonColor}]}>
                    {likesCount}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Comments list */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary || '#2d4c75'} />
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={item => item.id}
            style={styles.list}
            contentContainerStyle={
              comments.length === 0
                ? styles.emptyContainer
                : styles.listContent
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Sé el primero en comentar este highlight
              </Text>
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Escribe un comentario..."
              placeholderTextColor={colors.neutral500 || '#94A3B8'}
              maxLength={500}
              multiline
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!newComment.trim() || isSending}
              activeOpacity={0.7}>
              {isSending ? (
                <ActivityIndicator
                  size="small"
                  color={colors.white || '#fff'}
                />
              ) : (
                <Text style={styles.sendButtonText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white || '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200 || '#E2E8F0',
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.neutral700 || '#334155',
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 44,
    justifyContent: 'center',
  },
  likeIcon: {
    fontSize: 22,
  },
  likeCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral900 || '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.neutral500 || '#94A3B8',
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral500 || '#94A3B8',
    textAlign: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatar: {
    width: 36,
    height: 36,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary || '#2d4c75',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: colors.white || '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral900 || '#0F172A',
  },
  commentTime: {
    fontSize: 11,
    color: colors.neutral500 || '#94A3B8',
  },
  commentText: {
    fontSize: 14,
    color: colors.neutral700 || '#334155',
    lineHeight: 20,
  },
  errorText: {
    color: colors.danger || '#F44336',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral200 || '#E2E8F0',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral300 || '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.neutral900 || '#0F172A',
    maxHeight: 100,
    minHeight: 44,
    backgroundColor: colors.neutral100 || '#F1F5F9',
  },
  sendButton: {
    backgroundColor: colors.primary || '#2d4c75',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.white || '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
