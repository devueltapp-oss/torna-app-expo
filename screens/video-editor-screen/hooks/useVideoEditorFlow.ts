/**
 * Hook que encapsula el flujo del editor: estado de step, range, metadata,
 * polling del job (PENDING → RUNNING → COMPLETED|FAILED) y guardado del
 * highlight. Sigue lo pedido por el prompt:
 *
 *   - polling con useRef + clearInterval en unmount (no memory leak)
 *   - polling NO bloquea el UI thread
 *   - manejo de error (banner + retry) cuando el job devuelve FAILED
 */
import React from 'react';
import {
  startTrimJobApi, getJobStatusApi,
  type JobStatus, type JobStatusName,
} from '../../../api/video';
import { createHighlightApi, type HighlightRecord } from '../../../api/highlights';
import { TRIM_MIN_SEC } from '../components/TrimRangeSlider';
import type { Visibility } from '../steps/MetadataStep';

export type EditorStep = 'preview' | 'trim' | 'metadata' | 'processing' | 'result';
export type { Visibility } from '../steps/MetadataStep';

const POLL_INTERVAL_MS = 2500;

export interface UseVideoEditorFlowParams {
  gameId: string;
  recordingUrl: string;
  durationSeconds: number;
  /** mock auth — en prod viene de `useAuth().accessToken` */
  token?: string;
}

export function useVideoEditorFlow(params: UseVideoEditorFlowParams) {
  const { gameId, recordingUrl, durationSeconds, token = 'mock-token' } = params;

  const [step, setStep] = React.useState<EditorStep>('preview');

  const [range, setRange] = React.useState<[number, number]>([
    Math.max(0, Math.floor(durationSeconds / 2) - 6),
    Math.max(TRIM_MIN_SEC + 1, Math.floor(durationSeconds / 2) + 6),
  ]);

  const [title, setTitle] = React.useState('');
  const [visibility, setVisibility] = React.useState<Visibility>('private');

  // Job polling
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [jobStatus, setJobStatus] = React.useState<JobStatusName>('PENDING');
  const [jobProgress, setJobProgress] = React.useState(0);
  const [jobError, setJobError] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Highlight save
  const [savedHighlight, setSavedHighlight] = React.useState<HighlightRecord | null>(null);

  const clearPoll = React.useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  React.useEffect(() => () => clearPoll(), [clearPoll]);

  const generate = React.useCallback(async () => {
    setJobError(null);
    setJobProgress(0);
    setJobStatus('PENDING');
    setStep('processing');

    // ── Rama de producción: FFmpegKit + B2 (solo en builds compiladas) ──
    if (!__DEV__) {
      try {
        // Importación dinámica: highlightService nunca se evalúa en dev,
        // por lo que no hay errores de módulo nativo en Expo Go.
        const { createHighlight, isHighlightSupported } = await import('../../../services/highlightService');

        if (!isHighlightSupported()) {
          setJobError('El dispositivo no soporta creación de highlights en este build.');
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

        setResultUrl(result.streamUrl);
        setJobProgress(100);
        setJobStatus('COMPLETED');
        setTimeout(() => setStep('result'), 400);
      } catch (err: any) {
        setJobError('No pudimos crear el highlight. Intentá de nuevo.');
        setJobStatus('FAILED');
      }
      return;
    }

    // ── Rama de desarrollo: mock API (flujo simulado con progreso fake) ──
    try {
      const resp = await startTrimJobApi(token, {
        sourceKey: `${gameId}::${recordingUrl}`,
        startTime: range[0],
        endTime: range[1],
      });
      setJobId(resp.job_id);

      clearPoll();
      pollRef.current = setInterval(async () => {
        try {
          const status: JobStatus = await getJobStatusApi(token, resp.job_id);
          setJobStatus(status.status);
          setJobProgress(status.progress);

          if (status.status === 'COMPLETED') {
            clearPoll();
            if (status.publicUrl) setResultUrl(status.publicUrl);
            try {
              const rec = await createHighlightApi(token, {
                gameId, recordingUrl: status.publicUrl || recordingUrl,
                start: range[0], end: range[1],
                title: title.trim() || undefined,
              });
              setSavedHighlight(rec);
            } catch { /* silently ignore */ }
            setTimeout(() => setStep('result'), 400);
          } else if (status.status === 'FAILED') {
            clearPoll();
            setJobError('No pudimos procesar el clip. Intentá de nuevo.');
          }
        } catch (err) {
          clearPoll();
          setJobError('Error consultando el estado del job.');
        }
      }, POLL_INTERVAL_MS);
    } catch {
      setJobError('No pudimos iniciar el procesamiento.');
    }
  }, [token, gameId, recordingUrl, range, title, clearPoll]);

  const cancelProcessing = React.useCallback(() => {
    clearPoll();
    setJobError(null);
    setStep('metadata');
  }, [clearPoll]);

  return {
    step, setStep,
    range, setRange,
    title, setTitle,
    visibility, setVisibility,
    jobId, jobStatus, jobProgress, jobError, resultUrl,
    generate, cancelProcessing,
    savedHighlight,
  };
}

export type VideoEditorFlow = ReturnType<typeof useVideoEditorFlow>;
