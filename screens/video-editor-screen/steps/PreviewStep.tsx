import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { Button } from '../../../components/ui';
import { Player } from '../components/Player';

export interface PreviewStepProps {
  gameId: string;
  recordingUrl: string;
  durationSeconds: number;
  courtLabel: string;
  clubName: string;
  cameraLabel?: string;
  onContinue: () => void;
}

export function PreviewStep({
  gameId, recordingUrl, durationSeconds, courtLabel, clubName, cameraLabel, onContinue,
}: PreviewStepProps) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, gap: 14 }}>
      <View>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted2, letterSpacing: 1.2 }}>PASO 1 DE 4</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: 4 }}>
          Mirá el partido
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted2, marginTop: 2 }}>
          Encontrá el momento que querés transformar en highlight. Después lo vamos a recortar.
        </Text>
      </View>

      <Player
        recordingUrl={recordingUrl}
        durationSeconds={durationSeconds}
        label={cameraLabel}
        autoPlay
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted2, fontFamily: 'Menlo' }}>
          {gameId}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted2 }}>·</Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
          {courtLabel} · {clubName}
        </Text>
      </View>

      <Button fullWidth size="lg" onPress={onContinue}>Recortar un momento →</Button>
    </View>
  );
}
