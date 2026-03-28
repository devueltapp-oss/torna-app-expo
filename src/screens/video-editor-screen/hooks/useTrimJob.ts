import {useState, useEffect, useRef, useCallback} from 'react';

import {useAuth} from '@/contexts/authContext';
import {
  startTrimJobApi,
  getJobStatusApi,
  JobStatus,
  TrimJobResponse,
} from '@/api/video/PipelineApi';

export type TrimJobState =
  | {phase: 'idle'}
  | {phase: 'starting'}
  | {phase: 'polling'; job: JobStatus}
  | {phase: 'completed'; publicUrl: string}
  | {phase: 'failed'; error: string};

export interface UseTrimJobReturn {
  state: TrimJobState;
  startTrim: (
    sourceKey: string,
    startTime: number,
    endTime: number,
  ) => Promise<void>;
  reset: () => void;
}

export const useTrimJob = (): UseTrimJobReturn => {
  const {getAccessToken} = useAuth();
  const [state, setState] = useState<TrimJobState>({phase: 'idle'});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const jobId = state.phase === 'polling' ? (state as any).job?.job_id : null;

  useEffect(() => {
    if (state.phase !== 'polling') {
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const token = await getAccessToken();
        const status = await getJobStatusApi(token, jobId);

        if (status.status === 'COMPLETED') {
          clearPoll();
          setState({phase: 'completed', publicUrl: status.publicUrl ?? ''});
        } else if (status.status === 'FAILED') {
          clearPoll();
          setState({phase: 'failed', error: status.error ?? 'Unknown error'});
        } else {
          setState({phase: 'polling', job: status});
        }
      } catch {
        // Silently ignore transient polling errors
      }
    }, 2500);

    return clearPoll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const startTrim = useCallback(
    async (sourceKey: string, startTime: number, endTime: number) => {
      setState({phase: 'starting'});
      try {
        const token = await getAccessToken();
        const response: TrimJobResponse = await startTrimJobApi(token, {
          sourceKey,
          startTime,
          endTime,
        });
        setState({
          phase: 'polling',
          job: {
            job_id: response.job_id,
            status: response.status,
            progress: 0,
            publicUrl: response.publicUrl,
          },
        });
      } catch (error: any) {
        setState({
          phase: 'failed',
          error: error?.message ?? 'Failed to start trim',
        });
      }
    },
    [getAccessToken],
  );

  const reset = useCallback(() => {
    clearPoll();
    setState({phase: 'idle'});
  }, [clearPoll]);

  return {state, startTrim, reset};
};
