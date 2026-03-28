import axios from 'axios';
import crashlytics from '@react-native-firebase/crashlytics';

import {API_URL} from '@/utils/constants';
import {RegisterGameResultResponse} from '@/config/types';
import {normalizeApiResponse} from '@/utils';

export const postRegisterResultApi = async (
  token: string,
  gameId: string,
  isWinner: boolean,
) => {
  const APIURL = `${API_URL}/game/${gameId}/register-result`;
  try {
    const res = await axios.post<RegisterGameResultResponse>(
      APIURL,
      {
        isWinner,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return normalizeApiResponse<RegisterGameResultResponse>(res.data);
  } catch (error: any) {
    console.log(JSON.stringify(error));
    crashlytics().recordError(error);
    
    // Extraer mensaje de error del backend si está disponible
    const errorMessage = error?.response?.data?.message || 
                        error?.response?.data?.error ||
                        error?.message ||
                        'Error al registrar el resultado. Por favor, intenta nuevamente.';
    
    // Crear un error con mensaje descriptivo
    const customError = new Error(errorMessage);
    (customError as any).status = error?.response?.status || 500;
    throw customError;
  }
};
