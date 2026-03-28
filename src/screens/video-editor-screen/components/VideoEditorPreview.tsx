import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {VideoView, useVideoPlayer} from 'expo-video';

import {TrimRangeSlider} from '@/components/trim-range-slider';
import {colors} from '@/config/theme';

interface VideoEditorPreviewProps {
  streamUrl: string;
  durationSeconds: number;
  startTime: number;
  endTime: number;
  onStartChange: (v: number) => void;
  onEndChange: (v: number) => void;
  seekTarget?: number;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export const VideoEditorPreview: React.FC<VideoEditorPreviewProps> = ({
  streamUrl,
  durationSeconds,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  seekTarget,
}) => {
  const player = useVideoPlayer(streamUrl, p => {
    p.play();
  });

  useEffect(() => {
    if (seekTarget !== undefined) {
      player.currentTime = seekTarget;
    }
  }, [seekTarget, player]);

  const clipDuration = endTime - startTime;
  const isOver = clipDuration > 90;

  return (
    <View style={styles.container}>
      <View style={styles.videoWrapper}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={true}
        />
      </View>

      <View style={styles.durationRow}>
        <Text style={styles.timeLabel}>Inicio: {formatTime(startTime)}</Text>
        <View
          style={[styles.durationBadge, isOver && styles.durationBadgeOver]}>
          <Text
            style={[styles.durationText, isOver && styles.durationTextOver]}>
            {formatTime(clipDuration)}
          </Text>
        </View>
        <Text style={styles.timeLabel}>Fin: {formatTime(endTime)}</Text>
      </View>

      <TrimRangeSlider
        duration={durationSeconds}
        startTime={startTime}
        endTime={endTime}
        onStartChange={onStartChange}
        onEndChange={onEndChange}
        maxDuration={90}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  video: {
    flex: 1,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
  },
  durationBadge: {
    backgroundColor: '#e8f0fd',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  durationBadgeOver: {
    backgroundColor: '#fde8e8',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  durationTextOver: {
    color: colors.danger,
  },
});
