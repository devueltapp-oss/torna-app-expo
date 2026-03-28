import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';

export function createAxiosInstance(token: string) {
  // Log para verificar la URL base (solo en desarrollo)
  if (__DEV__) {
    console.log('🔧 [AXIOS] Creando instancia con baseURL:', API_URL);
  }

  const api = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Interceptor para loggear todas las peticiones
  api.interceptors.request.use(
    config => {
      console.log('🌐 [REQUEST]', config.method?.toUpperCase(), config.url);
      console.log('📍 [FULL URL]', `${config.baseURL}${config.url}`);
      if (config.params) {
        console.log('📋 [PARAMS]', JSON.stringify(config.params, null, 2));
      }
      if (config.data) {
        console.log('📦 [DATA]', JSON.stringify(config.data, null, 2));
      }
      if (config.headers) {
        console.log('🔑 [HEADERS]', {
          Authorization: config.headers.Authorization ? 'Bearer ***' : 'No auth',
          ...config.headers,
        });
      }
      return config;
    },
    error => {
      console.error('❌ [REQUEST ERROR]', error);
      return Promise.reject(error);
    },
  );

  // Interceptor para loggear todas las respuestas
  api.interceptors.response.use(
    res => {
      console.log('✅ [RESPONSE]', res.config.method?.toUpperCase(), res.config.url);
      console.log('📊 [STATUS]', res.status, res.statusText);
      console.log('📥 [RESPONSE DATA]', JSON.stringify(res.data, null, 2));
      return res;
    },
    error => {
      console.log('------ ERROR: ------');
      console.log('❌ [ERROR]', error.config?.method?.toUpperCase(), error.config?.url);
      console.log('📊 [STATUS]', error.response?.status, error.response?.statusText);
      console.log('📥 [ERROR DATA]', JSON.stringify(error.response?.data, null, 2));
      console.log(JSON.stringify(error));
      console.log('--------------------');
      crashlytics().recordError(error);
      throw error;
    },
  );

  return api;
}
