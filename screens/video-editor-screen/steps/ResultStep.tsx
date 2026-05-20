import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { Button } from '../../../components/ui';
import { Player } from '../components/Player';
import type { Visibility } from './MetadataStep';

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export interface ResultStepProps {
  range: [number, number];
  title: string;
  resultUrl: string | null;
  visibility: Visibility;
  onShare: () => void;
  onDone: () => void;
}

/**
 * Step final — el clip ya fue procesado. Confirma la visibilidad que
 * eligió el usuario en el step anterior. Para flipear privado↔público
 * después, el user lo hace desde "Mi biblioteca" (chip por item).
 */
export function ResultStep({ range, title, resultUrl, visibility, onShare, onDone }: ResultStepProps) {
  const { colors } = useTheme();
  const dur = range[1] - range[0];
  const isPublic = visibility === 'public';

  return (
    <View style={{ paddingHorizontal: 16, gap: 14 }}>
      <View>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted2, letterSpacing: 1.2 }}>LISTO</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: 4 }}>
          Tu clip está listo
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted2, marginTop: 2 }}>
          {title || 'Sin título'} · {fmt(dur)}
        </Text>
      </View>

      <Player
        recordingUrl={resultUrl || ''}
        durationSeconds={dur}
        label={`CLIP · ${fmt(dur)}`}
      />

      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.accentSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
      }}>
        <View style={{
          width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>✓</Text>
        </View>
        <Text style={{ flex: 1, fontSize: 12, color: colors.accentText, fontWeight: '700', lineHeight: 16 }}>
          {isPublic
            ? 'Publicado en tu feed. Ya pueden verlo quienes te siguen.'
            : 'Guardado en tu biblioteca privada. Solo vos podés verlo.'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="soft" size="lg" onPress={onShare}>Compartir</Button>
        <View style={{ flex: 1 }}>
          <Button fullWidth size="lg" onPress={onDone}>Listo</Button>
        </View>
      </View>

      {__DEV__ && (
        <Text style={{ fontSize: 10, color: colors.muted2, textAlign: 'center', marginTop: 4 }}>
          URL simulada · el clip real requiere build compilada (EAS)
        </Text>
      )}
    </View>
  );
}
