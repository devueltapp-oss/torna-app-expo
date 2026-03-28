/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {PlayerRecentGameResponse} from '@/config/types';
import {normalizeApiResponse} from '@/utils';

export const getApiPlayerRecentGames = async (
  token: string,
  userId: string,
) => {
  // Validar que userId no sea undefined o vacío
  if (!userId || userId === 'undefined') {
    console.error('❌ Error: userId es inválido:', userId);
    throw new Error('User ID is required');
  }

  const APIURL = `${API_URL}/game/player/${userId}/history`;
  try {
    const res = await axios.get<{ data: PlayerRecentGameResponse[]; meta: any }>(APIURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    // Normalizar respuesta - el interceptor envuelve en data, y el backend también devuelve { data, meta }
    const normalizedData = normalizeApiResponse<{ data: PlayerRecentGameResponse[]; meta: any }>(res.data);
    
    // Si es un objeto con data y meta, extraer el array data
    if (normalizedData && typeof normalizedData === 'object' && 'data' in normalizedData && Array.isArray(normalizedData.data)) {
      return normalizedData.data;
    }
    
    // Si ya es un array, retornarlo directamente
    return Array.isArray(normalizedData) ? normalizedData : [];
  } catch (error: any) {
    console.log('Error fetching player recent games', JSON.stringify(error));
    crashlytics().recordError(error);
    throw error?.response?.status || error;
  }
};





