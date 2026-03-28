import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';

export interface B2FileItem {
  key: string;
  name: string;
  size: number;
  lastModified: string;
}

export interface B2FileInfo {
  key: string;
  duration: number;
}

export interface B2StreamUrl {
  key: string;
  url: string;
  expiresIn: number;
}

export const listB2FilesApi = async (
  token: string,
  prefix = '',
): Promise<B2FileItem[]> => {
  try {
    const res = await axios.get<B2FileItem[]>(`${API_URL}/files`, {
      headers: {Authorization: `Bearer ${token}`},
      params: prefix ? {prefix} : undefined,
    });
    return res.data;
  } catch (error: any) {
    crashlytics().recordError(error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        'Error listing B2 files',
    );
  }
};

export const getB2FileInfoApi = async (
  token: string,
  key: string,
): Promise<B2FileInfo> => {
  try {
    const res = await axios.get<B2FileInfo>(`${API_URL}/files/info`, {
      headers: {Authorization: `Bearer ${token}`},
      params: {key},
    });
    return res.data;
  } catch (error: any) {
    crashlytics().recordError(error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        'Error fetching file info',
    );
  }
};

export const getB2StreamUrlApi = async (
  token: string,
  key: string,
): Promise<B2StreamUrl> => {
  try {
    const res = await axios.get<B2StreamUrl>(`${API_URL}/files/stream`, {
      headers: {Authorization: `Bearer ${token}`},
      params: {key},
    });
    return res.data;
  } catch (error: any) {
    crashlytics().recordError(error);
    throw new Error(
      error?.response?.data?.message ||
        error?.message ||
        'Error fetching stream URL',
    );
  }
};
