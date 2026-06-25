/**
 * Hook que encapsula el flujo del editor: estado de step, range, metadata,
 * procesamiento del highlight y guardado.
 *
 * El recorte se hace SERVER-SIDE: la app llama POST /highlights/from-recording
 * con { gameId, start, end, title, isPublic } y el backend recorta la grabación
 * (FFmpeg byte-range), sube el clip a B2 y crea el highlight. Antes esto se hacía
 * on-device con ffmpeg-kit-react-native, que crasheaba la app.
 */
import React from 'react';
import { createHighlightFromRecording } from '../../../api/highlights';
import { TRIM_MIN_SEC } from '../components/TrimRangeSlider';
import type { Visibility } from '../steps/MetadataStep';

export type EditorStep = 'preview' | 'trim' | 'metadata' | 'processing' | 'result';
export type { Visibility } from '../steps/MetadataStep';

/** Estado del procesamiento del highlight (recorte server-side → B2 → highlight). */
export type JobStatusName = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface UseVideoEditorFlowParams {
  gameId: string;
  recordingUrl: string;
  durationSeconds: number;
}

export function useVideoEditorFlow(params: UseVideoEditorFlowParams) {
  // `recordingUrl` se reproduce en los steps (no acá): el recorte es server-side
  // y el backend resuelve la grabación a partir de `gameId`.
  const { gameId, durationSeconds } = params;

  const [step, setStep] = React.useState<EditorStep>('preview');

  /** Centra una selección por defecto dentro de una duración dada. */
  const defaultRange = React.useCallback((d: number): [number, number] => {
    const mid = Math.floor(d / 2);
    const start = Math.max(0, mid - 6);
    const end = Math.min(Math.max(d, TRIM_MIN_SEC + 1), Math.max(start + TRIM_MIN_SEC + 1, mid + 6));
    return [start, end];
  }, []);

  // Duración efectiva: arranca con la del backend, pero se corrige con la
  // duración real del video cuando el Player la reporta (onVideoLoaded).
  const [effectiveDuration, setEffectiveDuration] = React.useState(durationSeconds);
  const [range, setRangeState] = React.useState<[number, number]>(() => defaultRange(durationSeconds));

  // Marca que el usuario ya tocó el rango: a partir de ahí no lo re-centramos solos.
  const rangeTouchedRef = React.useRef(false);
  const setRange = React.useCallback((r: [number, number]) => {
    rangeTouchedRef.current = true;
    setRangeState(r);
  }, []);

  // El video reportó su duración real → corregimos la duración del backend
  // (que puede venir absurda o en 0) y re-centramos el rango si el usuario aún
  // no lo tocó.
  const onVideoLoaded = React.useCallback((realDuration: number) => {
    if (!Number.isFinite(realDuration) || realDuration <= 0) return;
    setEffectiveDuration((prev) => {
      if (Math.abs(prev - realDuration) < 0.5) return prev;
      if (!rangeTouchedRef.current) setRangeState(defaultRange(realDuration));
      return realDuration;
    });
  }, [defaultRange]);

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
      // Clampeamos el rango a la duración real del video y a enteros: el backend
      // exige @IsInt y un rango válido (evita que FFmpeg busque más allá del EOF).
      const maxDur = effectiveDuration > 0 ? effectiveDuration : range[1];
      const startSec = Math.max(0, Math.floor(Math.min(range[0], maxDur - TRIM_MIN_SEC)));
      const endSec = Math.ceil(Math.min(maxDur, Math.max(range[1], startSec + TRIM_MIN_SEC)));

      setJobStatus('RUNNING');

      // Recorte + subida + creación del highlight, todo server-side.
      const result = await createHighlightFromRecording({
        gameId,
        start: startSec,
        end: endSec,
        title: title.trim() || 'Highlight',
        isPublic: visibility === 'public',
      });

      setResultUrl(result.clipUrl);
      setJobProgress(100);
      setJobStatus('COMPLETED');
      setTimeout(() => setStep('result'), 400);

    } catch (err: unknown) {
      setJobError(err instanceof Error ? err.message : 'No pudimos crear el highlight.');
      setJobStatus('FAILED');
    }
  }, [gameId, range, title, visibility, effectiveDuration]);

  const cancelProcessing = React.useCallback(() => {
    setJobError(null);
    setStep('metadata');
  }, []);

  return {
    step, setStep,
    range, setRange,
    effectiveDuration, onVideoLoaded,
    title, setTitle,
    visibility, setVisibility,
    jobStatus, jobProgress, jobError, resultUrl,
    generate, cancelProcessing,
  };
}

export type VideoEditorFlow = ReturnType<typeof useVideoEditorFlow>;
