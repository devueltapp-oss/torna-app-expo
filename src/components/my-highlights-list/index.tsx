import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useAuth} from '@/contexts/authContext';
import {
  Highlight,
  toggleHighlightApi,
  deleteHighlightApi,
} from '@/api/highlights';
import {colors} from '@/config/theme';
import {formatDuration} from '@/utils/video/formatDuration';
import {timeAgo} from '@/utils';
import {HighlightCommentsModal} from '@/screens/highlight-editor-screen/components/HighlightCommentsModal';

interface MyHighlightsListProps {
  highlights: Highlight[];
  isLoading?: boolean;
  onRefresh: () => void;
  /** When false, hides toggle/delete actions and shows the like button instead */
  isOwnProfile?: boolean;
}

export const MyHighlightsList: React.FC<MyHighlightsListProps> = ({
  highlights,
  isLoading = false,
  onRefresh,
  isOwnProfile = true,
}) => {
  const {getAccessToken} = useAuth();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [commentsHighlight, setCommentsHighlight] =
    useState<Highlight | null>(null);
  // Local like state keyed by highlight id — updated optimistically after API response
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const handleToggle = useCallback(
    async (highlight: Highlight) => {
      if (togglingId) {
        return;
      }
      setTogglingId(highlight.id);
      try {
        const token = await getAccessToken();
        await toggleHighlightApi(token, highlight.id);
        onRefresh();
      } catch (err: any) {
        Alert.alert(
          'Error',
          err?.message || 'No se pudo actualizar el highlight',
        );
      } finally {
        setTogglingId(null);
      }
    },
    [togglingId, getAccessToken, onRefresh],
  );

  const handleDelete = useCallback(
    (highlight: Highlight) => {
      Alert.alert(
        'Eliminar Highlight',
        '¿Estás seguro? Esta acción no se puede deshacer.',
        [
          {text: 'Cancelar', style: 'cancel'},
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              setDeletingId(highlight.id);
              try {
                const token = await getAccessToken();
                await deleteHighlightApi(token, highlight.id);
                onRefresh();
              } catch (err: any) {
                Alert.alert(
                  'Error',
                  err?.message || 'No se pudo eliminar el highlight',
                );
              } finally {
                setDeletingId(null);
              }
            },
          },
        ],
      );
    },
    [getAccessToken, onRefresh],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary || '#2d4c75'} />
      </View>
    );
  }

  if (highlights.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Sin highlights todavia</Text>
        <Text style={styles.emptySubtitle}>
          Crea tu primer highlight desde un partido grabado.
        </Text>
      </View>
    );
  }

  const handleLikeToggled = useCallback(
    (highlightId: string, likesCount: number) => {
      setLikeCounts(prev => ({...prev, [highlightId]: likesCount}));
    },
    [],
  );

  const renderItem = ({item}: {item: Highlight}) => {
    const isToggling = togglingId === item.id;
    const isDeleting = deletingId === item.id;
    const displayLikesCount =
      likeCounts[item.id] !== undefined
        ? likeCounts[item.id]
        : (item.likesCount ?? 0);

    return (
      <View style={[styles.card, !item.isEnabled && styles.cardDisabled]}>
        {/* Thumbnail / Video preview */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setCommentsHighlight(item)}
          style={styles.thumbnailContainer}>
          {item.thumbnailUrl ? (
            <Image
              source={{uri: item.thumbnailUrl}}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.thumbnailPlay}>▶</Text>
            </View>
          )}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(item.duration)}
            </Text>
          </View>
          {!item.isEnabled && (
            <View style={styles.disabledOverlay}>
              <Text style={styles.disabledLabel}>Oculto</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Info row */}
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            {item.title ? (
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
            ) : null}
            <Text style={styles.meta}>
              {formatDuration(item.start)} - {formatDuration(item.end)} ·{' '}
              {timeAgo(item.createdAt)}
            </Text>
            <Text style={styles.likesCount}>
              {displayLikesCount === 1
                ? '1 me gusta'
                : `${displayLikesCount} me gusta`}
            </Text>
          </View>

          {/* Toggle (own profile only) */}
          {isOwnProfile && (
            <View style={styles.toggleContainer}>
              {isToggling ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary || '#2d4c75'}
                />
              ) : (
                <Switch
                  value={item.isEnabled}
                  onValueChange={() => handleToggle(item)}
                  trackColor={{
                    false: colors.neutral300 || '#CBD5E1',
                    true: colors.primary || '#2d4c75',
                  }}
                  thumbColor={colors.white || '#fff'}
                />
              )}
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setCommentsHighlight(item)}
            activeOpacity={0.7}>
            <Text style={styles.actionButtonText}>Comentarios</Text>
          </TouchableOpacity>

          {isOwnProfile ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDanger]}
              onPress={() => handleDelete(item)}
              disabled={isDeleting}
              activeOpacity={0.7}>
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.white || '#fff'} />
              ) : (
                <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                  Eliminar
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <>
      <FlatList
        data={highlights}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />

      <HighlightCommentsModal
        visible={commentsHighlight !== null}
        highlightId={commentsHighlight?.id ?? null}
        highlightTitle={commentsHighlight?.title}
        initialLikesCount={
          commentsHighlight
            ? (likeCounts[commentsHighlight.id] !== undefined
                ? likeCounts[commentsHighlight.id]
                : (commentsHighlight.likesCount ?? 0))
            : 0
        }
        initialIsLikedByMe={commentsHighlight?.isLikedByMe ?? false}
        showLikeButton={!isOwnProfile}
        onLikeToggled={
          commentsHighlight
            ? (_, count) => handleLikeToggled(commentsHighlight.id, count)
            : undefined
        }
        onClose={() => setCommentsHighlight(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral900 || '#0F172A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.neutral500 || '#94A3B8',
    textAlign: 'center',
  },
  listContent: {
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 14,
    backgroundColor: colors.neutral100 || '#F1F5F9',
    borderWidth: 1,
    borderColor: colors.neutral200 || '#E2E8F0',
    overflow: 'hidden',
  },
  cardDisabled: {
    opacity: 0.7,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral800 || '#1E293B',
  },
  thumbnailPlay: {
    fontSize: 40,
    color: colors.white || '#fff',
    opacity: 0.8,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  disabledOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  disabledLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  infoLeft: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral900 || '#0F172A',
  },
  meta: {
    fontSize: 12,
    color: colors.neutral500 || '#94A3B8',
  },
  likesCount: {
    fontSize: 12,
    color: colors.neutral500 || '#94A3B8',
    marginTop: 2,
  },
  toggleContainer: {
    width: 52,
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.neutral200 || '#E2E8F0',
  },
  actionButtonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger || '#F44336',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral700 || '#334155',
  },
  actionButtonTextDanger: {
    color: colors.danger || '#F44336',
  },
});
