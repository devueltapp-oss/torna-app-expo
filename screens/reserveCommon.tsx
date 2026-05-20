import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme';

/**
 * Shared 3-step progress indicator for the reservation flow.
 * Renders as three pills: completed steps in lime, current in dark accent,
 * upcoming in muted background.
 */
export function StepIndicator({ step, total = 3 }: { step: number; total?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{
          height: 4, borderRadius: 2, flex: 1,
          backgroundColor: i < step ? colors.primary : i === step ? colors.accentText : colors.bg3,
        }}/>
      ))}
    </View>
  );
}
