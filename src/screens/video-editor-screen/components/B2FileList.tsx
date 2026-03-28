import React from 'react';
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import {B2FileItem} from '@/api/video/FilesApi';
import {colors} from '@/config/theme';

interface B2FileListProps {
  files: B2FileItem[];
  isLoading: boolean;
  error: string | null;
  selectedKey: string | null;
  onSelect: (file: B2FileItem) => void;
  onRetry: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const B2FileList: React.FC<B2FileListProps> = ({
  files,
  isLoading,
  error,
  selectedKey,
  onSelect,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando videos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (files.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No hay videos en B2</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={files}
      keyExtractor={item => item.key}
      contentContainerStyle={styles.list}
      renderItem={({item}) => {
        const isSelected = item.key === selectedKey;
        return (
          <TouchableOpacity
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}>
            <View style={styles.thumbnail}>
              <Text style={styles.thumbnailIcon}>▶</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.detail}>
                {formatBytes(item.size)} · {formatDate(item.lastModified)}
              </Text>
            </View>
            {isSelected && <View style={styles.checkDot} />}
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: colors.dark,
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.dark,
    fontSize: 14,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: colors.primary,
    backgroundColor: '#eef2f8',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#d0d0d0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thumbnailIcon: {
    fontSize: 20,
    color: '#555',
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: 4,
  },
  detail: {
    fontSize: 12,
    color: '#888',
  },
  checkDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginLeft: 8,
  },
});
