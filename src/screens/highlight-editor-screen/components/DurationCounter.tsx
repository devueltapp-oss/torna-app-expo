import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { formatDuration } from '@/utils/video/formatDuration';
import { colors } from '@/config/theme';

interface DurationCounterProps {
  duration: number; // en segundos
}

export const DurationCounter: React.FC<DurationCounterProps> = ({
  duration,
}) => {
  const isValid = duration >= 3 && duration <= 60;
  const color = isValid ? '#4CAF50' : colors.danger || '#F44336';

  return (
    <Text style={[styles.duration, { color }]}>
      {formatDuration(duration)}
    </Text>
  );
};

const styles = StyleSheet.create({
  duration: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
