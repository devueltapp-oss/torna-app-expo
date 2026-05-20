/**
 * Thumbnail visual para items de la biblioteca / grid del perfil.
 *   - match / highlight / upload-video → cancha esquematizada en SVG
 *   - upload-photo                     → repeating-stripes placeholder
 *
 * Overlays: duración abajo a la derecha, play icon centrado (para videos).
 * No usa imágenes reales — se reemplaza por <Image source={...}/> cuando
 * el backend exponga posters / thumbnails.
 */
import React from 'react';
import { View, Text, DimensionValue } from 'react-native';
import { Svg, Rect, Line } from 'react-native-svg';
import { useTheme } from '../theme';

export type ThumbKind = 'match' | 'highlight' | 'upload-photo' | 'upload-video';

export interface ContentThumbProps {
  kind: ThumbKind;
  durationLabel?: string;
  /** Default 'square' (1:1 — IG grid) o 'wide' (16/9 — row). */
  aspect?: 'square' | 'wide' | 'tall';
  width?: DimensionValue;
}

export function ContentThumb({ kind, durationLabel, aspect = 'square', width = '100%' }: ContentThumbProps) {
  const { colors } = useTheme();
  const ratio = aspect === 'wide' ? 16 / 9 : aspect === 'tall' ? 9 / 16 : 1;
  const isPhoto = kind === 'upload-photo';
  const isVideo = kind === 'match' || kind === 'highlight' || kind === 'upload-video';

  return (
    <View style={{
      width, aspectRatio: ratio, borderRadius: 8, overflow: 'hidden',
      backgroundColor: colors.ink, position: 'relative',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {isPhoto ? (
        // Stripes — RN no soporta repeating-linear-gradient nativo. SVG con
        // varios rect inclinados aproxima el efecto sin agregar deps.
        <Svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
          {Array.from({ length: 12 }, (_, i) => i).map(i => (
            <Rect key={i} x={-50 + i * 14} y={-30} width={7} height={160}
              fill={colors.ink2} transform="rotate(35 50 50)" opacity={0.6}/>
          ))}
        </Svg>
      ) : (
        <Svg viewBox="0 0 360 200" width="76%" height="76%" style={{ opacity: 0.55 }}>
          <Rect x={40} y={22} width={280} height={156} stroke={colors.accent} strokeWidth={2} fill="none"/>
          <Line x1={180} y1={22} x2={180} y2={178} stroke={colors.accent} strokeWidth={2}/>
          <Line x1={40} y1={68} x2={320} y2={68} stroke={colors.accent} strokeWidth={1.5}/>
          <Line x1={40} y1={132} x2={320} y2={132} stroke={colors.accent} strokeWidth={1.5}/>
        </Svg>
      )}

      {isVideo && (
        <View style={{
          position: 'absolute', width: 28, height: 28, borderRadius: 14,
          backgroundColor: 'rgba(255,255,255,0.92)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <View style={{
            width: 0, height: 0, marginLeft: 2,
            borderLeftWidth: 8, borderLeftColor: colors.ink,
            borderTopWidth: 5, borderTopColor: 'transparent',
            borderBottomWidth: 5, borderBottomColor: 'transparent',
          }}/>
        </View>
      )}

      {durationLabel ? (
        <View style={{
          position: 'absolute', bottom: 5, right: 5,
          backgroundColor: 'rgba(0,0,0,0.55)',
          paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4,
        }}>
          <Text style={{
            color: '#FFFFFF', fontSize: 9, fontWeight: '800',
            fontFamily: 'Menlo',
          }}>{durationLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}
