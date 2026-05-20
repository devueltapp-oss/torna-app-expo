import React from 'react';
import { View, Text, ActivityIndicator, Animated, Easing } from 'react-native';
import { useTheme } from '../../../theme';
import { Button } from '../../../components/ui';
import type { JobStatusName } from '../../../api/video';

export interface ProcessingStepProps {
  status: JobStatusName;
  progress: number;
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
}

export function ProcessingStep({ status, progress, error, onRetry, onCancel }: ProcessingStepProps) {
  const { colors } = useTheme();

  // Reanimated NO está en el bundle (regla de no agregar deps). Usamos
  // Animated.Value (core RN) — mismo efecto visual para la barra de progreso.
  const widthAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress, duration: 320, easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={{ paddingHorizontal: 16, gap: 16 }}>
      <View>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted2, letterSpacing: 1.2 }}>PASO 4 DE 4</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: 4 }}>
          {error ? 'Algo salió mal' : 'Generando tu clip...'}
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted2, marginTop: 2 }}>
          {error ? 'No pudimos procesar el corte. Intentá de nuevo.' : 'Esto puede tardar unos segundos. No cierres la app.'}
        </Text>
      </View>

      <View style={{
        aspectRatio: 16 / 9, borderRadius: 18,
        backgroundColor: colors.ink2, borderWidth: 1, borderColor: colors.line,
        alignItems: 'center', justifyContent: 'center', gap: 18,
      }}>
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: error ? 'rgba(255,255,255,0.12)' : colors.accent,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {error
            ? <Text style={{ color: '#FFFFFF', fontSize: 28, fontWeight: '800' }}>!</Text>
            : <ActivityIndicator size="large" color={colors.ink}/>}
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Menlo' }}>
          {error ? 'FAILED' : `${status} · ${Math.round(progress)}%`}
        </Text>
      </View>

      {!error ? (
        <View>
          <View style={{ height: 8, backgroundColor: colors.bg2, borderRadius: 4, overflow: 'hidden' }}>
            <Animated.View style={{
              width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              height: '100%', backgroundColor: colors.accent,
            }}/>
          </View>
          <Text style={{ marginTop: 6, fontSize: 11, color: colors.muted2, fontFamily: 'Menlo' }}>
            JOB {status}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button variant="soft" size="lg" onPress={onCancel}>Cancelar</Button>
          <View style={{ flex: 1 }}>
            <Button fullWidth size="lg" onPress={onRetry}>Reintentar</Button>
          </View>
        </View>
      )}
    </View>
  );
}
