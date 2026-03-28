import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { ClipResponse } from '@/api/video/PostCreateClipApi';
import { formatDuration } from '@/utils/video/formatDuration';
import { colors } from '@/config/theme';

interface ClipsListProps {
  clips: ClipResponse[];
  onClipPress?: (clip: ClipResponse) => void;
  onClipDelete?: (clip: ClipResponse) => Promise<void>;
}

export const ClipsList: React.FC<ClipsListProps> = ({
  clips,
  onClipPress,
  onClipDelete,
}) => {
  if (clips.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Clips Generados</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Aún no hay clips generados para este partido
          </Text>
        </View>
      </View>
    );
  }

  const handleDelete = (clip: ClipResponse, event: any) => {
    event.stopPropagation();
    
    Alert.alert(
      'Eliminar Clip',
      '¿Estás seguro de que deseas eliminar este clip? Esta acción no se puede deshacer.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await onClipDelete?.(clip);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el clip. Por favor, intenta nuevamente.');
            }
          },
        },
      ],
    );
  };

  const renderClipItem = ({ item }: { item: ClipResponse }) => (
    <TouchableOpacity
      style={styles.clipItem}
      onPress={() => onClipPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.videoContainer}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        )}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      </View>
      <View style={styles.clipInfoContainer}>
        <View style={styles.clipInfo}>
          <Text style={styles.clipTime}>
            {formatDuration(item.start)} - {formatDuration(item.end)}
          </Text>
          <Text style={styles.clipDuration}>
            Duración: {formatDuration(item.duration)}
          </Text>
        </View>
        {onClipDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => handleDelete(item, e)}
            activeOpacity={0.7}
          >
            <Icon name="delete" size={24} color={colors.danger || '#F44336'} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clips Generados ({clips.length})</Text>
      <FlatList
        data={clips}
        renderItem={renderClipItem}
        keyExtractor={(item) => item.clipId}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark || colors.neutral900 || '#000',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listContent: {
    gap: 16,
  },
  clipItem: {
    width: '100%',
    backgroundColor: colors.neutral100 || '#F1F5F9',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.neutral200 || '#E2E8F0',
    marginBottom: 0,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.dark || '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral800 || '#1E293B',
  },
  playIcon: {
    fontSize: 48,
    color: colors.white || '#fff',
    opacity: 0.8,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clipInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  clipInfo: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  clipTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark || colors.neutral900 || '#000',
    marginBottom: 4,
  },
  clipDuration: {
    fontSize: 12,
    color: colors.neutral600 || '#64748B',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral500 || '#94A3B8',
    textAlign: 'center',
  },
});
