/**
 * Mock video pipeline API. Replaces the real `PostCreateClipApi.ts` /
 * `PipelineApi.ts` from the production codebase so the screen can be wired
 * up before the backend lands. Same shape as the prompt spec:
 *
 *   startTrimJobApi(token, { sourceKey, startTime, endTime }) → TrimJobResponse
 *   getJobStatusApi(token, jobId)                              → JobStatus
 *   postCreateClipApi(token, recordingUrl, start, end, gameId) → TrimJobResponse
 *
 * The mock progresses a job from PENDING → RUNNING → COMPLETED across
 * roughly N polls (configured per job) and returns a fake `publicUrl`.
 * About 3% of jobs randomly fail so the FAILED banner is exercised.
 */

export type JobStatusName = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface TrimJobResponse {
  job_id: string;
  status: JobStatusName;
  output_key: string;
}

export interface JobStatus {
  status: JobStatusName;
  progress: number;          // 0–100
  publicUrl?: string;
}

interface JobInternal {
  id: string;
  startedAt: number;
  ticksToCompletion: number; // poll calls until COMPLETED
  willFail: boolean;
  outputKey: string;
  failed: boolean;
  inputUrl: string; // original recording URL — returned as publicUrl in dev (no real trim)
}

const JOBS = new Map<string, JobInternal>();

function makeId() {
  return 'job_' + Math.random().toString(36).slice(2, 10);
}

export async function startTrimJobApi(
  _token: string,
  { sourceKey, startTime, endTime }: { sourceKey: string; startTime: number; endTime: number },
): Promise<TrimJobResponse> {
  await new Promise(r => setTimeout(r, 220));
  const id = makeId();
  const outputKey = `clips/${sourceKey.replace(/[^a-z0-9]/gi, '_')}-${Math.round(startTime)}-${Math.round(endTime)}.mp4`;
  // Extract the recording URL from sourceKey (format: "<gameId>::<recordingUrl>")
  const inputUrl = sourceKey.split('::').slice(1).join('::');
  JOBS.set(id, {
    id,
    startedAt: Date.now(),
    ticksToCompletion: 4 + Math.floor(Math.random() * 3),
    willFail: Math.random() < 0.03,
    outputKey,
    failed: false,
    inputUrl,
  });
  return { job_id: id, status: 'PENDING', output_key: outputKey };
}

export async function getJobStatusApi(_token: string, jobId: string): Promise<JobStatus> {
  await new Promise(r => setTimeout(r, 120));
  const job = JOBS.get(jobId);
  if (!job) return { status: 'FAILED', progress: 0 };

  const elapsedTicks = Math.floor((Date.now() - job.startedAt) / 2400);
  const progress = Math.min(100, (elapsedTicks / job.ticksToCompletion) * 100);

  if (progress >= 100) {
    if (job.willFail && !job.failed) {
      job.failed = true;
      return { status: 'FAILED', progress: 100 };
    }
    return {
      status: 'COMPLETED',
      progress: 100,
      // In dev mode there's no real trim; return the original video so the result is playable.
      publicUrl: job.inputUrl || `https://cdn.torna.io/${job.outputKey}`,
    };
  }
  if (progress < 18) return { status: 'PENDING', progress };
  return { status: 'RUNNING', progress };
}

export async function postCreateClipApi(
  token: string,
  recordingUrl: string,
  start: number,
  end: number,
  gameId: string,
): Promise<TrimJobResponse> {
  return startTrimJobApi(token, {
    sourceKey: `${gameId}::${recordingUrl}`,
    startTime: start,
    endTime: end,
  });
}
