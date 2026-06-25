import React from 'react';
import { View, Text, ActivityIndicator, Animated, Easing } from 'react-native';
import { useTheme } from '../../../theme';
import { Button } from '../../../components/ui';
import type { JobStatusName } from '../hooks/useVideoEditorFlow';

export interface ProcessingStepProps {
  status: JobStatusName;
  progress: number;
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
}

export function ProcessingStep({ status, error, onRetry, onCancel }: ProcessingStepProps) {
  const { colors } = useTheme();

  // El recorte es server-side y síncrono: no hay porcentaje real. Mostramos una
  // barra indeterminada (un segmento que recorre el track en loop) mientras corre.
  // Reanimated NO está en el bundle (regla de no agregar deps) → Animated core RN.
  const loopAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(loopAnim, {
        toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [loopAnim]);

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
        {error ? (
          <Text style={{ fontSize: 12, color: colors.danger, marginTop: 8, fontFamily: 'Menlo' }}>
            {error}
          </Text>
        ) : null}
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
          {error ? 'FAILED' : 'Procesando en el servidor…'}
        </Text>
      </View>

      {!error ? (
        <View>
          <View style={{ height: 8, backgroundColor: colors.bg2, borderRadius: 4, overflow: 'hidden' }}>
            <Animated.View style={{
              position: 'absolute', top: 0, bottom: 0, width: '40%',
              backgroundColor: colors.accent, borderRadius: 4,
              left: loopAnim.interpolate({ inputRange: [0, 1], outputRange: ['-40%', '100%'] }),
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
