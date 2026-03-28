/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

import {API_URL} from '@/utils/constants';
import {UserResponse} from '@/config/types';

interface SignupBody {
  username: string;
  name: string;
}

export const SignupPost = async (
  body: SignupBody,
  accessToken: string,
): Promise<UserResponse> => {
  try {
    console.log('Intentando registrar usuario en:', `${API_URL}/user/sign-up`);
    console.log('Body:', body);
    console.log('Token:', accessToken ? 'Presente' : 'Ausente');
    
    const res = await axios.post<UserResponse>(
      `${API_URL}/user/sign-up`,
      body,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 segundos de timeout
      },
    );
    return res.data;
  } catch (error: any) {
    console.log('Error en SignupPost:', error);
    if (error.code === 'ECONNABORTED') {
      throw new Error('Timeout: La solicitud tardó demasiado');
    } else if (error.response) {
      // El servidor respondió con un código de error
      throw new Error(`Error del servidor: ${error.response.status} - ${error.response.data?.message || 'Error desconocido'}`);
    } else if (error.request) {
      // La solicitud se hizo pero no se recibió respuesta
      throw new Error('Error de red: No se pudo conectar con el servidor');
    } else {
      console.log('Error en SignupPost:', error);
      // Algo más pasó
      throw new Error(`Error: ${error.message}`);
    }
  }
};
