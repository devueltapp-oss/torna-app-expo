/**
 * Hook que encapsula el flujo del editor: estado de step, range, metadata,
 * procesamiento on-device con FFmpegKit y guardado del highlight.
 *
 *   - FFmpegKit recorta el video on-device (via highlightService)
 *   - highlightService sube el clip a B2 via presigned URL del backend
 *   - el hook llama POST /highlights con la streamUrl resultante
 *   - sin polling, sin BullMQ, sin Redis
 */
import React from 'react';
import * as SecureStore from 'expo-secure-store';
import { TRIM_MIN_SEC } from '../components/TrimRangeSlider';
import type { Visibility } from '../steps/MetadataStep';

export type EditorStep = 'preview' | 'trim' | 'metadata' | 'processing' | 'result';
export type { Visibility } from '../steps/MetadataStep';

/** Estado del procesamiento on-device del highlight (FFmpeg → upload → POST /highlights). */
export type JobStatusName = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface UseVideoEditorFlowParams {
  gameId: string;
  recordingUrl: string;
  durationSeconds: number;
}

export function useVideoEditorFlow(params: UseVideoEditorFlowParams) {
  const { gameId, recordingUrl, durationSeconds } = params;

  const [step, setStep] = React.useState<EditorStep>('preview');

  const [range, setRange] = React.useState<[number, number]>([
    Math.max(0, Math.floor(durationSeconds / 2) - 6),
    Math.max(TRIM_MIN_SEC + 1, Math.floor(durationSeconds / 2) + 6),
  ]);

  const [title, setTitle] = React.useState('');
  const [visibility, setVisibility] = React.useState<Visibility>('private');

  // Job state
  const [jobStatus, setJobStatus] = React.useState<JobStatusName>('PENDING');
  const [jobProgress, setJobProgress] = React.useState(0);
  const [jobError, setJobError] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);

  const generate = React.useCallback(async () => {
    setJobError(null);
    setJobProgress(0);
    setJobStatus('PENDING');
    setStep('processing');

    try {
      const { createHighlight, isHighlightSupported } = await import('../../../services/highlightService');

      if (!isHighlightSupported()) {
        setJobError('La creación de highlights requiere la build nativa (EAS). No disponible en Expo Go.');
        setJobStatus('FAILED');
        return;
      }

      setJobStatus('RUNNING');
      const result = await createHighlight({
        videoUrl: recordingUrl,
        startSec: range[0],
        endSec: range[1],
        title: title.trim() || 'Highlight',
        onProgress: (pct) => setJobProgress(pct),
      });

      // Guardar metadata en el backend
      const token = await SecureStore.getItemAsync('torna_auth_token');
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
      await fetch(`${apiUrl}/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gameId,
          clipUrl: result.streamUrl,
          // CreateHighlightDto exige enteros (@IsInt); el slider puede dar decimales.
          start: Math.floor(range[0]),
          end: Math.ceil(range[1]),
          duration: result.durationSeconds,
          title: result.title,
          // Visibilidad elegida en MetadataStep → backend la guarda en isEnabled.
          isPublic: visibility === 'public',
        }),
      });

      setResultUrl(result.streamUrl);
      setJobProgress(100);
      setJobStatus('COMPLETED');
      setTimeout(() => setStep('result'), 400);

    } catch (err: unknown) {
      setJobError(err instanceof Error ? err.message : 'No pudimos crear el highlight.');
      setJobStatus('FAILED');
    }
  }, [gameId, recordingUrl, range, title, visibility]);

  const cancelProcessing = React.useCallback(() => {
    setJobError(null);
    setStep('metadata');
  }, []);

  return {
    step, setStep,
    range, setRange,
    title, setTitle,
    visibility, setVisibility,
    jobStatus, jobProgress, jobError, resultUrl,
    generate, cancelProcessing,
  };
}

export type VideoEditorFlow = ReturnType<typeof useVideoEditorFlow>;
