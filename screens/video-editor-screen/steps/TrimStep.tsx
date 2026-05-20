import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { Button } from '../../../components/ui';
import { Player, type PlayerHandle } from '../components/Player';
import {
  TrimRangeSlider, TRIM_MIN_SEC, TRIM_MAX_SEC,
} from '../components/TrimRangeSlider';

function fmt(s: number) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export interface TrimStepProps {
  recordingUrl: string;
  durationSeconds: number;
  range: [number, number];
  onChangeRange: (r: [number, number]) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function TrimStep({
  recordingUrl, durationSeconds, range, onChangeRange, onBack, onContinue,
}: TrimStepProps) {
  const { colors } = useTheme();
  const playerRef = React.useRef<PlayerHandle | null>(null);

  // Cuando el usuario arrastra los handles, salteamos el preview al inicio
  // del corte para que vea el cut-in en vivo (regla del prompt).
  React.useEffect(() => {
    playerRef.current?.seek(range[0]);
  }, [range[0]]);

  const sel = range[1] - range[0];
  const invalid = sel < TRIM_MIN_SEC || sel > TRIM_MAX_SEC;

  return (
    <View style={{ paddingHorizontal: 16, gap: 14 }}>
      <View>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted2, letterSpacing: 1.2 }}>PASO 2 DE 4</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: 4 }}>
          Elegí el recorte
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted2, marginTop: 2 }}>
          Arrastrá los bordes para definir el inicio y el fin del clip.
        </Text>
      </View>

      <Player
        ref={playerRef}
        recordingUrl={recordingUrl}
        durationSeconds={durationSeconds}
        startAt={range[0]}
        endAt={range[1]}
        label={`PREVIEW · ${fmt(sel)}`}
      />

      <TrimRangeSlider duration={durationSeconds} value={range} onChange={onChangeRange}/>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="soft" size="lg" onPress={onBack}>Volver</Button>
        <View style={{ flex: 1 }}>
          <Button
            fullWidth size="lg"
            variant={invalid ? 'disabled' : 'primary'}
            onPress={invalid ? undefined : onContinue}>
            Continuar →
          </Button>
        </View>
      </View>
    </View>
  );
}
