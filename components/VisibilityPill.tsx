/**
 * Visibility chip — toggle Privado / Público.
 * Brand-strict: lima cuando público (con dot azul), azul cuando privado
 * (con dot lima). Tap = flip (delegado al padre).
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme';

export interface VisibilityPillProps {
  isPublic: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function VisibilityPill({ isPublic, onPress, size = 'sm' }: VisibilityPillProps) {
  const { colors } = useTheme();
  const padV = size === 'md' ? 5 : 3;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: isPublic ? colors.accent : colors.ink,
        paddingHorizontal: 8, paddingVertical: padV, borderRadius: 6,
        alignSelf: 'flex-start',
      }}>
      <View style={{
        width: 5, height: 5, borderRadius: 2.5,
        backgroundColor: isPublic ? colors.ink : colors.accent,
      }}/>
      <Text style={{
        color: isPublic ? colors.ink : '#FFFFFF',
        fontSize: 9, fontWeight: '800', letterSpacing: 0.8,
      }}>
        {isPublic ? 'PÚBLICO' : 'PRIVADO'}
      </Text>
    </Pressable>
  );
}
