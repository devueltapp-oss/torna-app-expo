/**
 * VideoEditorScreen — 5-step flow para crear un highlight a partir de la
 * grabación de un partido. Compone los componentes Player + TrimRangeSlider
 * y orquesta el procesamiento real vía `useVideoEditorFlow` (FFmpeg on-device
 * → upload a B2 con presigned URL → POST /highlights).
 *
 * Route params:  { gameId, recordingUrl, durationSeconds }
 *
 * Notas de adaptación al stack actual (vs el spec original):
 *   - Sin expo-video → Player adaptador con la misma API (PlayerHandle).
 *   - Sin unistyles → StyleSheet inline + useTheme.
 *   - Sin gluestack → Button/Input/Switch de components/ui.
 *   - Sin formik/yup → validación inline.
 *   - Sin expo-haptics → no incluido (no es dep del proyecto).
 *   - Sin reanimated → Animated core para la progress bar.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme';

import { useVideoEditorFlow, type EditorStep } from './hooks/useVideoEditorFlow';
import { PreviewStep } from './steps/PreviewStep';
import { TrimStep } from './steps/TrimStep';
import { MetadataStep } from './steps/MetadataStep';
import { ProcessingStep } from './steps/ProcessingStep';
import { ResultStep } from './steps/ResultStep';

export interface VideoEditorScreenProps {
  gameId: string;
  recordingUrl: string;
  durationSeconds: number;
  courtLabel?: string;
  clubName?: string;
  cameraLabel?: string;
  onBack?: () => void;
  onDone?: (result: { streamUrl: string; durationSeconds: number; title: string; visibility: 'public' | 'private' }) => void;
}

const STEP_ORDER: EditorStep[] = ['preview', 'trim', 'metadata', 'processing', 'result'];

export function VideoEditorScreen({
  gameId, recordingUrl, durationSeconds,
  courtLabel = 'Cancha 3', clubName = 'Club Pádel BSAS', cameraLabel = 'CAM 02 · Lateral',
  onBack, onDone,
}: VideoEditorScreenProps) {
  const { colors } = useTheme();
  const flow = useVideoEditorFlow({ gameId, recordingUrl, durationSeconds });

  // Cancel está oculto durante "processing" salvo que el job haya FALLADO.
  const canCancel = flow.step !== 'processing' || !!flow.jobError;

  function handleBack() {
    switch (flow.step) {
      case 'preview':    onBack?.(); break;
      case 'trim':       flow.setStep('preview'); break;
      case 'metadata':   flow.setStep('trim'); break;
      case 'processing': flow.cancelProcessing(); break;
      case 'result':     onBack?.(); break;
    }
  }

  const stepIdx = STEP_ORDER.indexOf(flow.step);

  // El paso de trim toma toda la pantalla: video + overlay controls.
  // No puede estar dentro del SafeAreaView/ScrollView del editor.
  if (flow.step === 'trim') {
    return (
      <TrimStep
        recordingUrl={recordingUrl}
        durationSeconds={flow.effectiveDuration}
        range={flow.range}
        onChangeRange={flow.setRange}
        onLoad={flow.onVideoLoaded}
        onBack={() => flow.setStep('preview')}
        onContinue={() => flow.setStep('metadata')}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header con stepper dots */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 12,
      }}>
        <Pressable
          onPress={canCancel ? handleBack : undefined}
          disabled={!canCancel}
          style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: colors.bg2,
            alignItems: 'center', justifyContent: 'center',
            opacity: canCancel ? 1 : 0.4,
          }}>
          <ChevronLeft size={20} color={colors.text}/>
        </Pressable>

        <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted2, letterSpacing: 1.4 }}>
            EDITAR HIGHLIGHT
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {STEP_ORDER.map((s, i) => (
              <View key={s} style={{
                width: i === stepIdx ? 22 : 6, height: 6, borderRadius: 3,
                backgroundColor: i <= stepIdx ? colors.accent : colors.lineStrong,
              }}/>
            ))}
          </View>
        </View>

        <View style={{ width: 36 }}/>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {flow.step === 'preview' && (
          <PreviewStep
            gameId={gameId}
            recordingUrl={recordingUrl}
            durationSeconds={flow.effectiveDuration}
            courtLabel={courtLabel}
            clubName={clubName}
            cameraLabel={cameraLabel}
            onLoad={flow.onVideoLoaded}
            onContinue={() => flow.setStep('trim')}
          />
        )}
        {flow.step === 'metadata' && (
          <MetadataStep
            range={flow.range}
            title={flow.title}
            onChangeTitle={flow.setTitle}
            visibility={flow.visibility}
            onChangeVisibility={flow.setVisibility}
            onBack={() => flow.setStep('trim')}
            onGenerate={flow.generate}
          />
        )}
        {flow.step === 'processing' && (
          <ProcessingStep
            status={flow.jobStatus}
            progress={flow.jobProgress}
            error={flow.jobError}
            onRetry={flow.generate}
            onCancel={flow.cancelProcessing}
          />
        )}
        {flow.step === 'result' && (
          <ResultStep
            range={flow.range}
            title={flow.title}
            resultUrl={flow.resultUrl}
            visibility={flow.visibility}
            onShare={() => { /* TODO: integrar share del sistema */ }}
            onDone={() => onDone?.({
              streamUrl: flow.resultUrl ?? '',
              durationSeconds: flow.range[1] - flow.range[0],
              title: flow.title,
              visibility: flow.visibility,
            })}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
