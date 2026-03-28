import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Slider from '@react-native-community/slider';

export interface TrimRangeSliderProps {
  duration: number;
  startTime: number;
  endTime: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  maxDuration?: number;
}

const MIN_CLIP_DURATION = 1;
const WARN_THRESHOLD = 0.9;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const TrimRangeSlider: React.FC<TrimRangeSliderProps> = ({
  duration,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  maxDuration,
}) => {
  const clipDuration = endTime - startTime;
  const isOverLimit = maxDuration !== undefined && clipDuration > maxDuration;
  const isNearLimit =
    maxDuration !== undefined &&
    !isOverLimit &&
    clipDuration >= maxDuration * WARN_THRESHOLD;

  const effectiveEndMax =
    maxDuration !== undefined
      ? Math.min(duration, startTime + maxDuration)
      : duration;

  function handleStartChange(value: number) {
    onStartChange(value);
    if (maxDuration !== undefined && endTime - value > maxDuration) {
      onEndChange(value + maxDuration);
    }
  }

  function handleEndChange(value: number) {
    if (maxDuration !== undefined && value - startTime > maxDuration) {
      onEndChange(startTime + maxDuration);
    } else {
      onEndChange(value);
    }
  }

  const durationColor = isOverLimit
    ? '#ef4444'
    : isNearLimit
    ? '#f59e0b'
    : '#6366f1';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Inicio: {formatTime(startTime)}</Text>
        <Text style={[styles.clipDuration, {color: durationColor}]}>
          Duración: {formatTime(clipDuration)}
        </Text>
        <Text style={styles.label}>Fin: {formatTime(endTime)}</Text>
      </View>

      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>Inicio</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={Math.max(0, endTime - MIN_CLIP_DURATION)}
          value={startTime}
          onValueChange={handleStartChange}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#333333"
          thumbTintColor="#6366f1"
          step={0.1}
        />
      </View>

      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>Fin</Text>
        <Slider
          style={styles.slider}
          minimumValue={Math.min(duration, startTime + MIN_CLIP_DURATION)}
          maximumValue={effectiveEndMax}
          value={endTime}
          onValueChange={handleEndChange}
          minimumTrackTintColor="#818cf8"
          maximumTrackTintColor="#333333"
          thumbTintColor="#818cf8"
          step={0.1}
        />
      </View>

      <View style={styles.timeBar}>
        <Text style={styles.timeBarText}>{formatTime(0)}</Text>
        <View style={styles.timeBarTrack}>
          <View
            style={[
              styles.timeBarFill,
              {
                left: `${(startTime / duration) * 100}%`,
                width: `${((endTime - startTime) / duration) * 100}%`,
                backgroundColor: durationColor,
              },
            ]}
          />
        </View>
        <Text style={styles.timeBarText}>{formatTime(duration)}</Text>
      </View>

      {maxDuration !== undefined && (isNearLimit || isOverLimit) && (
        <View
          style={[
            styles.limitBadge,
            isOverLimit ? styles.limitBadgeError : styles.limitBadgeWarn,
          ]}>
          <Text
            style={[
              styles.limitBadgeText,
              isOverLimit
                ? styles.limitBadgeTextError
                : styles.limitBadgeTextWarn,
            ]}>
            {isOverLimit
              ? `Limite superado — maximo ${maxDuration}s`
              : `Cerca del limite (max ${maxDuration}s)`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: '#cccccc',
    fontSize: 13,
  },
  clipDuration: {
    fontSize: 13,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderLabel: {
    color: '#888888',
    fontSize: 11,
    width: 40,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  timeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timeBarText: {
    color: '#555555',
    fontSize: 11,
    width: 36,
  },
  timeBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginHorizontal: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  timeBarFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 2,
  },
  limitBadge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  limitBadgeWarn: {
    backgroundColor: '#422006',
  },
  limitBadgeError: {
    backgroundColor: '#450a0a',
  },
  limitBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  limitBadgeTextWarn: {
    color: '#f59e0b',
  },
  limitBadgeTextError: {
    color: '#ef4444',
  },
});
