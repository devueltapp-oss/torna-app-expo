import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';

export interface TrimJobResponse {
  job_id: string;
  status: string;
  output_key: string;
  publicUrl?: string;
  check_status: string;
}

export interface JobStatus {
  job_id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | string;
  progress: number;
  output_key?: string;
  publicUrl?: string;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface StartTrimJobParams {
  sourceKey: string;
  startTime: number;
  endTime: number;
  outputKey?: string;
}

export const startTrimJobApi = async (
  token: string,
  params: StartTrimJobParams,
): Promise<TrimJobResponse> => {
  const url = `${API_URL}/pipeline/trim`;
  try {
    const res = await axios.post<TrimJobResponse>(
      url,
      {
        sourceKey: params.sourceKey,
        startTime: Math.floor(params.startTime),
        endTime: Math.floor(params.endTime),
        ...(params.outputKey ? {outputKey: params.outputKey} : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return res.data;
  } catch (error: any) {
    crashlytics().recordError(error);

    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Error al iniciar el trabajo de recorte.';

    const customError = new Error(errorMessage);
    (customError as any).status = error?.response?.status || 500;
    throw customError;
  }
};

export const getJobStatusApi = async (
  token: string,
  jobId: string,
): Promise<JobStatus> => {
  const url = `${API_URL}/pipeline/status/${jobId}`;
  try {
    const res = await axios.get<JobStatus>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res.data;
  } catch (error: any) {
    crashlytics().recordError(error);

    const errorMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Error al consultar el estado del trabajo.';

    const customError = new Error(errorMessage);
    (customError as any).status = error?.response?.status || 500;
    throw customError;
  }
};
